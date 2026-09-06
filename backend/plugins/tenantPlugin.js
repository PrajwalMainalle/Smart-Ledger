const mongoose = require("mongoose");
const { getOrgId } = require("../middleware/tenantContext");

function tenantPlugin(schema, options) {
  // Add organizationId field if not already present
  if (!schema.path("organizationId")) {
    schema.add({
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        index: true,
      },
    });
  }

  // Pre-save hook: auto-assign organizationId if missing
  schema.pre("save", function (next) {
    const activeOrgId = getOrgId();
    if (activeOrgId && !this.organizationId) {
      this.organizationId = activeOrgId;
    }
    next();
  });

  // Query hooks to auto-inject organizationId filter
  const queryHooks = [
    "find",
    "findOne",
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
    "deleteOne",
    "deleteMany",
    "countDocuments",
  ];

  queryHooks.forEach((hookName) => {
    schema.pre(hookName, function (next) {
      const activeOrgId = getOrgId();
      // Only apply auto-filter if an org ID is active and query doesn't explicitly bypass or already specify organizationId
      if (activeOrgId && !this.getOptions()?.bypassTenantFilter) {
        const currentFilter = this.getFilter() || {};
        if (!currentFilter.organizationId) {
          this.where({ organizationId: activeOrgId });
        }
      }
      next();
    });
  });

  // Aggregate hook to auto-inject $match stage
  schema.pre("aggregate", function (next) {
    const activeOrgId = getOrgId();
    if (activeOrgId && !this.options?.bypassTenantFilter) {
      const pipeline = this.pipeline();
      const firstStage = pipeline[0] || {};
      if (!firstStage.$match || !firstStage.$match.organizationId) {
        this.pipeline().unshift({
          $match: { organizationId: new mongoose.Types.ObjectId(activeOrgId) },
        });
      }
    }
    next();
  });
}

module.exports = tenantPlugin;
