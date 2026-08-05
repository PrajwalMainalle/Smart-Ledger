const mongoose = require("mongoose");

const GovGrantSchema = new mongoose.Schema(
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
    headmasterName: {
      type: String,
      required: true,
      trim: true,
    },
    grantName: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    grantCategory: {
      type: String,
      required: true,
      default: "Composite School Grant",
      trim: true,
    },
    grantAmount: {
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
      enum: ["Active", "Closed"],
      default: "Active",
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

GovGrantSchema.index({ tenantId: 1, schoolId: 1 });

module.exports = mongoose.model("GovGrant", GovGrantSchema);
