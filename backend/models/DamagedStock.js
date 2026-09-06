const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const DamagedStockSchema = new mongoose.Schema(
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
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      default: 0,
    },
    returnInvoiceId: {
      type: String,
      required: false,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

DamagedStockSchema.plugin(tenantPlugin);

module.exports = mongoose.model("DamagedStock", DamagedStockSchema);
