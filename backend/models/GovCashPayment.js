const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const GovCashPaymentSchema = new mongoose.Schema(
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

GovCashPaymentSchema.index({ organizationId: 1, grantId: 1, date: 1 });
GovCashPaymentSchema.plugin(tenantPlugin);

module.exports = mongoose.model("GovCashPayment", GovCashPaymentSchema);
