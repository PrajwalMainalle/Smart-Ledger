const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const GovTeacherSchema = new mongoose.Schema(
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
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      default: "Teacher",
      trim: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovSchool",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

GovTeacherSchema.index({ organizationId: 1, schoolId: 1 });
GovTeacherSchema.plugin(tenantPlugin);

module.exports = mongoose.model("GovTeacher", GovTeacherSchema);
