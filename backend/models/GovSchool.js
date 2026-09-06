const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const GovSchoolSchema = new mongoose.Schema(
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

GovSchoolSchema.index({ organizationId: 1, schoolName: 1 });
GovSchoolSchema.plugin(tenantPlugin);

module.exports = mongoose.model("GovSchool", GovSchoolSchema);
