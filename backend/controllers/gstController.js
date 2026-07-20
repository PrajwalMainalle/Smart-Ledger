const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");

// Helper to resolve period filters into date query
const getDateQuery = (period, startDate, endDate) => {
  const now = new Date();
  let start = null;
  let end = new Date();

  if (period === "daily") {
    start = new Date(now.setHours(0, 0, 0, 0));
    end = new Date(now.setHours(23, 59, 59, 999));
  } else if (period === "weekly") {
    start = new Date();
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "yearly") {
    start = new Date(now.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
  } else if (startDate || endDate) {
    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
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

// @desc    Get GST Dashboard metrics
// @route   GET /api/gst/dashboard
// @access  Private
const getGstDashboard = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Sales metrics (Invoices, excluding quotations & refunded status)
    const sales = await Invoice.find({
      tenantId,
      isQuotation: { $ne: true },
      status: { $ne: "Refunded" }
    }).lean();

    const todayGstSales = sales
      .filter(inv => inv.date >= startOfToday && inv.date <= endOfToday && inv.isGst)
      .reduce((sum, inv) => sum + inv.total, 0);

    const todayNonGstSales = sales
      .filter(inv => inv.date >= startOfToday && inv.date <= endOfToday && !inv.isGst)
      .reduce((sum, inv) => sum + inv.total, 0);

    const monthlyGstSales = sales
      .filter(inv => inv.date >= startOfMonth && inv.isGst)
      .reduce((sum, inv) => sum + inv.total, 0);

    const monthlyNonGstSales = sales
      .filter(inv => inv.date >= startOfMonth && !inv.isGst)
      .reduce((sum, inv) => sum + inv.total, 0);

    // 2. Purchases metrics
    const purchases = await Purchase.find({ tenantId }).lean();

    const monthlyGstPurchases = purchases
      .filter(p => p.date >= startOfMonth && p.isGst)
      .reduce((sum, p) => sum + p.total, 0);

    const monthlyNonGstPurchases = purchases
      .filter(p => p.date >= startOfMonth && !p.isGst)
      .reduce((sum, p) => sum + p.total, 0);

    // Net Sales (Total Sales - Returns)
    const totalSales = sales.reduce((sum, inv) => sum + inv.total, 0);
    const totalReturns = sales
      .filter(inv => inv.isReturnExchange)
      .reduce((sum, inv) => {
        const retSum = inv.returnedItems?.reduce((s, item) => {
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
      .filter(inv => inv.date >= startOfMonth && inv.isGst)
      .reduce((sum, inv) => sum + inv.gstAmount, 0);

    const monthlyPurchasesGst = purchases
      .filter(p => p.date >= startOfMonth && p.isGst)
      .reduce((sum, p) => sum + p.gstAmount, 0);

    const gstPayable = monthlySalesGst - monthlyPurchasesGst;

    // Profit Calculations
    // Gross Profit = Taxable Sales - Cost of Goods Sold (COGS)
    const taxableSalesSum = sales.reduce((sum, inv) => sum + (inv.taxableAmount || (inv.subtotal - inv.discountAmount)), 0);
    
    // COGS = sum of purchasePrice * qty for all sold items
    let cogsSum = 0;
    sales.forEach(inv => {
      inv.items.forEach(item => {
        cogsSum += (item.purchasePrice || 0) * item.qty;
      });
    });

    const grossProfit = taxableSalesSum - cogsSum;

    // Net Profit = Gross Profit - Expenses (using Purchase transport costs as expense)
    const totalTransportExpense = purchases.reduce((sum, p) => sum + (p.transport || 0), 0);
    const netProfit = grossProfit - totalTransportExpense;

    res.json({
      todayGstSales,
      todayNonGstSales,
      monthlyGstSales,
      monthlyNonGstSales,
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
      tenantId: tenantId,
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
              if: { $in: ["$customerType", ["School", "Retail"]] },
              then: true,
              else: false
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
              $cond: { if: { $eq: ["$isGstBilling", true] }, then: "$total", else: 0 }
            }
          },
          nonGstSales: {
            $sum: {
              $cond: { if: { $eq: ["$isGstBilling", false] }, then: "$total", else: 0 }
            }
          },
          totalSales: { $sum: "$total" },
          taxableValue: { $sum: "$taxableAmount" },
          cgst: { $sum: "$cgst" },
          sgst: { $sum: "$sgst" },
          igst: { $sum: "$igst" },
          totalTax: { $sum: "$gstAmount" }
        }
      }
    ]);

    const summary = salesAggregation[0] || {
      gstSales: 0,
      nonGstSales: 0,
      totalSales: 0,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0
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
      tenantId: tenantId,
      ...dateQuery
    };

    // Group purchases by GST rate (where isGst is true)
    const gstPurchasesMatchStage = {
      ...matchStage,
      isGst: { $ne: false }
    };

    const ratesBreakdown = await Purchase.aggregate([
      { $match: gstPurchasesMatchStage },
      { $unwind: "$items" },
      {
        $project: {
          gstRate: { $ifNull: ["$items.gstRate", 0] },
          qty: { $ifNull: ["$items.qty", 0] },
          price: { $ifNull: ["$items.price", 0] },
          igst: { $ifNull: ["$igst", 0] }
        }
      },
      {
        $project: {
          gstRate: 1,
          taxableValue: { $multiply: ["$qty", "$price"] },
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

    // Group purchases by GST rate (where isGst is false)
    const nonGstPurchasesMatchStage = {
      ...matchStage,
      isGst: false
    };

    const nonGstRatesBreakdown = await Purchase.aggregate([
      { $match: nonGstPurchasesMatchStage },
      { $unwind: "$items" },
      {
        $project: {
          gstRate: { $ifNull: ["$items.gstRate", 0] },
          qty: { $ifNull: ["$items.qty", 0] },
          price: { $ifNull: ["$items.price", 0] }
        }
      },
      {
        $project: {
          gstRate: 1,
          taxableValue: { $multiply: ["$qty", "$price"] }
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
              $cond: { if: { $eq: ["$isGst", true] }, then: "$total", else: 0 }
            }
          },
          nonGstPurchases: {
            $sum: {
              $cond: { if: { $ne: ["$isGst", true] }, then: "$total", else: 0 }
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
          tenantId: tenantId,
          isQuotation: { $ne: true },
          status: { $ne: "Refunded" }
        }
      },
      {
        $group: {
          _id: salesGroupStage,
          taxableAmount: { $sum: "$taxableAmount" },
          cgst: { $sum: "$cgst" },
          sgst: { $sum: "$sgst" },
          igst: { $sum: "$igst" },
          totalTax: { $sum: "$gstAmount" },
          totalSales: { $sum: "$total" }
        }
      }
    ]);

    const purchasesAgg = await Purchase.aggregate([
      {
        $match: { tenantId }
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
    const tenantId = req.user._id;
    const products = await Product.find({ tenantId }).sort({ name: 1 });

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
      tenantId: tenantId,
      isQuotation: { $ne: true },
      status: { $ne: "Refunded" },
      ...dateQuery
    };

    const invoices = await Invoice.find(matchStage).lean();
    const purchases = await Purchase.find(matchStage).lean();
    const products = await Product.find({ tenantId }).lean();

    let gstSalesTaxable = 0;
    let gstSalesTax = 0;
    let nonGstSalesTaxable = 0;
    let totalSales = 0;
    let cogs = 0;

    invoices.forEach(inv => {
      totalSales += inv.total;
      if (inv.isGst) {
        gstSalesTaxable += inv.taxableAmount;
        gstSalesTax += inv.gstAmount;
      } else {
        nonGstSalesTaxable += inv.total; // total represents taxable since there is no tax
      }

      inv.items.forEach(item => {
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
