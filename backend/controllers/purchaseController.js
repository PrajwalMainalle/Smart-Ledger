const Purchase = require("../models/Purchase");
const Product = require("../models/Product");

// @desc    Get all purchase bills for tenant
// @route   GET /api/purchases
// @access  Private
const getPurchaseBills = async (req, res) => {
  try {
    const purchases = await Purchase.find({ tenantId: req.user._id }).sort({ date: -1 });
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
  const { billNumber, supplierName, supplierGst, date, items, paymentMethod, status, remarks } = req.body;

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

    // Compute subtotal, gstAmount, total
    let subtotal = 0;
    let gstAmount = 0;
    const purchaseItems = [];

    items.forEach((item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;

      const itemSubtotal = price * qty;
      const itemGst = (itemSubtotal * gstRate) / 100;

      subtotal += itemSubtotal;
      gstAmount += itemGst;

      purchaseItems.push({
        productId: item.productId || null,
        sku: item.sku || "",
        name: item.name,
        price,
        qty,
        gstRate,
      });
    });

    const total = subtotal + gstAmount;

    const purchase = new Purchase({
      tenantId: req.user._id,
      billNumber: billNumber.trim(),
      supplierName: supplierName.trim(),
      supplierGst: (supplierGst || "").trim(),
      date: date || new Date(),
      items: purchaseItems,
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
          product.stock += item.qty;
          
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
  const { billNumber, supplierName, supplierGst, date, items, paymentMethod, status, remarks } = req.body;

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

    if (billNumber) purchase.billNumber = billNumber.trim();
    if (supplierName) purchase.supplierName = supplierName.trim();
    if (supplierGst !== undefined) purchase.supplierGst = supplierGst.trim();
    if (date) purchase.date = date;
    if (paymentMethod) purchase.paymentMethod = paymentMethod;
    if (status) purchase.status = status;
    if (remarks !== undefined) purchase.remarks = remarks;

    if (items && items.length > 0) {
      // Revert old stock levels first
      for (const oldItem of purchase.items) {
        if (oldItem.productId) {
          const product = await Product.findOne({ _id: oldItem.productId, tenantId: req.user._id });
          if (product) {
            product.stock -= oldItem.qty;
            await product.save();
          }
        }
      }

      let subtotal = 0;
      let gstAmount = 0;
      const purchaseItems = [];

      items.forEach((item) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.qty) || 0;
        const gstRate = parseFloat(item.gstRate) || 0;

        const itemSubtotal = price * qty;
        const itemGst = (itemSubtotal * gstRate) / 100;

        subtotal += itemSubtotal;
        gstAmount += itemGst;

        purchaseItems.push({
          productId: item.productId || null,
          sku: item.sku || "",
          name: item.name,
          price,
          qty,
          gstRate,
        });
      });

      purchase.items = purchaseItems;
      purchase.subtotal = subtotal;
      purchase.gstAmount = gstAmount;
      purchase.total = subtotal + gstAmount;
    }

    const updatedPurchase = await purchase.save();

    if (items && items.length > 0) {
      // Apply new stock levels & update purchase cost prices
      for (const newItem of updatedPurchase.items) {
        if (newItem.productId) {
          const product = await Product.findOne({ _id: newItem.productId, tenantId: req.user._id });
          if (product) {
            product.stock += newItem.qty;
            
            if (!product.prices) {
              product.prices = new Map();
            }
            product.prices.set("purchase", newItem.price);
            
            await product.save();
          }
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
          product.stock -= item.qty;
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
