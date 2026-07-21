const mongoose = require("mongoose");

const CustomerRequestSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requestNumber: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    expectedPrice: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    requestDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Ordered from Supplier", "Stock Received", "Customer Collected", "Cancelled"],
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure fast queries and enforce request number uniqueness per tenant
CustomerRequestSchema.index({ tenantId: 1, requestNumber: 1 }, { unique: true });
CustomerRequestSchema.index({ tenantId: 1, status: 1 });
CustomerRequestSchema.index({ tenantId: 1, customerName: 1 });
CustomerRequestSchema.index({ tenantId: 1, itemName: 1 });

module.exports = mongoose.model("CustomerRequest", CustomerRequestSchema);
