const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const CustomerLedgerSchema = new mongoose.Schema(
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    invoiceId: {
      type: String,
      required: false,
    },
    invoiceObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      enum: ["Purchase", "Payment", "Return", "Exchange", "Refund", "Adjustment"],
      required: true,
    },
    debit: {
      type: Number,
      default: 0.0,
    },
    credit: {
      type: Number,
      default: 0.0,
    },
    balance: {
      type: Number,
      default: 0.0,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

CustomerLedgerSchema.plugin(tenantPlugin);

module.exports = mongoose.model("CustomerLedger", CustomerLedgerSchema);
