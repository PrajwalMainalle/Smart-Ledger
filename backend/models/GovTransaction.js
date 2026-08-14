const mongoose = require("mongoose");

const GovTransactionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    voucherNumber: {
      type: String,
      required: true,
      index: true,
    },
    grantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovGrant",
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovSchool",
      required: true,
      index: true,
    },
    fundNumber: {
      type: String,
      default: "",
    },
    invoiceNumber: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: [
        "Material Issue",
        "Cash Withdrawal",
        "Material + Cash Withdrawal",
        "Manual Adjustment",
        "Balance Return",
        "Correction",
        "Cancellation",
        "Reversal",
      ],
      required: true,
    },
    materialItems: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        qty: { type: Number, required: true },
        sku: { type: String, default: "" },
        gstRate: { type: Number, default: 0 },
      },
    ],
    materialAmount: {
      type: Number,
      default: 0,
    },
    cashWithdrawnAmount: {
      type: Number,
      default: 0,
    },
    adjustmentAmount: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    balanceBefore: {
      type: Number,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      default: 0,
    },
    teacherDetails: {
      name: { type: String, default: "" },
      mobile: { type: String, default: "" },
      designation: { type: String, default: "" },
      remarks: { type: String, default: "" },
    },
    remarks: {
      type: String,
      default: "",
    },
    processedBy: {
      type: String,
      default: "System",
    },
    isReversal: {
      type: Boolean,
      default: false,
    },
    reversalOfVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovTransaction",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

GovTransactionSchema.index({ tenantId: 1, grantId: 1, date: -1 });

module.exports = mongoose.model("GovTransaction", GovTransactionSchema);
