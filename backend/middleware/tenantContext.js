const { AsyncLocalStorage } = require("async_hooks");

const tenantStorage = new AsyncLocalStorage();

const runWithOrgId = (organizationId, callback) => {
  return tenantStorage.run(organizationId ? String(organizationId) : null, callback);
};

const getOrgId = () => {
  return tenantStorage.getStore() || null;
};

const tenantContextMiddleware = (req, res, next) => {
  const orgId = req.organizationId || (req.user && req.user.organizationId);
  if (orgId) {
    runWithOrgId(orgId, () => next());
  } else {
    next();
  }
};

module.exports = {
  tenantStorage,
  runWithOrgId,
  getOrgId,
  tenantContextMiddleware,
};
