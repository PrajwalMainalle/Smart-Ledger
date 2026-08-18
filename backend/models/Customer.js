const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Ensure phone is unique PER tenant
CustomerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("Customer", CustomerSchema);
