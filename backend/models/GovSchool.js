const mongoose = require("mongoose");

const GovSchoolSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
    },
    headmasterName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
    },
    grantedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

GovSchoolSchema.index({ tenantId: 1, schoolName: 1 });

module.exports = mongoose.model("GovSchool", GovSchoolSchema);
