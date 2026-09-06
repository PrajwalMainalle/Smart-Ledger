const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const CustomerSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    customerType: {
      type: String,
      enum: ["Retail", "Shop", "School", "Wholesale", "Dealer", "Distributor", "Other"],
      default: "Retail",
    },
    priceCategory: {
      type: String,
      required: true,
      default: "retail",
    },
    outstandingBalance: {
      type: Number,
      default: 0.0,
    },
    gstNumber: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    creditReminderDays: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

CustomerSchema.index({ organizationId: 1, phone: 1 });
CustomerSchema.plugin(tenantPlugin);

module.exports = mongoose.model("Customer", CustomerSchema);
