const mongoose = require("mongoose");

const GovTransactionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovTeacher",
      default: null,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: [
        "Grant Received",
        "Material Purchase",
        "Cash Given",
        "Adjustment",
        "Refund",
        "Closing Adjustment",
      ],
      required: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    invoiceNumber: {
      type: String,
      default: "",
    },
    cashPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovCashPayment",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
      default: "System",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

GovTransactionSchema.index({ tenantId: 1, grantId: 1, date: 1 });

module.exports = mongoose.model("GovTransaction", GovTransactionSchema);
