const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SuperadminAuditLogSchema = new Schema(
  {
    superadminEmail: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "UPDATE_ORGANIZATION",
        "MANUAL_STATUS_UPDATE",
        "SUPPORT_IMPERSONATION_START",
        "SUPPORT_IMPERSONATION_END",
        "IMPERSONATE_START",
        "IMPERSONATE_END",
        "EXTEND_TRIAL",
        "SUSPEND_ORG",
        "DELETE_USER",
        "DELETE_ORGANIZATION"
      ],
    },
    targetOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
    targetOrgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    targetOrganizationName: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

SuperadminAuditLogSchema.index({ targetOrganizationId: 1 });
SuperadminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SuperadminAuditLog", SuperadminAuditLogSchema);
