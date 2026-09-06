const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const ProductSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
      default: "Stationery",
    },
    price: {
      type: Number,
      required: true,
      default: 0.0,
    },
    prices: {
      type: Map,
      of: Number,
      default: {},
    },
    gstRate: {
      type: Number,
      required: true,
      default: 18, // standard GST rate
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    gstStock: {
      type: Number,
      default: 0,
    },
    nonGstStock: {
      type: Number,
      default: 0,
    },
    hsnCode: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

ProductSchema.index({ organizationId: 1, sku: 1 });
ProductSchema.plugin(tenantPlugin);

module.exports = mongoose.model("Product", ProductSchema);
