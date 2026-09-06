const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const CustomerRequestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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
    items: [
      {
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
      },
    ],
    advancePayment: {
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

CustomerRequestSchema.index({ organizationId: 1, requestNumber: 1 });
CustomerRequestSchema.index({ organizationId: 1, status: 1 });
CustomerRequestSchema.plugin(tenantPlugin);

module.exports = mongoose.model("CustomerRequest", CustomerRequestSchema);
