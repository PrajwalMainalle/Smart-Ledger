const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const User = require("../models/User");

// @desc    Get all purchase bills for tenant
// @route   GET /api/purchases
// @access  Private
const getPurchaseBills = async (req, res) => {
  try {
    const purchases = await Purchase.find({ tenantId: req.user._id }).sort({ date: -1 }).lean();
    res.json(purchases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching purchases log" });
  }
};

// @desc    Create a new purchase bill
// @route   POST /api/purchases
// @access  Private
const createPurchaseBill = async (req, res) => {
  const { billNumber, supplierName, supplierGst, date, items, paymentMethod, status, remarks, transport, gstType } = req.body;

  if (!billNumber || !supplierName) {
    return res.status(400).json({ message: "Bill number and supplier name are required" });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Purchase bill must contain at least one item" });
  }

  try {
    // Check for duplicate bill number from the same supplier
    const duplicate = await Purchase.findOne({
      tenantId: req.user._id,
      supplierName: supplierName.trim(),
      billNumber: billNumber.trim(),
    });

    if (duplicate) {
      return res.status(400).json({ message: `A purchase bill with number '${billNumber}' already exists for supplier '${supplierName}'` });
    }

    // Fetch tenant user to get their GSTIN
    const tenantUser = await User.findById(req.user._id);
    const tenantGst = tenantUser.profile?.gstNumber || "";

    const purchaseSource = req.body.purchaseSource || (supplierGst && supplierGst.trim() !== "" ? "GST" : "Non-GST");
    const isGst = purchaseSource === "GST";

    // Helper to round to 2 decimal places
    const round2 = (num) => Math.round(num * 100) / 100;

    // Compute subtotal, gstAmount, total
    let subtotal = 0;
    let totalItemDiscounts = 0;
    let baseTaxable = 0;

    const itemDetails = items.map((item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty) || 0;
      const schDiscount = parseFloat(item.schDiscount) || 0;
      const splDiscount = parseFloat(item.splDiscount) || 0;

      const itemSubtotal = round2(price * qty);
      const tradeDiscount = round2(itemSubtotal * (splDiscount / 100));
      const netAfterTrade = round2(itemSubtotal - tradeDiscount);
      const schemeDiscount = round2(netAfterTrade * (schDiscount / 100));
      const itemDiscount = round2(tradeDiscount + schemeDiscount);
      const itemTaxableBeforeCash = round2(itemSubtotal - itemDiscount);

      subtotal += itemSubtotal;
      totalItemDiscounts += itemDiscount;
      baseTaxable += itemTaxableBeforeCash;

      return {
        item,
        price,
        qty,
        schDiscount,
        splDiscount,
        itemSubtotal,
        itemTaxableBeforeCash,
        gstRate: isGst ? (parseFloat(item.gstRate) || 0) : 0
      };
    });

    const cashDiscountPercent = parseFloat(req.body.cashDiscountPercent) || 0;
    let cashDiscountAmount = parseFloat(req.body.cashDiscountAmount) || 0;
    if (cashDiscountPercent > 0 && cashDiscountAmount === 0) {
      cashDiscountAmount = round2(baseTaxable * (cashDiscountPercent / 100));
    }
    const effectiveCashDiscPercent = cashDiscountPercent > 0 
      ? cashDiscountPercent 
      : (baseTaxable > 0 ? (cashDiscountAmount / baseTaxable) * 100 : 0);

    let gstAmount = 0;
    let finalTaxableAmount = 0;
    let totalCalculatedCashDiscount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const purchaseItems = [];

    let isInterstate = false;
    if (supplierGst && supplierGst.trim().length >= 2 && tenantGst.trim().length >= 2) {
      const supplierStateCode = supplierGst.trim().substring(0, 2);
      const tenantStateCode = tenantGst.trim().substring(0, 2);
      if (supplierStateCode !== tenantStateCode) {
        isInterstate = true;
      }
    }
    const selectedGstType = gstType || (isInterstate ? "IGST" : "CGST+SGST");

    itemDetails.forEach((detail) => {
      const itemCashDiscount = round2(detail.itemTaxableBeforeCash * (effectiveCashDiscPercent / 100));
      const itemTaxable = round2(detail.itemTaxableBeforeCash - itemCashDiscount);
      
      totalCalculatedCashDiscount += itemCashDiscount;
      finalTaxableAmount += itemTaxable;

      let itemGst = 0;
      if (isGst && detail.gstRate > 0) {
        if (selectedGstType === "IGST") {
          const itemIgst = round2(itemTaxable * (detail.gstRate / 100));
          igst += itemIgst;
          itemGst = itemIgst;
        } else {
          // CGST+SGST
          const itemCgst = round2(itemTaxable * (detail.gstRate / 2 / 100));
          const itemSgst = round2(itemTaxable * (detail.gstRate / 2 / 100));
          cgst += itemCgst;
          sgst += itemSgst;
          itemGst = round2(itemCgst + itemSgst);
        }
      }

      gstAmount += itemGst;

      purchaseItems.push({
        productId: detail.item.productId || null,
        sku: detail.item.sku || "",
        name: detail.item.name,
        price: detail.price,
        qty: detail.qty,
        gstRate: detail.gstRate,
        hsnCode: detail.item.hsnCode || "",
        schDiscount: detail.schDiscount,
        splDiscount: detail.splDiscount,
        taxableAmount: itemTaxable
      });
    });

    const transportCost = parseFloat(transport) || 0;
    const discountAmount = req.body.discountAmount !== undefined ? parseFloat(req.body.discountAmount) : round2(totalItemDiscounts);
    const total = round2(finalTaxableAmount + gstAmount + transportCost);

    const purchase = new Purchase({
      tenantId: req.user._id,
      billNumber: billNumber.trim(),
      supplierName: supplierName.trim(),
      supplierGst: (supplierGst || "").trim(),
      isGst,
      purchaseSource,
      gstType: selectedGstType,
      transport: transportCost,
      date: date || new Date(),
      items: purchaseItems,
      taxableAmount: finalTaxableAmount,
      cgst,
      sgst,
      igst,
      discountAmount,
      cashDiscountPercent,
      cashDiscountAmount: totalCalculatedCashDiscount,
      subtotal,
      gstAmount,
      total,
      paymentMethod: paymentMethod || "Cash",
      status: status || "Paid",
      remarks: remarks || "",
    });

    const savedPurchase = await purchase.save();

    // Automatically update stocks & purchase cost prices in inventory
    for (const item of purchaseItems) {
      if (item.productId) {
        const product = await Product.findOne({ _id: item.productId, tenantId: req.user._id });
        if (product) {
          if (purchaseSource === "GST") {
            product.gstStock = (product.gstStock || 0) + item.qty;
          } else {
            product.nonGstStock = (product.nonGstStock || 0) + item.qty;
          }
          product.stock = (product.gstStock || 0) + (product.nonGstStock || 0);
          
          if (!product.prices) {
            product.prices = new Map();
          }
          product.prices.set("purchase", item.price);
          
          await product.save();
        }
      }
    }

    res.status(201).json(savedPurchase);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating purchase bill" });
  }
};

// @desc    Update a purchase bill
// @route   PUT /api/purchases/:id
// @access  Private
const updatePurchaseBill = async (req, res) => {
  const { id } = req.params;
  const { billNumber, supplierName, supplierGst, date, items, paymentMethod, status, remarks, transport, gstType } = req.body;

  try {
    const purchase = await Purchase.findOne({ _id: id, tenantId: req.user._id });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase bill not found" });
    }

    // Verify duplicate if supplierName or billNumber changed
    if (
      (billNumber && billNumber.trim() !== purchase.billNumber) ||
      (supplierName && supplierName.trim() !== purchase.supplierName)
    ) {
      const checkName = supplierName ? supplierName.trim() : purchase.supplierName;
      const checkBill = billNumber ? billNumber.trim() : purchase.billNumber;

      const duplicate = await Purchase.findOne({
        _id: { $ne: id },
        tenantId: req.user._id,
        supplierName: checkName,
        billNumber: checkBill,
      });

      if (duplicate) {
        return res.status(400).json({ message: `A purchase bill with number '${checkBill}' already exists for supplier '${checkName}'` });
      }
    }

    // Revert old stock levels first (using the old purchaseSource)
    for (const oldItem of purchase.items) {
      if (oldItem.productId) {
        const product = await Product.findOne({ _id: oldItem.productId, tenantId: req.user._id });
        if (product) {
          if (purchase.purchaseSource === "GST") {
            product.gstStock = Math.max(0, (product.gstStock || 0) - oldItem.qty);
          } else {
            product.nonGstStock = Math.max(0, (product.nonGstStock || 0) - oldItem.qty);
          }
          product.stock = (product.gstStock || 0) + (product.nonGstStock || 0);
          await product.save();
        }
      }
    }

    const tenantUser = await User.findById(req.user._id);
    const tenantGst = tenantUser.profile?.gstNumber || "";

    const purchaseSource = req.body.purchaseSource || purchase.purchaseSource;
    const isGst = purchaseSource === "GST";

    // Helper to round to 2 decimal places
    const round2 = (num) => Math.round(num * 100) / 100;

    let subtotal = 0;
    let totalItemDiscounts = 0;
    let baseTaxable = 0;

    const activeItems = items && items.length > 0 ? items : purchase.items;

    const itemDetails = activeItems.map((item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty) || 0;
      const schDiscount = parseFloat(item.schDiscount) || 0;
      const splDiscount = parseFloat(item.splDiscount) || 0;

      const itemSubtotal = round2(price * qty);
      const tradeDiscount = round2(itemSubtotal * (splDiscount / 100));
      const netAfterTrade = round2(itemSubtotal - tradeDiscount);
      const schemeDiscount = round2(netAfterTrade * (schDiscount / 100));
      const itemDiscount = round2(tradeDiscount + schemeDiscount);
      const itemTaxableBeforeCash = round2(itemSubtotal - itemDiscount);

      subtotal += itemSubtotal;
      totalItemDiscounts += itemDiscount;
      baseTaxable += itemTaxableBeforeCash;

      return {
        item,
        price,
        qty,
        schDiscount,
        splDiscount,
        itemSubtotal,
        itemTaxableBeforeCash,
        gstRate: isGst ? (parseFloat(item.gstRate) || 0) : 0
      };
    });

    const cashDiscountPercent = req.body.cashDiscountPercent !== undefined 
      ? parseFloat(req.body.cashDiscountPercent) || 0 
      : (purchase.cashDiscountPercent || 0);
      
    let cashDiscountAmount = req.body.cashDiscountAmount !== undefined 
      ? parseFloat(req.body.cashDiscountAmount) || 0 
      : (purchase.cashDiscountAmount || 0);

    if (cashDiscountPercent > 0 && req.body.cashDiscountAmount === undefined) {
      cashDiscountAmount = round2(baseTaxable * (cashDiscountPercent / 100));
    }
    const effectiveCashDiscPercent = cashDiscountPercent > 0 
      ? cashDiscountPercent 
      : (baseTaxable > 0 ? (cashDiscountAmount / baseTaxable) * 100 : 0);

    let gstAmount = 0;
    let finalTaxableAmount = 0;
    let totalCalculatedCashDiscount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const purchaseItems = [];

    const finalSupplierGst = supplierGst !== undefined ? supplierGst : purchase.supplierGst;
    let isInterstate = false;
    if (finalSupplierGst && finalSupplierGst.trim().length >= 2 && tenantGst.trim().length >= 2) {
      const supplierStateCode = finalSupplierGst.trim().substring(0, 2);
      const tenantStateCode = tenantGst.trim().substring(0, 2);
      if (supplierStateCode !== tenantStateCode) {
        isInterstate = true;
      }
    }
    const selectedGstType = gstType || purchase.gstType || (isInterstate ? "IGST" : "CGST+SGST");

    itemDetails.forEach((detail) => {
      const itemCashDiscount = round2(detail.itemTaxableBeforeCash * (effectiveCashDiscPercent / 100));
      const itemTaxable = round2(detail.itemTaxableBeforeCash - itemCashDiscount);
      
      totalCalculatedCashDiscount += itemCashDiscount;
      finalTaxableAmount += itemTaxable;

      let itemGst = 0;
      if (isGst && detail.gstRate > 0) {
        if (selectedGstType === "IGST") {
          const itemIgst = round2(itemTaxable * (detail.gstRate / 100));
          igst += itemIgst;
          itemGst = itemIgst;
        } else {
          // CGST+SGST
          const itemCgst = round2(itemTaxable * (detail.gstRate / 2 / 100));
          const itemSgst = round2(itemTaxable * (detail.gstRate / 2 / 100));
          cgst += itemCgst;
          sgst += itemSgst;
          itemGst = round2(itemCgst + itemSgst);
        }
      }

      gstAmount += itemGst;

      purchaseItems.push({
        productId: detail.item.productId || null,
        sku: detail.item.sku || "",
        name: detail.item.name,
        price: detail.price,
        qty: detail.qty,
        gstRate: detail.gstRate,
        hsnCode: detail.item.hsnCode || "",
        schDiscount: detail.schDiscount,
        splDiscount: detail.splDiscount,
        taxableAmount: itemTaxable
      });
    });

    if (billNumber) purchase.billNumber = billNumber.trim();
    if (supplierName) purchase.supplierName = supplierName.trim();
    if (supplierGst !== undefined) purchase.supplierGst = supplierGst.trim();
    if (date) purchase.date = date;
    if (paymentMethod) purchase.paymentMethod = paymentMethod;
    if (status) purchase.status = status;
    if (remarks !== undefined) purchase.remarks = remarks;
    if (transport !== undefined) purchase.transport = parseFloat(transport) || 0;

    const discountAmount = req.body.discountAmount !== undefined ? parseFloat(req.body.discountAmount) || 0 : round2(totalItemDiscounts);

    purchase.isGst = isGst;
    purchase.purchaseSource = purchaseSource;
    purchase.gstType = selectedGstType;
    purchase.items = purchaseItems;
    purchase.taxableAmount = finalTaxableAmount;
    purchase.cgst = cgst;
    purchase.sgst = sgst;
    purchase.igst = igst;
    purchase.discountAmount = discountAmount;
    purchase.cashDiscountPercent = cashDiscountPercent;
    purchase.cashDiscountAmount = totalCalculatedCashDiscount;
    purchase.subtotal = round2(subtotal);
    purchase.gstAmount = round2(gstAmount);
    purchase.total = round2(finalTaxableAmount + gstAmount + purchase.transport);

    const updatedPurchase = await purchase.save();

    // Re-apply stocks with new purchaseSource
    for (const newItem of updatedPurchase.items) {
      if (newItem.productId) {
        const product = await Product.findOne({ _id: newItem.productId, tenantId: req.user._id });
        if (product) {
          if (purchaseSource === "GST") {
            product.gstStock = (product.gstStock || 0) + newItem.qty;
          } else {
            product.nonGstStock = (product.nonGstStock || 0) + newItem.qty;
          }
          product.stock = (product.gstStock || 0) + (product.nonGstStock || 0);

          if (!product.prices) {
            product.prices = new Map();
          }
          product.prices.set("purchase", newItem.price);

          await product.save();
        }
      }
    }

    res.json(updatedPurchase);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating purchase bill" });
  }
};

// @desc    Delete a purchase bill
// @route   DELETE /api/purchases/:id
// @access  Private
const deletePurchaseBill = async (req, res) => {
  const { id } = req.params;

  try {
    const purchase = await Purchase.findOne({ _id: id, tenantId: req.user._id });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase bill not found" });
    }

    // Revert stock adjustments
    for (const item of purchase.items) {
      if (item.productId) {
        const product = await Product.findOne({ _id: item.productId, tenantId: req.user._id });
        if (product) {
          if (purchase.purchaseSource === "GST") {
            product.gstStock = Math.max(0, (product.gstStock || 0) - item.qty);
          } else {
            product.nonGstStock = Math.max(0, (product.nonGstStock || 0) - item.qty);
          }
          product.stock = (product.gstStock || 0) + (product.nonGstStock || 0);
          await product.save();
        }
      }
    }

    await Purchase.deleteOne({ _id: id });

    res.json({ message: "Purchase bill deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting purchase bill" });
  }
};

module.exports = {
  getPurchaseBills,
  createPurchaseBill,
  updatePurchaseBill,
  deletePurchaseBill,
};
