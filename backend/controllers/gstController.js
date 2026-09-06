const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");

// Helper to resolve period filters into date query
const getDateQuery = (period, startDate, endDate) => {
  const now = new Date();
  // Indian Standard Time (IST) offset: +5:30 = +330 minutes = 19,800,000 ms
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  let start = null;
  let end = null;

  if (period === "daily") {
    const istNow = new Date(now.getTime() + IST_OFFSET_MS);
    const y = istNow.getUTCFullYear();
    const m = istNow.getUTCMonth();
    const d = istNow.getUTCDate();

    start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS);
    end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS);
  } else if (period === "weekly") {
    const istNow = new Date(now.getTime() + IST_OFFSET_MS);
    const y = istNow.getUTCFullYear();
    const m = istNow.getUTCMonth();
    const d = istNow.getUTCDate();

    start = new Date(Date.UTC(y, m, d - 7, 0, 0, 0, 0) - IST_OFFSET_MS);
    end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS);
  } else if (period === "monthly") {
    const istNow = new Date(now.getTime() + IST_OFFSET_MS);
    const y = istNow.getUTCFullYear();
    const m = istNow.getUTCMonth();

    start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
    const lastDayOfMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    end = new Date(Date.UTC(y, m, lastDayOfMonth, 23, 59, 59, 999) - IST_OFFSET_MS);
  } else if (period === "yearly") {
    const istNow = new Date(now.getTime() + IST_OFFSET_MS);
    const y = istNow.getUTCFullYear();

    start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
    end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999) - IST_OFFSET_MS);
  } else if (startDate || endDate) {
    if (startDate) {
      const parts = startDate.split("-").map(Number);
      if (parts.length === 3) {
        start = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0) - IST_OFFSET_MS);
      } else {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }
    }
    if (endDate) {
      const parts = endDate.split("-").map(Number);
      if (parts.length === 3) {
        end = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999) - IST_OFFSET_MS);
      } else {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
    }
  }

  const query = {};
  if (start || end) {
    query.date = {};
    if (start) query.date.$gte = start;
    if (end) query.date.$lte = end;
  }
  return query;
};

// Helper to calculate payment method breakdown for a list of invoices
const calculatePaymentBreakdown = (invoices) => {
  const breakdown = {
    Cash: 0,
    UPI: 0,
    Card: 0,
    Cheque: 0,
    Credit: 0,
    Exchange: 0,
    Other: 0
  };

  invoices.forEach(inv => {
    const rev = inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total;
    const method = inv.paymentMethod || "Cash";

    if (method === "Cash") {
      breakdown.Cash += rev;
    } else if (method === "UPI") {
      breakdown.UPI += rev;
    } else if (method === "Card") {
      breakdown.Card += rev;
    } else if (method === "Cheque") {
      breakdown.Cheque += rev;
    } else if (method === "Exchange") {
      breakdown.Exchange += rev;
    } else if (method === "Split") {
      const cAmt = inv.cashAmount || 0;
      const uAmt = inv.upiAmount || 0;
      breakdown.Cash += cAmt;
      breakdown.UPI += uAmt;
      const splitSum = cAmt + uAmt;
      if (rev > splitSum) {
        breakdown.Other += (rev - splitSum);
      }
    } else if (method === "Credit") {
      const paidUpfront = Math.min(inv.amountPaid || 0, rev);
      const pendingCredit = Math.max(0, rev - paidUpfront);
      breakdown.Credit += pendingCredit;

      if (paidUpfront > 0) {
        const settleMethod = inv.settlementMethod || "Cash";
        if (settleMethod === "UPI") breakdown.UPI += paidUpfront;
        else if (settleMethod === "Card") breakdown.Card += paidUpfront;
        else if (settleMethod === "Cheque") breakdown.Cheque += paidUpfront;
        else breakdown.Cash += paidUpfront;
      }
    } else {
      breakdown.Other += rev;
    }
  });

  Object.keys(breakdown).forEach(key => {
    breakdown[key] = Math.round(breakdown[key] * 100) / 100;
  });

  return breakdown;
};

const getGstDashboard = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { period, startDate, endDate } = req.query;
    const dateQuery = getDateQuery(period, startDate, endDate);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Sales metrics (Invoices, excluding quotations & refunded status)
    const sales = await Invoice.find({
      isQuotation: { $ne: true },
      status: { $ne: "Refunded" }
    }).lean();

    const todayGstInvoices = sales.filter(inv => inv.date >= startOfToday && inv.date <= endOfToday && inv.isGstBilling !== false);
    const todayNonGstInvoices = sales.filter(inv => inv.date >= startOfToday && inv.date <= endOfToday && inv.isGstBilling === false);

    const todayGstSales = todayGstInvoices.reduce((sum, inv) => sum + (inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total), 0);
    const todayNonGstSales = todayNonGstInvoices.reduce((sum, inv) => sum + (inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total), 0);

    const monthlyGstInvoices = sales.filter(inv => inv.date >= startOfMonth && inv.isGstBilling !== false);
    const monthlyNonGstInvoices = sales.filter(inv => inv.date >= startOfMonth && inv.isGstBilling === false);

    const monthlyGstSales = monthlyGstInvoices.reduce((sum, inv) => sum + (inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total), 0);
    const monthlyNonGstSales = monthlyNonGstInvoices.reduce((sum, inv) => sum + (inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total), 0);

    // Payment breakdowns for today & monthly
    const todayGstPaymentBreakdown = calculatePaymentBreakdown(todayGstInvoices);
    const todayNonGstPaymentBreakdown = calculatePaymentBreakdown(todayNonGstInvoices);
    const todayPaymentBreakdown = calculatePaymentBreakdown([...todayGstInvoices, ...todayNonGstInvoices]);

    const monthlyGstPaymentBreakdown = calculatePaymentBreakdown(monthlyGstInvoices);
    const monthlyNonGstPaymentBreakdown = calculatePaymentBreakdown(monthlyNonGstInvoices);
    const monthlyPaymentBreakdown = calculatePaymentBreakdown([...monthlyGstInvoices, ...monthlyNonGstInvoices]);

    // Period / Custom Date Range Filtered Sales
    let filterStart = null;
    let filterEnd = null;
    if (dateQuery.date) {
      filterStart = dateQuery.date.$gte || null;
      filterEnd = dateQuery.date.$lte || null;
    }

    const filteredSales = sales.filter(inv => {
      if (filterStart && new Date(inv.date) < filterStart) return false;
      if (filterEnd && new Date(inv.date) > filterEnd) return false;
      return true;
    });

    const periodGstInvoices = filteredSales.filter(inv => inv.isGstBilling !== false);
    const periodNonGstInvoices = filteredSales.filter(inv => inv.isGstBilling === false);

    const periodGstSales = periodGstInvoices.reduce((sum, inv) => sum + (inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total), 0);
    const periodNonGstSales = periodNonGstInvoices.reduce((sum, inv) => sum + (inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total), 0);

    const periodGstPaymentBreakdown = calculatePaymentBreakdown(periodGstInvoices);
    const periodNonGstPaymentBreakdown = calculatePaymentBreakdown(periodNonGstInvoices);
    const periodPaymentBreakdown = calculatePaymentBreakdown(filteredSales);

    // 2. Purchases metrics
    const purchases = await Purchase.find({}).lean();

    const hasSupplierGstin = (p) => p.isGst !== false && Boolean(p.supplierGst && p.supplierGst.trim());

    const monthlyGstPurchases = purchases
      .filter(p => p.date >= startOfMonth && hasSupplierGstin(p))
      .reduce((sum, p) => sum + p.total, 0);

    const monthlyNonGstPurchases = purchases
      .filter(p => p.date >= startOfMonth && !hasSupplierGstin(p))
      .reduce((sum, p) => sum + p.total, 0);

    const filteredPurchases = purchases.filter(p => {
      if (filterStart && new Date(p.date) < filterStart) return false;
      if (filterEnd && new Date(p.date) > filterEnd) return false;
      return true;
    });

    const periodGstPurchases = filteredPurchases.filter(p => hasSupplierGstin(p)).reduce((sum, p) => sum + p.total, 0);
    const periodNonGstPurchases = filteredPurchases.filter(p => !hasSupplierGstin(p)).reduce((sum, p) => sum + p.total, 0);

    // Net Sales (Total Sales - Returns)
    const totalSales = sales.reduce((sum, inv) => sum + (inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total), 0);
    const totalReturns = sales
      .filter(inv => inv.isReturnExchange)
      .reduce((sum, inv) => {
        const retSum = inv.returnedItems?.reduce((s, item) => {
          const correspondingItem = inv.items?.find(oi => 
            (item.productId && oi.productId && oi.productId.toString() === item.productId.toString()) ||
            (!item.productId && oi.name === item.name)
          );
          if (correspondingItem && correspondingItem.excludeFromRevenue) {
            return s;
          }
          const itemTaxFactor = 1 + (item.gstRate || 0) / 100;
          return s + (item.price * item.qty) * itemTaxFactor;
        }, 0) || 0;
        return sum + retSum;
      }, 0);
    const netSales = totalSales - totalReturns;

    // Net Purchases
    const netPurchases = purchases.reduce((sum, p) => sum + p.total, 0);

    // GST Payable for current month = (Month's Sales GST Collected) - (Month's Purchase GST Paid)
    const monthlySalesGst = sales
      .filter(inv => inv.date >= startOfMonth && inv.isGstBilling !== false)
      .reduce((sum, inv) => sum + (inv.revenueGstAmount !== undefined ? inv.revenueGstAmount : inv.gstAmount), 0);

    const monthlyPurchasesGst = purchases
      .filter(p => p.date >= startOfMonth && p.isGst)
      .reduce((sum, p) => sum + p.gstAmount, 0);

    const gstPayable = monthlySalesGst - monthlyPurchasesGst;

    // Profit Calculations
    const taxableSalesSum = sales.reduce((sum, inv) => sum + (inv.revenueTaxableAmount !== undefined ? inv.revenueTaxableAmount : (inv.taxableAmount || (inv.subtotal - inv.discountAmount))), 0);
    
    let cogsSum = 0;
    sales.forEach(inv => {
      inv.items.forEach(item => {
        if (item.excludeFromRevenue) return;
        cogsSum += (item.purchasePrice || 0) * item.qty;
      });
    });

    const grossProfit = taxableSalesSum - cogsSum;
    const totalTransportExpense = purchases.reduce((sum, p) => sum + (p.transport || 0), 0);
    const netProfit = grossProfit - totalTransportExpense;

    res.json({
      todayGstSales,
      todayNonGstSales,
      monthlyGstSales,
      monthlyNonGstSales,
      todayGstPaymentBreakdown,
      todayNonGstPaymentBreakdown,
      todayPaymentBreakdown,
      monthlyGstPaymentBreakdown,
      monthlyNonGstPaymentBreakdown,
      monthlyPaymentBreakdown,
      // Period/Date-Filtered Data
      periodGstSales,
      periodNonGstSales,
      periodGstPurchases,
      periodNonGstPurchases,
      periodGstPaymentBreakdown,
      periodNonGstPaymentBreakdown,
      periodPaymentBreakdown,
      gstPurchases: monthlyGstPurchases,
      nonGstPurchases: monthlyNonGstPurchases,
      profit: {
        grossProfit,
        netProfit,
        cogs: cogsSum,
        taxableSales: taxableSalesSum
      },
      gstPayable,
      netSales,
      netPurchases,
      monthlySalesGst,
      monthlyPurchasesGst
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error compiling GST Dashboard", error: error.message });
  }
};

// @desc    Get GST-wise Sales summary report
// @route   GET /api/gst/reports/sales
// @access  Private
const getGstSalesSummary = async (req, res) => {
  const { period, startDate, endDate } = req.query;
  const tenantId = req.user._id;

  try {
    const dateQuery = getDateQuery(period, startDate, endDate);
    
    const matchStage = {
      isQuotation: { $ne: true },
      status: { $ne: "Refunded" },
      ...dateQuery
    };

    // Aggregate GST breakdown (only items from gst invoices)
    const gstMatchStage = {
      ...matchStage,
      isGstBilling: { $ne: false }
    };

    const ratesBreakdown = await Invoice.aggregate([
      { $match: gstMatchStage },
      { $unwind: "$items" },
      { $match: { "items.excludeFromRevenue": { $ne: true } } },
      {
        $project: {
          gstRate: { $ifNull: ["$items.gstRate", 0] },
          qty: { $ifNull: ["$items.qty", 0] },
          price: { $ifNull: ["$items.price", 0] },
          discountRatio: {
            $cond: {
              if: { $gt: ["$subtotal", 0] },
              then: { $divide: [{ $subtract: ["$subtotal", "$discountAmount"] }, "$subtotal"] },
              else: 1
            }
          },
          igst: { $ifNull: ["$igst", 0] },
          customerType: { $ifNull: ["$customerType", "Retail"] }
        }
      },
      {
        $project: {
          gstRate: 1,
          isInterstate: { $cond: { if: { $gt: ["$igst", 0] }, then: true, else: false } },
          isInclusive: {
            $cond: {
              if: { $in: ["$customerType", ["B2B", "Wholesale", "Trader", "Distributor"]] },
              then: false,
              else: true
            }
          },
          rawItemSubtotal: { $multiply: ["$qty", "$price", "$discountRatio"] }
        }
      },
      {
        $project: {
          gstRate: 1,
          isInterstate: 1,
          isInclusive: 1,
          rawItemSubtotal: 1,
          taxableValue: {
            $cond: {
              if: "$isInclusive",
              then: { $divide: ["$rawItemSubtotal", { $add: [1, { $divide: ["$gstRate", 100] }] }] },
              else: "$rawItemSubtotal"
            }
          }
        }
      },
      {
        $project: {
          gstRate: 1,
          taxableValue: 1,
          isInterstate: 1,
          taxAmount: {
            $cond: {
              if: "$isInclusive",
              then: { $subtract: ["$rawItemSubtotal", "$taxableValue"] },
              else: { $divide: [{ $multiply: ["$taxableValue", "$gstRate"] }, 100] }
            }
          }
        }
      },
      {
        $group: {
          _id: "$gstRate",
          taxableValue: { $sum: "$taxableValue" },
          cgst: {
            $sum: {
              $cond: {
                if: { $eq: ["$isInterstate", true] },
                then: 0,
                else: { $divide: ["$taxAmount", 2] }
              }
            }
          },
          sgst: {
            $sum: {
              $cond: {
                if: { $eq: ["$isInterstate", true] },
                then: 0,
                else: { $divide: ["$taxAmount", 2] }
              }
            }
          },
          igst: {
            $sum: {
              $cond: {
                if: { $eq: ["$isInterstate", true] },
                then: "$taxAmount",
                else: 0
              }
            }
          },
          totalTax: { $sum: "$taxAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate Non-GST breakdown (only items from non-gst invoices)
    const nonGstMatchStage = {
      ...matchStage,
      isGstBilling: false
    };

    const nonGstRatesBreakdown = await Invoice.aggregate([
      { $match: nonGstMatchStage },
      { $unwind: "$items" },
      { $match: { "items.excludeFromRevenue": { $ne: true } } },
      {
        $project: {
          gstRate: { $ifNull: ["$items.gstRate", 0] },
          qty: { $ifNull: ["$items.qty", 0] },
          price: { $ifNull: ["$items.price", 0] },
          discountRatio: {
            $cond: {
              if: { $gt: ["$subtotal", 0] },
              then: { $divide: [{ $subtract: ["$subtotal", "$discountAmount"] }, "$subtotal"] },
              else: 1
            }
          }
        }
      },
      {
        $project: {
          gstRate: 1,
          taxableValue: { $multiply: ["$qty", "$price", "$discountRatio"] }
        }
      },
      {
        $group: {
          _id: "$gstRate",
          taxableValue: { $sum: "$taxableValue" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // GST vs Non-GST sales tallies
    const salesAggregation = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          gstSales: {
            $sum: {
              $cond: {
                if: { $ne: ["$isGstBilling", false] },
                then: { $ifNull: ["$revenueTotal", "$total"] },
                else: 0
              }
            }
          },
          nonGstSales: {
            $sum: {
              $cond: {
                if: { $eq: ["$isGstBilling", false] },
                then: { $ifNull: ["$revenueTotal", "$total"] },
                else: 0
              }
            }
          },
          totalSales: { $sum: { $ifNull: ["$revenueTotal", "$total"] } },
          taxableValue: { $sum: { $ifNull: ["$revenueTaxableAmount", "$taxableAmount"] } },
          cgst: { $sum: { $ifNull: ["$revenueCgst", "$cgst"] } },
          sgst: { $sum: { $ifNull: ["$revenueSgst", "$sgst"] } },
          igst: { $sum: { $ifNull: ["$revenueIgst", "$igst"] } },
          totalTax: { $sum: { $ifNull: ["$revenueGstAmount", "$gstAmount"] } }
        }
      }
    ]);

    // Calculate payment method breakdowns for matched period invoices
    const salesInvoices = await Invoice.find(matchStage).lean();
    const gstSalesInvoices = salesInvoices.filter(inv => inv.isGstBilling !== false);
    const nonGstSalesInvoices = salesInvoices.filter(inv => inv.isGstBilling === false);

    const gstPaymentBreakdown = calculatePaymentBreakdown(gstSalesInvoices);
    const nonGstPaymentBreakdown = calculatePaymentBreakdown(nonGstSalesInvoices);
    const totalPaymentBreakdown = calculatePaymentBreakdown(salesInvoices);

    const summary = {
      ...(salesAggregation[0] || {
        gstSales: 0,
        nonGstSales: 0,
        totalSales: 0,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0
      }),
      gstPaymentBreakdown,
      nonGstPaymentBreakdown,
      totalPaymentBreakdown
    };

    // Format breakdown keys to read as percentage string
    const formattedRates = ratesBreakdown.map(r => ({
      rate: `${r._id}%`,
      taxableValue: r.taxableValue,
      cgst: r.cgst,
      sgst: r.sgst,
      igst: r.igst,
      totalTax: r.totalTax,
      totalAmount: r.taxableValue + r.totalTax
    }));

    const formattedNonGstRates = nonGstRatesBreakdown.map(r => ({
      rate: `${r._id}%`,
      taxableValue: r.taxableValue,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      totalAmount: r.taxableValue
    }));

    res.json({
      summary,
      ratesBreakdown: formattedRates,
      nonGstRatesBreakdown: formattedNonGstRates
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error compiling Sales GST report", error: error.message });
  }
};

// @desc    Get GST-wise Purchase summary report
// @route   GET /api/gst/reports/purchases
// @access  Private
const getGstPurchasesSummary = async (req, res) => {
  const { period, startDate, endDate } = req.query;
  const tenantId = req.user._id;

  try {
    const dateQuery = getDateQuery(period, startDate, endDate);
    const matchStage = {
      ...dateQuery
    };

    // Group purchases by GST rate (where isGst is true and supplierGst is non-empty)
    const gstPurchasesMatchStage = {
      ...matchStage,
      isGst: { $ne: false },
      supplierGst: { $exists: true, $ne: "", $regex: /\S/ }
    };

    const ratesBreakdown = await Purchase.aggregate([
      { $match: gstPurchasesMatchStage },
      { $unwind: "$items" },
      {
        $project: {
          gstRate: { $ifNull: ["$items.gstRate", 0] },
          taxableValue: { $ifNull: ["$items.taxableAmount", { $multiply: ["$items.qty", "$items.price"] }] },
          igst: { $ifNull: ["$igst", 0] }
        }
      },
      {
        $project: {
          gstRate: 1,
          taxableValue: 1,
          isInterstate: { $cond: { if: { $gt: ["$igst", 0] }, then: true, else: false } }
        }
      },
      {
        $project: {
          gstRate: 1,
          taxableValue: 1,
          taxAmount: { $divide: [{ $multiply: ["$taxableValue", "$gstRate"] }, 100] },
          isInterstate: 1
        }
      },
      {
        $group: {
          _id: "$gstRate",
          taxableValue: { $sum: "$taxableValue" },
          cgst: {
            $sum: {
              $cond: {
                if: { $eq: ["$isInterstate", true] },
                then: 0,
                else: { $divide: ["$taxAmount", 2] }
              }
            }
          },
          sgst: {
            $sum: {
              $cond: {
                if: { $eq: ["$isInterstate", true] },
                then: 0,
                else: { $divide: ["$taxAmount", 2] }
              }
            }
          },
          igst: {
            $sum: {
              $cond: {
                if: { $eq: ["$isInterstate", true] },
                then: "$taxAmount",
                else: 0
              }
            }
          },
          totalTax: { $sum: "$taxAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Group purchases by GST rate (where isGst is false OR supplierGst is empty)
    const nonGstPurchasesMatchStage = {
      ...matchStage,
      $or: [
        { isGst: false },
        { supplierGst: { $exists: false } },
        { supplierGst: "" },
        { supplierGst: null },
        { supplierGst: { $regex: /^\s*$/ } }
      ]
    };

    const nonGstRatesBreakdown = await Purchase.aggregate([
      { $match: nonGstPurchasesMatchStage },
      { $unwind: "$items" },
      {
        $project: {
          gstRate: { $ifNull: ["$items.gstRate", 0] },
          taxableValue: { $ifNull: ["$items.taxableAmount", { $multiply: ["$items.qty", "$items.price"] }] }
        }
      },
      {
        $group: {
          _id: "$gstRate",
          taxableValue: { $sum: "$taxableValue" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // GST vs Non-GST purchases aggregations
    const purchasesAggregation = await Purchase.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          gstPurchases: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$isGst", false] },
                    { $ne: [{ $ifNull: ["$supplierGst", ""] }, ""] }
                  ]
                },
                then: "$total",
                else: 0
              }
            }
          },
          nonGstPurchases: {
            $sum: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ["$isGst", false] },
                    { $eq: [{ $ifNull: ["$supplierGst", ""] }, ""] }
                  ]
                },
                then: "$total",
                else: 0
              }
            }
          },
          totalPurchases: { $sum: "$total" },
          taxableValue: { $sum: "$taxableAmount" },
          cgst: { $sum: "$cgst" },
          sgst: { $sum: "$sgst" },
          igst: { $sum: "$igst" },
          totalTax: { $sum: "$gstAmount" }
        }
      }
    ]);

    const summary = purchasesAggregation[0] || {
      gstPurchases: 0,
      nonGstPurchases: 0,
      totalPurchases: 0,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0
    };

    const formattedRates = ratesBreakdown.map(r => ({
      rate: `${r._id}%`,
      taxableValue: r.taxableValue,
      cgst: r.cgst,
      sgst: r.sgst,
      igst: r.igst,
      totalTax: r.totalTax,
      totalAmount: r.taxableValue + r.totalTax
    }));

    const formattedNonGstRates = nonGstRatesBreakdown.map(r => ({
      rate: `${r._id}%`,
      taxableValue: r.taxableValue,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      totalAmount: r.taxableValue
    }));

    res.json({
      summary,
      ratesBreakdown: formattedRates,
      nonGstRatesBreakdown: formattedNonGstRates
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error compiling Purchases GST report", error: error.message });
  }
};

// @desc    Get Monthly/Yearly GST Summary for CA
// @route   GET /api/gst/reports/ca-summary
// @access  Private
const getGstCaSummary = async (req, res) => {
  const tenantId = req.user._id;
  const { type } = req.query; // "monthly" or "yearly"

  try {
    const salesGroupStage = type === "yearly" 
      ? { year: { $year: "$date" } }
      : { year: { $year: "$date" }, month: { $month: "$date" } };

    const salesAgg = await Invoice.aggregate([
      {
        $match: {
          isQuotation: { $ne: true },
          status: { $ne: "Refunded" }
        }
      },
      {
        $group: {
          _id: salesGroupStage,
          taxableAmount: { $sum: { $ifNull: ["$revenueTaxableAmount", "$taxableAmount"] } },
          cgst: { $sum: { $ifNull: ["$revenueCgst", "$cgst"] } },
          sgst: { $sum: { $ifNull: ["$revenueSgst", "$sgst"] } },
          igst: { $sum: { $ifNull: ["$revenueIgst", "$igst"] } },
          totalTax: { $sum: { $ifNull: ["$revenueGstAmount", "$gstAmount"] } },
          totalSales: { $sum: { $ifNull: ["$revenueTotal", "$total"] } }
        }
      }
    ]);

    const purchasesAgg = await Purchase.aggregate([
      {
        $match: {}
      },
      {
        $group: {
          _id: salesGroupStage,
          taxableAmount: { $sum: "$taxableAmount" },
          cgst: { $sum: "$cgst" },
          sgst: { $sum: "$sgst" },
          igst: { $sum: "$igst" },
          totalTax: { $sum: "$gstAmount" },
          totalPurchases: { $sum: "$total" }
        }
      }
    ]);

    const summaryMap = {};

    salesAgg.forEach(s => {
      const key = type === "yearly" ? `${s._id.year}` : `${s._id.year}-${String(s._id.month).padStart(2, '0')}`;
      summaryMap[key] = {
        period: key,
        salesTaxable: s.taxableAmount,
        salesCgst: s.cgst,
        salesSgst: s.sgst,
        salesIgst: s.igst,
        salesTotalTax: s.totalTax,
        salesTotal: s.totalSales,
        purchasesTaxable: 0,
        purchasesCgst: 0,
        purchasesSgst: 0,
        purchasesIgst: 0,
        purchasesTotalTax: 0,
        purchasesTotal: 0
      };
    });

    purchasesAgg.forEach(p => {
      const key = type === "yearly" ? `${p._id.year}` : `${p._id.year}-${String(p._id.month).padStart(2, '0')}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          period: key,
          salesTaxable: 0,
          salesCgst: 0,
          salesSgst: 0,
          salesIgst: 0,
          salesTotalTax: 0,
          salesTotal: 0,
          purchasesTaxable: 0,
          purchasesCgst: 0,
          purchasesSgst: 0,
          purchasesIgst: 0,
          purchasesTotalTax: 0,
          purchasesTotal: 0
        };
      }
      summaryMap[key].purchasesTaxable = p.taxableAmount;
      summaryMap[key].purchasesCgst = p.cgst;
      summaryMap[key].purchasesSgst = p.sgst;
      summaryMap[key].purchasesIgst = p.igst;
      summaryMap[key].purchasesTotalTax = p.totalTax;
      summaryMap[key].purchasesTotal = p.totalPurchases;
    });

    const finalSummary = Object.values(summaryMap).sort((a, b) => b.period.localeCompare(a.period));

    res.json(finalSummary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error compiling CA GST report", error: error.message });
  }
};

// @desc    Get Inventory GST stock summary
// @route   GET /api/gst/inventory-summary
// @access  Private
const getInventoryGstSummary = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ name: 1 });

    const formattedProducts = [];
    for (const p of products) {
      let changed = false;
      // If split stocks are uninitialized (both are 0/undefined but total stock is non-zero)
      if ((p.gstStock === undefined || p.gstStock === null || p.gstStock === 0) &&
          (p.nonGstStock === undefined || p.nonGstStock === null || p.nonGstStock === 0) &&
          p.stock !== 0) {
        p.gstStock = p.stock;
        p.nonGstStock = 0;
        changed = true;
      }
      
      if (changed) {
        await p.save();
      }

      formattedProducts.push({
        _id: p._id,
        name: p.name,
        sku: p.sku,
        hsnCode: p.hsnCode || "N/A",
        gstStock: p.gstStock || 0,
        nonGstStock: p.nonGstStock || 0,
        totalStock: p.stock || 0,
        purchasePrice: p.prices?.purchase || p.price || 0,
        gstRate: p.gstRate || 0
      });
    }

    res.json(formattedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching Inventory GST summary", error: error.message });
  }
};

// @desc    Get profitability details based on tax splits
// @route   GET /api/gst/reports/profit
// @access  Private
const getProfitReport = async (req, res) => {
  const { period, startDate, endDate } = req.query;
  const tenantId = req.user._id;

  try {
    const dateQuery = getDateQuery(period, startDate, endDate);
    
    const matchStage = {
      isQuotation: { $ne: true },
      status: { $ne: "Refunded" },
      ...dateQuery
    };

    const invoices = await Invoice.find(matchStage).lean();
    const purchases = await Purchase.find(matchStage).lean();
    const products = await Product.find({}).lean();

    let gstSalesTaxable = 0;
    let gstSalesTax = 0;
    let nonGstSalesTaxable = 0;
    let totalSales = 0;
    let cogs = 0;

    invoices.forEach(inv => {
      const invTotal = inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total;
      const invTaxableAmount = inv.revenueTaxableAmount !== undefined ? inv.revenueTaxableAmount : inv.taxableAmount;
      const invGstAmount = inv.revenueGstAmount !== undefined ? inv.revenueGstAmount : inv.gstAmount;

      totalSales += invTotal;
      if (inv.isGstBilling !== false && inv.isGst !== false) {
        gstSalesTaxable += invTaxableAmount;
        gstSalesTax += invGstAmount;
      } else {
        nonGstSalesTaxable += invTotal;
      }

      inv.items.forEach(item => {
        if (item.excludeFromRevenue) return; // Skip dummy items
        cogs += (item.purchasePrice || 0) * item.qty;
      });
    });

    let gstPurchasesTaxable = 0;
    let gstPurchasesTax = 0;
    let nonGstPurchasesTaxable = 0;
    let totalPurchases = 0;
    let totalTransportCost = 0;

    purchases.forEach(p => {
      totalPurchases += p.total;
      totalTransportCost += p.transport || 0;
      if (p.isGst) {
        gstPurchasesTaxable += p.taxableAmount;
        gstPurchasesTax += p.gstAmount;
      } else {
        nonGstPurchasesTaxable += p.total;
      }
    });

    // Compute stock value (weighted or cost price sum)
    let stockValue = 0;
    products.forEach(p => {
      const pCost = p.prices?.purchase || p.price || 0;
      stockValue += pCost * (p.stock || 0);
    });

    const totalTaxableSales = gstSalesTaxable + nonGstSalesTaxable;
    const grossProfit = totalTaxableSales - cogs;
    const netProfit = grossProfit - totalTransportCost;

    res.json({
      gstSalesTaxable,
      gstSalesTax,
      nonGstSalesTaxable,
      totalSales,
      gstPurchasesTaxable,
      gstPurchasesTax,
      nonGstPurchasesTaxable,
      totalPurchases,
      stockValue,
      cogs,
      grossProfit,
      netProfit,
      expenses: totalTransportCost
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error compiling profit report", error: error.message });
  }
};

module.exports = {
  getGstDashboard,
  getGstSalesSummary,
  getGstPurchasesSummary,
  getGstCaSummary,
  getInventoryGstSummary,
  getProfitReport
};
