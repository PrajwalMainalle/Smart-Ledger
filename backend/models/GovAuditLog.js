const mongoose = require("mongoose");
const tenantPlugin = require("../plugins/tenantPlugin");

const GovAuditLogSchema = new mongoose.Schema(
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
    entityType: {
      type: String,
      enum: ["School", "Teacher", "Grant", "CashPayment", "Transaction", "Settlement", "Invoice"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "CLOSE"],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdByName: {
      type: String,
      default: "System",
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

GovAuditLogSchema.index({ organizationId: 1, entityType: 1, timestamp: -1 });
GovAuditLogSchema.plugin(tenantPlugin);

module.exports = mongoose.model("GovAuditLog", GovAuditLogSchema);
