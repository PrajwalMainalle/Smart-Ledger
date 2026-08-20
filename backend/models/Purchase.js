const mongoose = require("mongoose");

const PurchaseItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  sku: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    default: 0.0, // base purchase price (before GST)
  },
  qty: {
    type: Number,
    required: true,
    default: 1,
  },
  gstRate: {
    type: Number,
    required: true,
    default: 18, // standard GST rate %
  },
  hsnCode: {
    type: String,
    default: "",
  },
  schDiscount: {
    type: Number,
    default: 0.0, // scheme discount %
  },
  splDiscount: {
    type: Number,
    default: 0.0, // special discount %
  },
  taxableAmount: {
    type: Number,
    default: 0.0, // taxable value after item discounts
  },
});

const PurchaseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    billNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierGst: {
      type: String,
      default: "",
      trim: true,
    },
    isGst: {
      type: Boolean,
      default: true,
    },
    purchaseSource: {
      type: String,
      enum: ["GST", "Non-GST"],
      default: "GST",
    },
    gstType: {
      type: String,
      enum: ["CGST+SGST", "IGST"],
      default: "CGST+SGST",
    },
    transport: {
      type: Number,
      default: 0.0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    items: [PurchaseItemSchema],
    taxableAmount: {
      type: Number,
      default: 0.0,
    },
    cgst: {
      type: Number,
      default: 0.0,
    },
    sgst: {
      type: Number,
      default: 0.0,
    },
    igst: {
      type: Number,
      default: 0.0,
    },
    discountAmount: {
      type: Number,
      default: 0.0, // Total item discount sum + any trade discounts
    },
    cashDiscountPercent: {
      type: Number,
      default: 0.0, // Cash Discount %
    },
    cashDiscountAmount: {
      type: Number,
      default: 0.0, // Cash Discount Amount
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0.0, // Sum of price * qty before discount
    },
    gstAmount: {
      type: Number,
      required: true,
      default: 0.0, // Total GST paid
    },
    total: {
      type: Number,
      required: true,
      default: 0.0, // subtotal - discountAmount - cashDiscountAmount + gstAmount + transport
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Cheque", "Credit"],
      default: "Cash",
    },
    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Paid",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prevent duplicate supplier invoice entry for the same tenant
PurchaseSchema.index({ tenantId: 1, supplierName: 1, billNumber: 1 }, { unique: true });

module.exports = mongoose.model("Purchase", PurchaseSchema);
