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
    transport: {
      type: Number,
      default: 0.0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    items: [PurchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0.0, // Sum of price * qty
    },
    gstAmount: {
      type: Number,
      required: true,
      default: 0.0, // Total GST paid
    },
    total: {
      type: Number,
      required: true,
      default: 0.0, // subtotal + gstAmount
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Credit"],
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
