const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const GovGrantSchema = new mongoose.Schema(
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
    fundNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    invoiceNumber: {
      type: String,
      default: "",
      trim: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovSchool",
      required: true,
      index: true,
    },
    headmasterName: {
      type: String,
      default: "",
      trim: true,
    },
    grantName: {
      type: String,
      required: true,
      default: "Composite School Grant",
      trim: true,
    },
    academicYear: {
      type: String,
      default: "2026-27",
      trim: true,
    },
    grantCategory: {
      type: String,
      default: "Composite School Grant",
      trim: true,
    },
    department: {
      type: String,
      default: "School Education Department",
      trim: true,
    },
    approvedBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    materialUtilized: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    amountReceivedDate: {
      type: Date,
      default: Date.now,
    },
    referenceNumber: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "Draft Invoice",
        "Invoice Issued",
        "Government Approved",
        "Fund Active",
        "Partially Utilized",
        "Fully Utilized",
        "Closed",
        "Cancelled",
        "Expired",
      ],
      default: "Fund Active",
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

GovGrantSchema.index({ organizationId: 1, schoolId: 1, fundNumber: 1 });
GovGrantSchema.plugin(tenantPlugin);

module.exports = mongoose.model("GovGrant", GovGrantSchema);
