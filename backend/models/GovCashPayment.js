const mongoose = require("mongoose");

const GovCashPaymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovSchool",
      required: true,
      index: true,
    },
    grantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovGrant",
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovTeacher",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    transactionId: {
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

GovCashPaymentSchema.index({ tenantId: 1, grantId: 1, date: 1 });

module.exports = mongoose.model("GovCashPayment", GovCashPaymentSchema);
