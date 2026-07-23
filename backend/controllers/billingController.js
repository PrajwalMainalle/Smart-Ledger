const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const User = require("../models/User");
const Customer = require("../models/Customer");
const CustomerLedger = require("../models/CustomerLedger");
const DamagedStock = require("../models/DamagedStock");
const { generateInvoicePDF } = require("../utils/pdfGenerator");
const path = require("path");
const fs = require("fs");

// @desc    Get all invoices for tenant
// @route   GET /api/billing
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ tenantId: req.user._id }).sort({ date: -1 }).lean();
    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching invoices log" });
  }
};

// @desc    Create a new invoice (Checkout)
// @route   POST /api/billing
// @access  Private
const createInvoice = async (req, res) => {
  const { 
    customerName, 
    customerPhone, 
    customerType, 
    items, 
    discountType, 
    discountValue, 
    discountPercent, 
    paymentMethod, 
    isQuotation, 
    isGstBilling,
    amountPaid,
    returnedItems,
    cashAmount,
    upiAmount
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "No items provided in cart" });
  }

  try {
    const tenantId = req.user._id;

    // 1. Verify stock availability first & cache products for cost calculations
    const checkedItems = [];
    const productsMap = {};
    const isGst = isGstBilling !== false;
    const salesType = isGst ? "GST" : "Non-GST";

    // Fetch tenant user to check billing rules and gstNumber
    const tenantUser = await User.findById(tenantId);
    const billingRule = tenantUser?.gstBillingRule || "warn";
    const tenantGst = tenantUser?.profile?.gstNumber || "";
    const tenantState = tenantUser?.profile?.state || "";

    for (const cartItem of items) {
      if (cartItem.isManualItem) {
        continue;
      }
      const pId = cartItem.id || cartItem.productId;
      const product = await Product.findOne({ _id: pId, tenantId });
      if (!product) {
        return res.status(404).json({ message: `Product '${cartItem.name}' not found in inventory` });
      }
      if (!isQuotation) {
        // Safe split stock initialization
        if ((product.gstStock === undefined || product.gstStock === null || product.gstStock === 0) &&
            (product.nonGstStock === undefined || product.nonGstStock === null || product.nonGstStock === 0) &&
            product.stock !== 0) {
          product.gstStock = product.stock;
          product.nonGstStock = 0;
        }

        const requiredStock = cartItem.qty;
        const availableStock = product.stock || 0;
        if (availableStock < requiredStock && billingRule === "prevent") {
          return res.status(400).json({
            message: `Insufficient stock for product '${product.name}'. Required: ${requiredStock}, Available: ${availableStock}`
          });
        }
      }
      checkedItems.push({ product, qty: cartItem.qty });
      productsMap[pId] = product;
    }

    // 2. Compute Invoice Totals for new purchases
    let subtotal = 0;
    const invoiceItems = [];

    items.forEach((item) => {
      const itemSubtotal = item.price * item.qty;
      subtotal += itemSubtotal;

      if (item.isManualItem) {
        invoiceItems.push({
          productId: null,
          name: item.name,
          price: item.price,
          purchasePrice: 0,
          priceCategoryUsed: "manual",
          qty: item.qty,
          gstRate: item.gstRate || 0,
          sku: "MANUAL",
          isManualItem: true,
          excludeFromRevenue: !!item.excludeFromRevenue,
          hsnCode: item.hsnCode || "",
        });
      } else {
        const pId = item.id || item.productId;
        const productDoc = productsMap[pId];
        const purchasePrice = productDoc && productDoc.prices ? (productDoc.prices.get("purchase") || 0) : 0;
        const hsnCode = productDoc ? productDoc.hsnCode : "";
        invoiceItems.push({
          productId: pId,
          name: item.name,
          price: item.price,
          purchasePrice: purchasePrice,
          priceCategoryUsed: item.priceCategoryUsed || "retail",
          qty: item.qty,
          gstRate: item.gstRate || 0,
          sku: item.sku,
          isManualItem: false,
          excludeFromRevenue: false,
          hsnCode: hsnCode || "",
        });
      }
    });

    let discountAmount = 0;
    let discPercent = 0;

    if (discountType === "fixed") {
      discountAmount = Math.min(parseFloat(discountValue) || 0, subtotal);
      discPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    } else {
      discPercent = parseFloat(discountValue !== undefined ? discountValue : discountPercent) || 0;
      discountAmount = (subtotal * discPercent) / 100;
    }
    const discountedSubtotal = subtotal - discountAmount;

    // Compute GST based on discounted items
    const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;
    let gstAmount = 0;
    const isInclusiveGst = isGst && (customerType === "School" || customerType === "Retail");

    // Track revenue-adjusted totals
    let revenueSubtotal = 0;
    let revenueGstAmount = 0;

    invoiceItems.forEach((item) => {
      if (isGst) {
        const itemSubtotal = item.price * item.qty;
        const discountedItemSubtotal = itemSubtotal * discountRatio;
        if (isInclusiveGst) {
          const itemGst = discountedItemSubtotal - (discountedItemSubtotal / (1 + (item.gstRate || 0) / 100));
          gstAmount += itemGst;
          if (!item.excludeFromRevenue) {
            revenueGstAmount += itemGst;
          }
        } else {
          const itemGst = (discountedItemSubtotal * item.gstRate) / 100;
          gstAmount += itemGst;
          if (!item.excludeFromRevenue) {
            revenueGstAmount += itemGst;
          }
        }
      }
      if (!item.excludeFromRevenue) {
        revenueSubtotal += item.price * item.qty;
      }
    });

    const newItemsTotal = isInclusiveGst ? discountedSubtotal : (discountedSubtotal + gstAmount);

    const revenueDiscountAmount = (revenueSubtotal * discPercent) / 100;
    const revenueDiscountedSubtotal = revenueSubtotal - revenueDiscountAmount;
    const revenueNewItemsTotal = isInclusiveGst ? revenueDiscountedSubtotal : (revenueDiscountedSubtotal + revenueGstAmount);

    // Determine CGST, SGST, IGST tax split based on interstate rules
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let isInterstate = false;

    if (isGst && gstAmount > 0) {
      if (customerPhone && customerPhone !== "N/A") {
        const customer = await Customer.findOne({ tenantId, phone: customerPhone });
        if (customer) {
          const customerGst = customer.gstNumber || "";
          const customerState = customer.state || "";
          if (customerGst && customerGst.trim().length >= 2 && tenantGst.trim().length >= 2) {
            isInterstate = customerGst.trim().substring(0, 2) !== tenantGst.trim().substring(0, 2);
          } else if (customerState && tenantState) {
            isInterstate = customerState.trim().toLowerCase() !== tenantState.trim().toLowerCase();
          }
        }
      }
      if (isInterstate) {
        igst = gstAmount;
      } else {
        cgst = gstAmount / 2;
        sgst = gstAmount / 2;
      }
    }

    let revenueCgst = 0;
    let revenueSgst = 0;
    let revenueIgst = 0;
    if (isGst && revenueGstAmount > 0) {
      if (isInterstate) {
        revenueIgst = revenueGstAmount;
      } else {
        revenueCgst = revenueGstAmount / 2;
        revenueSgst = revenueGstAmount / 2;
      }
    }

    // 3. Process Returns/Exchanges if present (and not a quotation)
    let processedReturnedItems = [];
    let returnedTotal = 0;
    let revenueReturnedTotal = 0;

    // Generate Unique Invoice ID for Tenant
    const year = new Date().getFullYear();
    const invoiceCount = await Invoice.countDocuments({ tenantId });
    const invoiceNumberStr = String(invoiceCount + 1).padStart(4, "0");
    const invoiceId = `INV-${year}-${invoiceNumberStr}`;

    if (!isQuotation && returnedItems && returnedItems.length > 0) {
      for (const retItem of returnedItems) {
        const origInvoice = await Invoice.findOne({ tenantId, invoiceId: retItem.originalInvoiceId });
        if (!origInvoice) {
          return res.status(404).json({ message: `Original invoice '${retItem.originalInvoiceId}' not found.` });
        }
        
        // Find the item in the original invoice
        const origItem = origInvoice.items.find(oi => {
          if (retItem.productId) {
            return oi.productId && oi.productId.toString() === retItem.productId.toString();
          } else {
            return !oi.productId && oi.name === retItem.name;
          }
        });

        if (!origItem) {
          return res.status(404).json({ message: `Item '${retItem.name}' not found on invoice '${retItem.originalInvoiceId}'.` });
        }

        const alreadyReturned = origItem.returnedQty || 0;
        const remainingReturnable = origItem.qty - alreadyReturned;
        if (retItem.qty > remainingReturnable) {
          return res.status(400).json({
            message: `Cannot return ${retItem.qty} of '${retItem.name}'. Only ${remainingReturnable} remaining returnable from invoice '${retItem.originalInvoiceId}'.`
          });
        }

        // Update returnedQty on the original invoice
        origItem.returnedQty = alreadyReturned + retItem.qty;
        await origInvoice.save();

        // Regenerate the original invoice PDF to reflect returns
        try {
          const tenantUserDoc = await User.findById(tenantId);
          const origPdfFilename = `${tenantId}_${origInvoice.invoiceId}.pdf`;
          const origAbsolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", origPdfFilename);
          await generateInvoicePDF(origInvoice, tenantUserDoc, origAbsolutePdfPath);
        } catch (pdfErr) {
          console.error("Failed to regenerate original invoice PDF after return:", pdfErr.message);
        }

        // Adjust stock (returns go to nonGstStock or gstStock based on original billing)
        if (retItem.isDefective) {
          await DamagedStock.create({
            tenantId,
            productId: retItem.productId || null, // Allow null for custom/manual items
            name: retItem.name,
            sku: retItem.sku || "MANUAL",
            qty: retItem.qty,
            returnInvoiceId: retItem.originalInvoiceId,
          });
        } else {
          if (retItem.productId) {
            const product = await Product.findOne({ _id: retItem.productId, tenantId });
            if (product) {
              if (origInvoice.isGstBilling !== false) {
                product.gstStock = (product.gstStock || 0) + retItem.qty;
              } else {
                product.nonGstStock = (product.nonGstStock || 0) + retItem.qty;
              }
              product.stock = (product.gstStock || 0) + (product.nonGstStock || 0);
              await product.save();
            }
          }
        }

        const retVal = (retItem.price * retItem.qty) * (1 + (retItem.gstRate || 0) / 100);
        returnedTotal += retVal;
        if (!origItem.excludeFromRevenue) {
          revenueReturnedTotal += retVal;
        }

        processedReturnedItems.push({
          productId: retItem.productId || null,
          name: retItem.name,
          qty: retItem.qty,
          price: retItem.price,
          originalInvoiceId: retItem.originalInvoiceId,
          isDefective: !!retItem.isDefective,
        });
      }
    }

    // Final Net Total
    const netTotal = newItemsTotal - returnedTotal;
    const revenueTotal = Math.max(0, revenueNewItemsTotal - revenueReturnedTotal);

    // Determine Paid Amount and Outstanding
    let paidAmount = 0;
    let outstandingAmount = 0;
    let savedCashAmount = 0.0;
    let savedUpiAmount = 0.0;

    if (paymentMethod === "Credit") {
      paidAmount = parseFloat(amountPaid) || 0.0;
      outstandingAmount = Math.max(0, revenueTotal - paidAmount);
    } else if (paymentMethod === "Split") {
      savedCashAmount = parseFloat(cashAmount) || 0.0;
      savedUpiAmount = parseFloat(upiAmount) || 0.0;
      paidAmount = savedCashAmount + savedUpiAmount;
      outstandingAmount = Math.max(0, revenueTotal - paidAmount);
    } else {
      paidAmount = netTotal;
      outstandingAmount = 0.0;
    }

    const revenuePaidAmount = Math.min(paidAmount, revenueTotal);

    // 4. Deduct Stock Levels for new purchases (only if not a quotation)
    if (!isQuotation) {
      for (const checked of checkedItems) {
        if ((checked.product.gstStock === undefined || checked.product.gstStock === null || checked.product.gstStock === 0) &&
            (checked.product.nonGstStock === undefined || checked.product.nonGstStock === null || checked.product.nonGstStock === 0) &&
            checked.product.stock !== 0) {
          checked.product.gstStock = checked.product.stock;
          checked.product.nonGstStock = 0;
        }

        let qtyToDeduct = checked.qty;
        if (isGst) {
          const availGst = checked.product.gstStock || 0;
          if (availGst >= qtyToDeduct) {
            checked.product.gstStock = availGst - qtyToDeduct;
          } else {
            checked.product.gstStock = 0;
            const remainder = qtyToDeduct - availGst;
            checked.product.nonGstStock = (checked.product.nonGstStock || 0) - remainder;
          }
        } else {
          const availNonGst = checked.product.nonGstStock || 0;
          if (availNonGst >= qtyToDeduct) {
            checked.product.nonGstStock = availNonGst - qtyToDeduct;
          } else {
            checked.product.nonGstStock = 0;
            const remainder = qtyToDeduct - availNonGst;
            checked.product.gstStock = (checked.product.gstStock || 0) - remainder;
          }
        }
        checked.product.stock = (checked.product.gstStock || 0) + (checked.product.nonGstStock || 0);
        await checked.product.save();
      }
    }

    // Create paths for PDF storage
    const pdfFilename = `${tenantId}_${invoiceId}.pdf`;
    const relativePdfPath = `/uploads/invoices/${pdfFilename}`;
    const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);

    // Create Invoice Document
    const invoice = new Invoice({
      tenantId,
      invoiceId,
      customerName: customerName || "Walk-in Customer",
      customerPhone: customerPhone || "N/A",
      customerType: customerType || "Retail",
      isGst,
      salesType,
      items: invoiceItems,
      taxableAmount: isGst ? (isInclusiveGst ? (discountedSubtotal - gstAmount) : discountedSubtotal) : 0.0,
      cgst,
      sgst,
      igst,
      subtotal,
      discountPercent: discPercent,
      discountAmount,
      gstAmount,
      total: netTotal,
      revenueTotal,
      revenueTaxableAmount: isGst ? (isInclusiveGst ? (revenueDiscountedSubtotal - revenueGstAmount) : revenueDiscountedSubtotal) : 0.0,
      revenueGstAmount,
      revenueCgst,
      revenueSgst,
      revenueIgst,
      paymentMethod: paymentMethod || "Cash",
      cashAmount: savedCashAmount,
      upiAmount: savedUpiAmount,
      status: isQuotation ? "Quotation" : "Paid",
      isQuotation: isQuotation || false,
      isGstBilling: isGstBilling !== undefined ? isGstBilling : true,
      pdfUrl: relativePdfPath,
      amountPaid: paidAmount,
      outstandingAmount: outstandingAmount,
      isReturnExchange: processedReturnedItems.length > 0,
      returnedItems: processedReturnedItems,
    });

    // Save invoice to DB
    const savedInvoice = await invoice.save();

    // 5. Generate & Save PDF file on Server disk (optional cached copy)
    try {
      await generateInvoicePDF(savedInvoice, tenantUser, absolutePdfPath);
    } catch (pdfErr) {
      console.error("Non-fatal error generating invoice PDF file during checkout:", pdfErr.message);
    }

    // 6. Record Customer Ledger and update Outstanding Balance if not a quotation
    if (!isQuotation && customerPhone && customerPhone !== "N/A") {
      const customer = await Customer.findOne({ tenantId, phone: customerPhone });
      if (customer) {
        // We define helper inline to perform ledger entries and update balance sequentially
        const postLedgerEntry = async (type, debit, credit, description) => {
          customer.outstandingBalance = (customer.outstandingBalance || 0) + (debit - credit);
          await customer.save();

          const entry = new CustomerLedger({
            tenantId,
            customerId: customer._id,
            invoiceId: savedInvoice.invoiceId,
            invoiceObjectId: savedInvoice._id,
            type,
            debit,
            credit,
            balance: customer.outstandingBalance,
            description,
          });
          await entry.save();
        };

        // Purchase entry
        if (revenueNewItemsTotal > 0) {
          await postLedgerEntry("Purchase", revenueNewItemsTotal, 0, `Purchase Invoice ${invoiceId}`);
        }
        // Return entry
        if (revenueReturnedTotal > 0) {
          await postLedgerEntry("Return", 0, revenueReturnedTotal, `Return Adjustment on Invoice ${invoiceId}`);
        }
        // Payment entry
        if (revenuePaidAmount > 0) {
          await postLedgerEntry("Payment", 0, revenuePaidAmount, `Payment received today on Invoice ${invoiceId}`);
        }
      }
    }

    res.status(201).json(savedInvoice);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error executing checkout", error: error.message });
  }
};

// @desc    Refund an invoice (restocks items)
// @route   PUT /api/billing/:id/refund
// @access  Private
const refundInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user._id });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    if (invoice.status === "Refunded") {
      return res.status(400).json({ message: "Invoice has already been refunded" });
    }

    // Mark invoice refunded
    invoice.status = "Refunded";

    // Restock the items back to inventory (only if not a quotation)
    if (!invoice.isQuotation) {
      for (const item of invoice.items) {
        if (item.isManualItem) {
          continue;
        }
        const product = await Product.findOne({ _id: item.productId, tenantId: req.user._id });
        if (product) {
          product.stock += item.qty;
          await product.save();
        }
      }
    }

    // Adjust customer outstanding balance if credit and has registered customer
    if (!invoice.isQuotation && invoice.customerPhone && invoice.customerPhone !== "N/A") {
      const customer = await Customer.findOne({ tenantId: req.user._id, phone: invoice.customerPhone });
      if (customer) {
        const refundCredit = invoice.outstandingAmount || 0;
        if (refundCredit > 0) {
          customer.outstandingBalance -= refundCredit;
          await customer.save();

          const ledgerEntry = new CustomerLedger({
            tenantId: req.user._id,
            customerId: customer._id,
            invoiceId: invoice.invoiceId,
            invoiceObjectId: invoice._id,
            type: "Refund",
            debit: 0,
            credit: refundCredit,
            balance: customer.outstandingBalance,
            description: `Refund / Reversal of Credit Invoice ${invoice.invoiceId}`,
          });
          await ledgerEntry.save();
        }
      }
    }

    // Re-generate the PDF file to reflect REFUNDED status overlay (optional cached copy)
    try {
      const tenantUser = await User.findById(req.user._id);
      const pdfFilename = `${req.user._id}_${invoice.invoiceId}.pdf`;
      const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);
      await generateInvoicePDF(invoice, tenantUser, absolutePdfPath);
    } catch (pdfErr) {
      console.error("Non-fatal error regenerating refund PDF file:", pdfErr.message);
    }

    const updatedInvoice = await invoice.save();
    res.json(updatedInvoice);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error processing refund", error: error.message });
  }
};

// @desc    Convert quotation to tax invoice (sale)
// @route   PUT /api/billing/:id/convert-quotation
// @access  Private
const convertQuotationToSale = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user._id });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    if (!invoice.isQuotation) {
      return res.status(400).json({ message: "This transaction is already a finalized Tax Invoice" });
    }

    // 1. Verify stock availability for all items in the quotation
    const checkedItems = [];
    for (const item of invoice.items) {
      if (item.isManualItem) {
        continue;
      }
      const product = await Product.findOne({ _id: item.productId, tenantId: req.user._id });
      if (!product) {
        return res.status(404).json({ message: `Product '${item.name}' not found in inventory` });
      }
      if (product.stock < item.qty) {
        return res.status(400).json({
          message: `Insufficient stock for product '${product.name}' to convert quotation. Available: ${product.stock}, Required: ${item.qty}`
        });
      }
      checkedItems.push({ product, qty: item.qty });
    }

    // 2. Deduct stock levels
    for (const checked of checkedItems) {
      checked.product.stock -= checked.qty;
      await checked.product.save();
    }

    // 3. Update status & flags
    invoice.isQuotation = false;
    invoice.status = "Paid";

    // 4. Regenerate & Save final PDF (optional cached copy)
    try {
      const tenantUser = await User.findById(req.user._id);
      const pdfFilename = `${req.user._id}_${invoice.invoiceId}.pdf`;
      const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);
      await generateInvoicePDF(invoice, tenantUser, absolutePdfPath);
    } catch (pdfErr) {
      console.error("Non-fatal error regenerating quotation conversion PDF file:", pdfErr.message);
    }

    const savedInvoice = await invoice.save();
    res.json(savedInvoice);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error converting quotation", error: error.message });
  }
};

// @desc    Stream dynamic PDF
// @route   GET /api/billing/:id/pdf
// @access  Private
const streamInvoicePDF = async (req, res) => {
  const { pageSize, orientation, download } = req.query;
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    const tenantUser = await User.findById(req.user._id);

    // Set PDF content headers to render inline in browser or download as attachment
    res.setHeader("Content-Type", "application/pdf");
    if (download === "true") {
      res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceId}.pdf"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceId}.pdf"`);
    }

    // Call PDF generator to pipe directly to response
    await generateInvoicePDF(invoice, tenantUser, res, { pageSize, orientation });

  } catch (error) {
    console.error("PDF Streaming Error:", error);
    res.status(500).json({ message: "Error rendering invoice PDF stream", error: error.message });
  }
};

// @desc    Settle Credit Invoice
// @route   PUT /api/billing/:id/settle
// @access  Private
const settleInvoice = async (req, res) => {
  const { settlementMethod, settlementDate, amount } = req.body;
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    if (invoice.paymentMethod !== "Credit") {
      return res.status(400).json({ message: "Only Credit invoices can be settled" });
    }

    if (!["Cash", "UPI", "Card"].includes(settlementMethod)) {
      return res.status(400).json({ message: "Invalid settlement method. Must be Cash, UPI, or Card." });
    }

    const payVal = parseFloat(amount);
    if (isNaN(payVal) || payVal <= 0) {
      return res.status(400).json({ message: "Invalid settlement payment amount." });
    }

    if (payVal > invoice.outstandingAmount) {
      return res.status(400).json({
        message: `Settlement amount (₹${payVal.toFixed(2)}) exceeds the current outstanding amount (₹${invoice.outstandingAmount.toFixed(2)}).`
      });
    }

    // Update invoice paid and outstanding amounts
    invoice.amountPaid = (invoice.amountPaid || 0) + payVal;
    invoice.outstandingAmount = Math.max(0, invoice.outstandingAmount - payVal);

    // If outstanding is cleared, set creditSettled to true
    if (invoice.outstandingAmount <= 0) {
      invoice.creditSettled = true;
    }
    invoice.settlementDate = settlementDate ? new Date(settlementDate) : new Date();
    invoice.settlementMethod = settlementMethod;

    const savedInvoice = await invoice.save();

    // Regenerate invoice PDF with updated outstanding/paid values
    const tenantUser = await User.findById(req.user._id);
    try {
      const pdfFilename = `${req.user._id}_${invoice.invoiceId}.pdf`;
      const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);
      await generateInvoicePDF(invoice, tenantUser, absolutePdfPath);
    } catch (pdfErr) {
      console.error("Failed to regenerate invoice PDF during settlement:", pdfErr.message);
    }

    // Update customer outstanding balance and post ledger entry
    if (invoice.customerPhone && invoice.customerPhone !== "N/A") {
      const customer = await Customer.findOne({ tenantId: req.user._id, phone: invoice.customerPhone });
      if (customer) {
        customer.outstandingBalance = (customer.outstandingBalance || 0) - payVal;
        await customer.save();

        const ledgerEntry = new CustomerLedger({
          tenantId: req.user._id,
          customerId: customer._id,
          invoiceId: invoice.invoiceId,
          invoiceObjectId: invoice._id,
          type: "Payment",
          debit: 0,
          credit: payVal,
          balance: customer.outstandingBalance,
          description: `Credit Payment Settlement for Invoice ${invoice.invoiceId} via ${settlementMethod}`,
        });
        await ledgerEntry.save();
      }
    }

    res.status(200).json(savedInvoice);
  } catch (error) {
    console.error("Invoice Settlement Error:", error);
    res.status(500).json({ message: "Failed to settle credit invoice", error: error.message });
  }
};

// @desc    Reset all business transactional data
// @route   POST /api/billing/reset-business-data
// @access  Private (Super Admin / Business Owner only)
const resetBusinessData = async (req, res) => {
  const mongoose = require("mongoose");
  try {
    const tenantId = req.user._id;

    // 1. Create a complete database backup automatically
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(__dirname, "..", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFilePath = path.join(backupDir, `backup_${timestamp}.json`);

    // Fetch all documents from all relevant collections
    const collectionsToBackup = ["users", "products", "customers", "invoices"];
    const backupData = {
      timestamp: new Date(),
      tenantId: tenantId,
      ownerEmail: req.user.email,
      collections: {}
    };

    for (const colName of collectionsToBackup) {
      const documents = await mongoose.connection.db.collection(colName).find({}).toArray();
      backupData.collections[colName] = documents;
    }

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf-8");
    console.log(`Database backup saved successfully at: ${backupFilePath}`);

    // 2. Log the reset event with timestamp and Business Owner information (System audit log)
    const logDir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, "reset_audit.log");
    const logEntry = `[${new Date().toISOString()}] RESET BUSINESS DATA - Owner: ${req.user.ownerName} (${req.user.email}), Shop: ${req.user.profile?.shopName || req.user.businessName}, TenantID: ${tenantId}. Backup saved to: ${backupFilePath}\n`;
    fs.appendFileSync(logFilePath, logEntry, "utf-8");

    // 3. Delete all related MongoDB transactional collections safely for this tenant
    // Use MongoDB transaction where applicable (with sequential fallback)
    let deletedCount = 0;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      
      const deleteResult = await Invoice.deleteMany({ tenantId }, { session });
      deletedCount = deleteResult.deletedCount;

      await session.commitTransaction();
    } catch (transactionError) {
      await session.abortTransaction();
      console.warn("MongoDB Transaction failed or not supported, falling back to sequential delete:", transactionError.message);
      
      const deleteResult = await Invoice.deleteMany({ tenantId });
      deletedCount = deleteResult.deletedCount;
    } finally {
      session.endSession();
    }

    // 4. Delete the stored invoice PDFs on disk for this tenant
    const invoicesUploadDir = path.join(__dirname, "..", "uploads", "invoices");
    if (fs.existsSync(invoicesUploadDir)) {
      const files = fs.readdirSync(invoicesUploadDir);
      const prefix = `${tenantId}_`;
      let pdfDeletedCount = 0;
      files.forEach((file) => {
        if (file.startsWith(prefix) && file.endsWith(".pdf")) {
          try {
            fs.unlinkSync(path.join(invoicesUploadDir, file));
            pdfDeletedCount++;
          } catch (err) {
            console.error(`Failed to delete invoice PDF: ${file}`, err);
          }
        }
      });
      console.log(`Deleted ${pdfDeletedCount} invoice PDF files on disk.`);
    }

    res.json({
      success: true,
      message: "Business transactional data has been successfully reset.",
      invoicesDeleted: deletedCount,
      backupFile: `backup_${timestamp}.json`
    });

  } catch (error) {
    console.error("Error resetting business data:", error);
    res.status(500).json({
      message: "Server error resetting business data",
      error: error.message
    });
  }
};

// @desc    Lookup invoice for return/exchange validation
// @route   GET /api/billing/lookup-invoice
// @access  Private
const lookupInvoice = async (req, res) => {
  const { query } = req.query; // query can be invoiceId, customerName, or customerPhone
  if (!query) {
    return res.status(400).json({ message: "Please provide a search query" });
  }

  try {
    const tenantId = req.user._id;

    // Sanitise the search query: replace spaces/hyphens with a placeholder, escape regex specials, then set flexible pattern
    const formatted = query.replace(/[\s-]+/g, "__SPACE_OR_HYPHEN__");
    const escaped = formatted.replace(/[\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const flexibleQuery = escaped.replace(/__SPACE_OR_HYPHEN__/g, "[\\s-]+");

    const invoices = await Invoice.find({
      tenantId,
      isQuotation: { $ne: true },
      $or: [
        { invoiceId: { $regex: flexibleQuery, $options: "i" } },
        { customerName: { $regex: flexibleQuery, $options: "i" } },
        { customerPhone: { $regex: flexibleQuery, $options: "i" } },
      ],
    }).sort({ date: -1 });

    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error searching invoices for return", error: error.message });
  }
};

// @desc    Get pending credit invoices for a customer
// @route   GET /api/billing/customer/:phone/pending
// @access  Private
const getPendingCreditInvoices = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { phone } = req.params;

    const invoices = await Invoice.find({
      tenantId,
      customerPhone: phone,
      paymentMethod: "Credit",
      outstandingAmount: { $gt: 0 },
      isQuotation: { $ne: true },
      status: { $ne: "Refunded" },
    }).sort({ date: 1 }); // oldest first

    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching pending credit invoices" });
  }
};

// @desc    Record a credit payment collection
// @route   POST /api/billing/collection
// @access  Private
const recordCollection = async (req, res) => {
  const { customerPhone, amountPaid, paymentMethod, notes, invoiceId } = req.body;

  if (!customerPhone || !amountPaid || amountPaid <= 0) {
    return res.status(400).json({ message: "Invalid payment details" });
  }

  try {
    const tenantId = req.user._id;
    const customer = await Customer.findOne({ tenantId, phone: customerPhone });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const payVal = parseFloat(amountPaid);
    let remainingPayment = payVal;

    // Find pending invoices
    let queryObj = {
      tenantId,
      customerPhone,
      paymentMethod: "Credit",
      outstandingAmount: { $gt: 0 },
      status: { $ne: "Refunded" },
      isQuotation: { $ne: true },
    };

    if (invoiceId) {
      queryObj.invoiceId = invoiceId;
    }

    const pendingInvoices = await Invoice.find(queryObj).sort({ date: 1 });

    const tenantUser = await User.findById(tenantId);

    // Apply payment in FIFO order or to specific invoice
    for (const inv of pendingInvoices) {
      if (remainingPayment <= 0) break;

      const outstanding = inv.outstandingAmount;
      if (remainingPayment >= outstanding) {
        inv.amountPaid += outstanding;
        inv.outstandingAmount = 0;
        inv.creditSettled = true;
        inv.settlementDate = new Date();
        inv.settlementMethod = ["Cash", "UPI", "Card"].includes(paymentMethod) ? paymentMethod : "Cash";
        remainingPayment -= outstanding;
      } else {
        inv.amountPaid += remainingPayment;
        inv.outstandingAmount = outstanding - remainingPayment;
        remainingPayment = 0;
      }

      await inv.save();

      // Regenerate the invoice PDF to show updated settlement status/outstanding
      try {
        const pdfFilename = `${tenantId}_${inv.invoiceId}.pdf`;
        const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);
        await generateInvoicePDF(inv, tenantUser, absolutePdfPath);
      } catch (pdfErr) {
        console.error("Failed to regenerate invoice PDF during collection:", pdfErr.message);
      }
    }

    // Update customer outstanding balance
    customer.outstandingBalance -= payVal;
    await customer.save();

    // Create payment ledger entry
    const ledgerEntry = new CustomerLedger({
      tenantId,
      customerId: customer._id,
      invoiceId: invoiceId || "COLL-PAY",
      type: "Payment",
      debit: 0,
      credit: payVal,
      balance: customer.outstandingBalance,
      description: notes || `Credit Payment Collection via ${paymentMethod} (General Account Payment)`,
    });
    const savedLedger = await ledgerEntry.save();

    res.json({
      success: true,
      message: "Payment collection recorded successfully",
      ledgerEntry: savedLedger,
      updatedBalance: customer.outstandingBalance,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error recording payment collection", error: error.message });
  }
};

// @desc    Get credit invoices overdue by more than 20 days
// @route   GET /api/billing/credit-reminders
// @access  Private
const getCreditReminders = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 20);

    const overdueInvoices = await Invoice.find({
      tenantId,
      paymentMethod: "Credit",
      outstandingAmount: { $gt: 0 },
      status: { $ne: "Refunded" },
      isQuotation: { $ne: true },
      date: { $lte: thresholdDate },
    }).sort({ date: 1 }); // Oldest first

    const reminders = overdueInvoices.map(inv => {
      const daysElapsed = Math.floor((Date.now() - new Date(inv.date)) / (1000 * 60 * 60 * 24));
      return {
        _id: inv._id,
        invoiceId: inv.invoiceId,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        total: inv.total,
        amountPaid: inv.amountPaid,
        outstandingAmount: inv.outstandingAmount,
        date: inv.date,
        daysElapsed,
      };
    });

    res.json(reminders);
  } catch (error) {
    console.error("Error in getCreditReminders:", error);
    res.status(500).json({ message: "Server error fetching credit reminders", error: error.message });
  }
};

// @desc    Update invoice payment method and details after creation
// @route   PUT /api/billing/:id/payment-method
// @access  Private
const updateInvoicePaymentMethod = async (req, res) => {
  const { paymentMethod, cashAmount, upiAmount, amountPaid } = req.body;
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    if (invoice.status === "Refunded") {
      return res.status(400).json({ message: "Cannot update payment method for a refunded invoice" });
    }

    const oldPaidAmount = invoice.amountPaid || 0.0;
    const oldPaymentMethod = invoice.paymentMethod;

    // Validate paymentMethod
    const validMethods = ["Cash", "UPI", "Card", "Credit", "Split"];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    let newPaidAmount = 0.0;
    let newCashAmount = 0.0;
    let newUpiAmount = 0.0;

    if (paymentMethod === "Credit") {
      newPaidAmount = parseFloat(amountPaid) || 0.0;
    } else if (paymentMethod === "Split") {
      newCashAmount = parseFloat(cashAmount) || 0.0;
      newUpiAmount = parseFloat(upiAmount) || 0.0;
      newPaidAmount = newCashAmount + newUpiAmount;
    } else {
      // Cash, UPI, Card are fully paid
      newPaidAmount = invoice.total;
    }

    const newOutstandingAmount = Math.max(0, invoice.total - newPaidAmount);

    // Update invoice fields
    invoice.paymentMethod = paymentMethod;
    invoice.cashAmount = newCashAmount;
    invoice.upiAmount = newUpiAmount;
    invoice.amountPaid = newPaidAmount;
    invoice.outstandingAmount = newOutstandingAmount;

    // If it was a credit bill and is now fully paid (by cash/upi/split), or outstanding is 0
    if (paymentMethod !== "Credit" || newOutstandingAmount <= 0) {
      invoice.creditSettled = true;
      invoice.settlementDate = new Date();
      invoice.settlementMethod = paymentMethod === "Split" ? "UPI" : (["Cash", "UPI", "Card"].includes(paymentMethod) ? paymentMethod : "Cash");
    } else {
      // If it's credit and has outstanding, it's not settled
      invoice.creditSettled = false;
      invoice.settlementDate = undefined;
      invoice.settlementMethod = undefined;
    }

    // Save invoice to DB
    const savedInvoice = await invoice.save();

    // Re-generate the invoice PDF file to show updated payment method & amounts
    const tenantUser = await User.findById(req.user._id);
    try {
      const pdfFilename = `${req.user._id}_${invoice.invoiceId}.pdf`;
      const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);
      await generateInvoicePDF(invoice, tenantUser, absolutePdfPath);
    } catch (pdfErr) {
      console.error("Failed to regenerate invoice PDF during payment method update:", pdfErr.message);
    }

    // Adjust customer ledger and outstanding balance if customer exists
    if (invoice.customerPhone && invoice.customerPhone !== "N/A") {
      const customer = await Customer.findOne({ tenantId: req.user._id, phone: invoice.customerPhone });
      if (customer) {
        // Revert old Payment ledger entries for this invoice
        const paymentEntries = await CustomerLedger.find({
          tenantId: req.user._id,
          customerId: customer._id,
          invoiceObjectId: invoice._id,
          type: "Payment"
        });

        const totalOldPaymentCredit = paymentEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);

        await CustomerLedger.deleteMany({
          tenantId: req.user._id,
          customerId: customer._id,
          invoiceObjectId: invoice._id,
          type: "Payment"
        });

        // Revert the old payment credit, and apply new payment credit
        customer.outstandingBalance = customer.outstandingBalance + totalOldPaymentCredit - newPaidAmount;
        await customer.save();

        // Create new Payment ledger entry if newPaidAmount > 0
        if (newPaidAmount > 0) {
          const newEntry = new CustomerLedger({
            tenantId: req.user._id,
            customerId: customer._id,
            invoiceId: invoice.invoiceId,
            invoiceObjectId: invoice._id,
            type: "Payment",
            debit: 0,
            credit: newPaidAmount,
            balance: customer.outstandingBalance,
            description: `Payment details updated: ${paymentMethod} (Paid: ₹${newPaidAmount.toFixed(2)})`
          });
          await newEntry.save();
        }
      }
    }

    res.json(savedInvoice);

  } catch (error) {
    console.error("Error updating payment method:", error);
    res.status(500).json({ message: "Server error updating payment method", error: error.message });
  }
};

// @desc    Update an existing invoice (modify items/exchange)
// @route   PUT /api/billing/:id
// @access  Private
const updateInvoice = async (req, res) => {
  const { 
    customerName, 
    customerPhone, 
    customerType, 
    items, 
    discountType, 
    discountValue, 
    discountPercent, 
    paymentMethod, 
    isQuotation, 
    isGstBilling,
    amountPaid,
    returnedItems,
    cashAmount,
    upiAmount
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "No items provided in cart" });
  }

  try {
    const tenantId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    // Fetch tenant settings for GST billing rules and state info
    const tenantUser = await User.findById(tenantId);
    const billingRule = tenantUser?.gstBillingRule || "warn";
    const tenantGst = tenantUser?.profile?.gstNumber || "";
    const tenantState = tenantUser?.profile?.state || "";

    const isGst = isGstBilling !== undefined ? (isGstBilling === true || isGstBilling === 'true') : invoice.isGst;

    // 1. Temporarily revert stock level for the original items (using old invoice GST setting)
    if (!invoice.isQuotation) {
      for (const origItem of invoice.items) {
        if (origItem.isManualItem || !origItem.productId) continue;
        const product = await Product.findOne({ _id: origItem.productId, tenantId });
        if (product) {
          if (invoice.isGstBilling !== false) {
            product.gstStock = (product.gstStock || 0) + origItem.qty;
          } else {
            product.nonGstStock = (product.nonGstStock || 0) + origItem.qty;
          }
          product.stock = (product.gstStock || 0) + (product.nonGstStock || 0);
          await product.save();
        }
      }
    }

    // 2. Verify stock availability for the new cart items
    const checkedItems = [];
    const productsMap = {};
    for (const cartItem of items) {
      if (cartItem.isManualItem) {
        continue;
      }
      const pId = cartItem.id || cartItem.productId;
      const product = await Product.findOne({ _id: pId, tenantId });
      if (!product) {
        // Revert back original stock levels if a product is missing
        if (!invoice.isQuotation) {
          for (const origItem of invoice.items) {
            if (origItem.isManualItem || !origItem.productId) continue;
            const origProd = await Product.findOne({ _id: origItem.productId, tenantId });
            if (origProd) {
              if (invoice.isGstBilling !== false) {
                origProd.gstStock = Math.max(0, (origProd.gstStock || 0) - origItem.qty);
              } else {
                origProd.nonGstStock = Math.max(0, (origProd.nonGstStock || 0) - origItem.qty);
              }
              origProd.stock = (origProd.gstStock || 0) + (origProd.nonGstStock || 0);
              await origProd.save();
            }
          }
        }
        return res.status(404).json({ message: `Product '${cartItem.name}' not found in inventory` });
      }

      if (!isQuotation) {
        // Safe split stock initialization
        if ((product.gstStock === undefined || product.gstStock === null || product.gstStock === 0) &&
            (product.nonGstStock === undefined || product.nonGstStock === null || product.nonGstStock === 0) &&
            product.stock !== 0) {
          product.gstStock = product.stock;
          product.nonGstStock = 0;
        }

        const requiredStock = cartItem.qty;
        const availableStock = product.stock || 0;
        if (availableStock < requiredStock && billingRule === "prevent") {
          // Revert back original stock levels if stock is insufficient
          if (!invoice.isQuotation) {
            for (const origItem of invoice.items) {
              if (origItem.isManualItem || !origItem.productId) continue;
              const origProd = await Product.findOne({ _id: origItem.productId, tenantId });
              if (origProd) {
                if (invoice.isGstBilling !== false) {
                  origProd.gstStock = Math.max(0, (origProd.gstStock || 0) - origItem.qty);
                } else {
                  origProd.nonGstStock = Math.max(0, (origProd.nonGstStock || 0) - origItem.qty);
                }
                origProd.stock = (origProd.gstStock || 0) + (origProd.nonGstStock || 0);
                await origProd.save();
              }
            }
          }
          return res.status(400).json({
            message: `Insufficient stock for product '${product.name}'. Required: ${requiredStock}, Available: ${availableStock}`
          });
        }
      }
      checkedItems.push({ product, qty: cartItem.qty });
      productsMap[pId] = product;
    }

    // 3. Compute Invoice Totals
    let subtotal = 0;
    const invoiceItems = [];

    items.forEach((item) => {
      const itemSubtotal = item.price * item.qty;
      subtotal += itemSubtotal;

      if (item.isManualItem) {
        invoiceItems.push({
          productId: null,
          name: item.name,
          price: item.price,
          purchasePrice: 0,
          priceCategoryUsed: "manual",
          qty: item.qty,
          gstRate: item.gstRate || 0,
          sku: "MANUAL",
          isManualItem: true,
          excludeFromRevenue: !!item.excludeFromRevenue,
          hsnCode: item.hsnCode || "",
        });
      } else {
        const pId = item.id || item.productId;
        const productDoc = productsMap[pId];
        const purchasePrice = productDoc && productDoc.prices ? (productDoc.prices.get("purchase") || 0) : 0;
        const hsnCode = productDoc ? productDoc.hsnCode : "";
        invoiceItems.push({
          productId: pId,
          name: item.name,
          price: item.price,
          purchasePrice: purchasePrice,
          priceCategoryUsed: item.priceCategoryUsed || "retail",
          qty: item.qty,
          gstRate: item.gstRate || 0,
          sku: item.sku,
          isManualItem: false,
          excludeFromRevenue: false,
          hsnCode: hsnCode || "",
        });
      }
    });

    let discountAmount = 0;
    let discPercent = 0;

    if (discountType === "fixed") {
      discountAmount = Math.min(parseFloat(discountValue) || 0, subtotal);
      discPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    } else {
      discPercent = parseFloat(discountValue !== undefined ? discountValue : discountPercent) || 0;
      discountAmount = (subtotal * discPercent) / 100;
    }
    const discountedSubtotal = subtotal - discountAmount;

    // Compute GST
    const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;
    let gstAmount = 0;
    const finalCustomerType = customerType !== undefined ? customerType : invoice.customerType;
    const isInclusiveGst = isGst && (finalCustomerType === "School" || finalCustomerType === "Retail");

    // Track revenue-adjusted totals
    let revenueSubtotal = 0;
    let revenueGstAmount = 0;

    invoiceItems.forEach((item) => {
      if (isGst) {
        const itemSubtotal = item.price * item.qty;
        const discountedItemSubtotal = itemSubtotal * discountRatio;
        if (isInclusiveGst) {
          const itemGst = discountedItemSubtotal - (discountedItemSubtotal / (1 + (item.gstRate || 0) / 100));
          gstAmount += itemGst;
          if (!item.excludeFromRevenue) {
            revenueGstAmount += itemGst;
          }
        } else {
          const itemGst = (discountedItemSubtotal * item.gstRate) / 100;
          gstAmount += itemGst;
          if (!item.excludeFromRevenue) {
            revenueGstAmount += itemGst;
          }
        }
      }
      if (!item.excludeFromRevenue) {
        revenueSubtotal += item.price * item.qty;
      }
    });

    const newItemsTotal = isInclusiveGst ? discountedSubtotal : (discountedSubtotal + gstAmount);
    const netTotal = newItemsTotal;

    const revenueDiscountAmount = (revenueSubtotal * discPercent) / 100;
    const revenueDiscountedSubtotal = revenueSubtotal - revenueDiscountAmount;
    const revenueNewItemsTotal = isInclusiveGst ? revenueDiscountedSubtotal : (revenueDiscountedSubtotal + revenueGstAmount);
    const revenueTotal = Math.max(0, revenueNewItemsTotal);

    // Determine CGST, SGST, IGST tax split based on interstate rules
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isGst && gstAmount > 0) {
      let isInterstate = false;
      const finalCustomerPhone = customerPhone !== undefined ? customerPhone : invoice.customerPhone;
      if (finalCustomerPhone && finalCustomerPhone !== "N/A") {
        const customer = await Customer.findOne({ tenantId, phone: finalCustomerPhone });
        if (customer) {
          const customerGst = customer.gstNumber || "";
          const customerState = customer.state || "";
          if (customerGst && customerGst.trim().length >= 2 && tenantGst.trim().length >= 2) {
            isInterstate = customerGst.trim().substring(0, 2) !== tenantGst.trim().substring(0, 2);
          } else if (customerState && tenantState) {
            isInterstate = customerState.trim().toLowerCase() !== tenantState.trim().toLowerCase();
          }
        }
      }
      if (isInterstate) {
        igst = gstAmount;
      } else {
        cgst = gstAmount / 2;
        sgst = gstAmount / 2;
      }
    }

    // 4. Deduct Stock Levels for new purchases
    if (!isQuotation) {
      for (const checked of checkedItems) {
        if ((checked.product.gstStock === undefined || checked.product.gstStock === null || checked.product.gstStock === 0) &&
            (checked.product.nonGstStock === undefined || checked.product.nonGstStock === null || checked.product.nonGstStock === 0) &&
            checked.product.stock !== 0) {
          checked.product.gstStock = checked.product.stock;
          checked.product.nonGstStock = 0;
        }

        let qtyToDeduct = checked.qty;
        if (isGst) {
          const availGst = checked.product.gstStock || 0;
          if (availGst >= qtyToDeduct) {
            checked.product.gstStock = availGst - qtyToDeduct;
          } else {
            checked.product.gstStock = 0;
            const remainder = qtyToDeduct - availGst;
            checked.product.nonGstStock = (checked.product.nonGstStock || 0) - remainder;
          }
        } else {
          const availNonGst = checked.product.nonGstStock || 0;
          if (availNonGst >= qtyToDeduct) {
            checked.product.nonGstStock = availNonGst - qtyToDeduct;
          } else {
            checked.product.nonGstStock = 0;
            const remainder = qtyToDeduct - availNonGst;
            checked.product.gstStock = (checked.product.gstStock || 0) - remainder;
          }
        }
        checked.product.stock = (checked.product.gstStock || 0) + (checked.product.nonGstStock || 0);
        await checked.product.save();
      }
    }

    // Determine Paid Amount and Outstanding
    let paidAmount = 0;
    let outstandingAmount = 0;
    let savedCashAmount = 0.0;
    let savedUpiAmount = 0.0;

    if (paymentMethod === "Credit") {
      paidAmount = parseFloat(amountPaid) || 0.0;
      outstandingAmount = Math.max(0, revenueTotal - paidAmount);
    } else if (paymentMethod === "Split") {
      savedCashAmount = parseFloat(cashAmount) || 0.0;
      savedUpiAmount = parseFloat(upiAmount) || 0.0;
      paidAmount = savedCashAmount + savedUpiAmount;
      outstandingAmount = Math.max(0, revenueTotal - paidAmount);
    } else if (paymentMethod === "Exchange") {
      paidAmount = 0.0;
      outstandingAmount = 0.0;
    } else {
      paidAmount = netTotal;
      outstandingAmount = 0.0;
    }

    const revenuePaidAmount = Math.min(paidAmount, revenueTotal);

    // 5. Revert and Update Customer Outstanding Balance and Ledger
    if (!isQuotation) {
      // Revert original invoice's effect on customer balance
      if (invoice.customerPhone && invoice.customerPhone !== "N/A") {
        const origCustomer = await Customer.findOne({ tenantId, phone: invoice.customerPhone });
        if (origCustomer) {
          origCustomer.outstandingBalance -= (invoice.outstandingAmount || 0);
          await origCustomer.save();
        }
      }

      // Apply new outstanding amount to current customer
      if (customerPhone && customerPhone !== "N/A") {
        const customer = await Customer.findOne({ tenantId, phone: customerPhone });
        if (customer) {
          customer.outstandingBalance += outstandingAmount;
          await customer.save();

          // Delete all old customer ledger entries associated with this invoice ID
          await CustomerLedger.deleteMany({ tenantId, customerId: customer._id, invoiceId: invoice.invoiceId });

          const postLedgerEntry = async (type, debit, credit, description) => {
            const entry = new CustomerLedger({
              tenantId,
              customerId: customer._id,
              invoiceId: invoice.invoiceId,
              invoiceObjectId: invoice._id,
              type,
              debit,
              credit,
              balance: customer.outstandingBalance,
              description,
            });
            await entry.save();
          };

          // Purchase entry
          if (revenueNewItemsTotal > 0) {
            await postLedgerEntry("Purchase", revenueNewItemsTotal, 0, `Purchase Invoice ${invoice.invoiceId} (Updated)`);
          }
          // Payment entry
          if (revenuePaidAmount > 0) {
            await postLedgerEntry("Payment", 0, revenuePaidAmount, `Payment received on Invoice ${invoice.invoiceId} (Updated)`);
          }
        }
      }
    }

    // Update Invoice Fields
    invoice.customerName = customerName || "Walk-in Customer";
    invoice.customerPhone = customerPhone || "N/A";
    invoice.customerType = customerType || "Retail";
    invoice.isGst = isGst;
    invoice.salesType = isGst ? "GST" : "Non-GST";
    invoice.taxableAmount = isGst ? (isInclusiveGst ? (discountedSubtotal - gstAmount) : discountedSubtotal) : 0.0;
    invoice.cgst = cgst;
    invoice.sgst = sgst;
    invoice.igst = igst;
    invoice.items = invoiceItems;
    invoice.subtotal = subtotal;
    invoice.discountPercent = discPercent;
    invoice.discountAmount = discountAmount;
    invoice.gstAmount = gstAmount;
    invoice.total = netTotal;
    invoice.revenueTotal = revenueTotal;
    invoice.revenueTaxableAmount = isGst ? (isInclusiveGst ? (revenueDiscountedSubtotal - revenueGstAmount) : revenueDiscountedSubtotal) : 0.0;
    invoice.revenueGstAmount = revenueGstAmount;
    invoice.revenueCgst = revenueCgst;
    invoice.revenueSgst = revenueSgst;
    invoice.revenueIgst = revenueIgst;
    invoice.paymentMethod = paymentMethod || "Cash";
    invoice.cashAmount = savedCashAmount;
    invoice.upiAmount = savedUpiAmount;
    invoice.amountPaid = paidAmount;
    invoice.outstandingAmount = outstandingAmount;
    invoice.isGstBilling = isGstBilling !== undefined ? isGstBilling : true;

    // Save invoice changes to database
    const savedInvoice = await invoice.save();

    // 6. Re-generate Invoice PDF file (optional cached copy)
    try {
      const pdfFilename = `${tenantId}_${invoice.invoiceId}.pdf`;
      const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);
      await generateInvoicePDF(savedInvoice, tenantUser, absolutePdfPath);
    } catch (pdfErr) {
      console.error("Non-fatal error regenerating invoice PDF file on update:", pdfErr.message);
    }

    res.json(savedInvoice);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error executing invoice update", error: error.message });
  }
};

// @desc    Delete an invoice (reverts stock adjustments and customer ledger/balance)
// @route   DELETE /api/billing/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    // 1. Restock items back to inventory (only if not a quotation)
    if (!invoice.isQuotation) {
      for (const item of invoice.items) {
        if (item.isManualItem) continue;
        const product = await Product.findOne({ _id: item.productId, tenantId: req.user._id });
        if (product) {
          if (invoice.isGstBilling !== false) {
            product.gstStock = (product.gstStock || 0) + item.qty;
          } else {
            product.nonGstStock = (product.nonGstStock || 0) + item.qty;
          }
          product.stock = (product.gstStock || 0) + (product.nonGstStock || 0);
          await product.save();
        }
      }
    }

    // 2. Adjust customer outstanding balance and delete customer ledger entries if credit/payment registered
    if (!invoice.isQuotation && invoice.customerPhone && invoice.customerPhone !== "N/A") {
      const customer = await Customer.findOne({ tenantId: req.user._id, phone: invoice.customerPhone });
      if (customer) {
        const netChange = invoice.outstandingAmount || 0;
        customer.outstandingBalance -= netChange;
        await customer.save();

        // Delete all ledger entries associated with this invoice ID
        await CustomerLedger.deleteMany({ tenantId: req.user._id, customerId: customer._id, invoiceId: invoice.invoiceId });
      }
    }

    // 3. Delete the PDF file on disk
    const pdfFilename = `${req.user._id}_${invoice.invoiceId}.pdf`;
    const absolutePdfPath = path.join(__dirname, "..", "uploads", "invoices", pdfFilename);
    if (fs.existsSync(absolutePdfPath)) {
      try {
        fs.unlinkSync(absolutePdfPath);
      } catch (err) {
        console.error(`Failed to delete invoice PDF file: ${pdfFilename}`, err);
      }
    }

    // 4. Delete the invoice from database
    await Invoice.deleteOne({ _id: invoice._id });

    res.json({ success: true, message: "Invoice deleted and stock/ledger reverted successfully" });
  } catch (error) {
    console.error("Delete Invoice Error:", error);
    res.status(500).json({ message: "Failed to delete invoice", error: error.message });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  updateInvoice,
  refundInvoice,
  convertQuotationToSale,
  streamInvoicePDF,
  settleInvoice,
  resetBusinessData,
  lookupInvoice,
  getPendingCreditInvoices,
  recordCollection,
  getCreditReminders,
  updateInvoicePaymentMethod,
  deleteInvoice,
};
