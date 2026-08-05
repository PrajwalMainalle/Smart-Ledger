const mongoose = require("mongoose");

const GovAuditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

GovAuditLogSchema.index({ tenantId: 1, entityType: 1, timestamp: -1 });

module.exports = mongoose.model("GovAuditLog", GovAuditLogSchema);
