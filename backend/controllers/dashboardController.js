const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const CustomerLedger = require("../models/CustomerLedger");
const DamagedStock = require("../models/DamagedStock");

// @desc    Get dashboard KPIs and charts analytics
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const tenantId = req.user._id;

    // Fetch all invoices for tenant (excluding quotations)
    const invoices = await Invoice.find({ tenantId, isQuotation: { $ne: true } }).sort({ date: -1 }).lean();
    const paidInvoices = invoices.filter(inv => inv.status === "Paid");

    // Fetch all products
    const products = await Product.find({ tenantId }).lean();

    const getInvRevenue = (inv) => inv.revenueTotal !== undefined ? inv.revenueTotal : inv.total;

    // 1. Core KPIs
    const totalSales = paidInvoices.reduce((sum, inv) => sum + getInvRevenue(inv), 0);
    const totalInvoices = invoices.length;
    const inventoryCount = products.length;
    const lowStockProducts = products.filter(p => p.stock <= 5);

    // Today's Sales
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaySales = paidInvoices
      .filter(inv => new Date(inv.date) >= startOfToday)
      .reduce((sum, inv) => sum + getInvRevenue(inv), 0);

    // Monthly Sales (current calendar month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlySales = paidInvoices
      .filter(inv => new Date(inv.date) >= startOfMonth)
      .reduce((sum, inv) => sum + getInvRevenue(inv), 0);

    // 2. Recent Invoices
    const recentInvoices = invoices.slice(0, 5);

    // 3. Payment Method breakdown
    const paymentBreakdown = paidInvoices.reduce(
      (acc, inv) => {
        const invRev = getInvRevenue(inv);
        if (acc[inv.paymentMethod] !== undefined) {
          acc[inv.paymentMethod] += invRev;
        } else {
          acc[inv.paymentMethod] = invRev;
        }
        return acc;
      },
      { Cash: 0, UPI: 0, Card: 0, Credit: 0 }
    );

    // 4. Top Selling Products
    const productSalesMap = {};
    paidInvoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        if (item.excludeFromRevenue) return; // Skip non-revenue dummy items
        if (!productSalesMap[item.name]) {
          productSalesMap[item.name] = {
            name: item.name,
            sku: item.sku,
            qty: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.name].qty += item.qty;
        productSalesMap[item.name].revenue += item.price * item.qty;
      });
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 5. Reports & Aggregations

    // Daily Sales Report
    const dailyMap = {};
    paidInvoices.forEach((inv) => {
      const dateStr = new Date(inv.date).toISOString().split("T")[0]; // YYYY-MM-DD
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, sales: 0, count: 0 };
      }
      dailyMap[dateStr].sales += getInvRevenue(inv);
      dailyMap[dateStr].count += 1;
    });
    const dailySales = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

    // Monthly Sales Report
    const monthlyMap = {};
    paidInvoices.forEach((inv) => {
      const date = new Date(inv.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = { month: monthStr, sales: 0, count: 0 };
      }
      monthlyMap[monthStr].sales += getInvRevenue(inv);
      monthlyMap[monthStr].count += 1;
    });
    const monthlySalesReport = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));

    // Customer Report
    const customerMap = {};
    paidInvoices.forEach((inv) => {
      const custKey = inv.customerPhone !== "N/A" ? inv.customerPhone : inv.customerName;
      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          name: inv.customerName,
          phone: inv.customerPhone,
          totalSpent: 0,
          ordersCount: 0,
        };
      }
      customerMap[custKey].totalSpent += getInvRevenue(inv);
      customerMap[custKey].ordersCount += 1;
    });
    const customerReport = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);

    // GST Tax Report
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    const gstRateMap = {}; // group by tax rate %

    paidInvoices.forEach((inv) => {
      // ratio to compute discounted items
      const discountRatio = inv.subtotal > 0 ? (inv.subtotal - inv.discountAmount) / inv.subtotal : 1;
      
      inv.items.forEach((item) => {
        if (item.excludeFromRevenue) return; // Skip dummy items
        const itemSubtotal = item.price * item.qty;
        const discountedSubtotal = itemSubtotal * discountRatio;
        const gstRate = item.gstRate || 0;
        const gstVal = (discountedSubtotal * gstRate) / 100;
        
        totalTaxable += discountedSubtotal;
        totalCgst += gstVal / 2;
        totalSgst += gstVal / 2;

        const rateKey = `${gstRate}%`;
        if (!gstRateMap[rateKey]) {
          gstRateMap[rateKey] = { rate: rateKey, taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0 };
        }
        gstRateMap[rateKey].taxableValue += discountedSubtotal;
        gstRateMap[rateKey].cgst += gstVal / 2;
        gstRateMap[rateKey].sgst += gstVal / 2;
        gstRateMap[rateKey].totalTax += gstVal;
      });
    });
    const gstReport = {
      summary: { totalTaxable, totalCgst, totalSgst, totalTax: totalCgst + totalSgst },
      ratesBreakdown: Object.values(gstRateMap),
    };

    // Product Catalog Report
    const productReport = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

    // Detailed Multi-Price Sales Report
    const salesDetailsReport = [];
    paidInvoices.forEach((inv) => {
      const discountRatio = inv.subtotal > 0 ? (inv.subtotal - inv.discountAmount) / inv.subtotal : 1;
      inv.items.forEach((item) => {
        if (item.excludeFromRevenue) return; // Skip dummy items
        const itemSubtotal = item.price * item.qty;
        const discountedSubtotal = itemSubtotal * discountRatio;
        const purchaseCost = (item.purchasePrice || 0) * item.qty;
        const profit = discountedSubtotal - purchaseCost;
        
        salesDetailsReport.push({
          customerName: inv.customerName,
          customerType: inv.customerType || "Retail",
          productName: item.name,
          sku: item.sku,
          priceCategoryUsed: item.priceCategoryUsed || "retail",
          sellingPriceUsed: item.price,
          qty: item.qty,
          totalAmount: discountedSubtotal,
          profit: profit,
          date: inv.date,
          isManualItem: item.isManualItem || false,
        });
      });
    });

    // Fetch Credit / Debtors, Collections, Returns & Damaged Stock Reports
    const creditCustomers = await Customer.find({ tenantId, outstandingBalance: { $gt: 0 } }).sort({ outstandingBalance: -1 }).lean();
    const pendingCreditInvoices = await Invoice.find({ 
      tenantId, 
      paymentMethod: "Credit", 
      outstandingAmount: { $gt: 0 }, 
      status: "Paid", 
      isQuotation: { $ne: true } 
    }).sort({ date: -1 }).lean();
    
    const paymentsCollected = await CustomerLedger.find({ tenantId, type: "Payment" })
      .populate("customerId", "name phone")
      .sort({ date: -1 })
      .lean();
      
    const salesReturns = await Invoice.find({ 
      tenantId, 
      isReturnExchange: true, 
      isQuotation: { $ne: true } 
    }).sort({ date: -1 }).lean();
    
    const damagedStock = await DamagedStock.find({ tenantId })
      .populate("productId", "name sku")
      .sort({ date: -1 })
      .lean();

    res.json({
      kpis: {
        totalSales,
        todaySales,
        monthlySales,
        totalInvoices,
        inventoryCount,
        lowStockCount: lowStockProducts.length,
      },
      recentInvoices,
      lowStockProducts,
      paymentBreakdown,
      topSellingProducts,
      reports: {
        dailySales,
        monthlySales: monthlySalesReport,
        customerReport,
        productReport,
        gstReport,
        salesDetailsReport,
        creditCustomers,
        pendingCreditInvoices,
        paymentsCollected,
        salesReturns,
        damagedStock,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error compiling dashboard summary analytics" });
  }
};

module.exports = { getDashboardSummary };
