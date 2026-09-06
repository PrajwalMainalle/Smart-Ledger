const express = require("express");
const router = express.Router();
const {
  superadminLogin,
  getOrganizations,
  updateOrganization,
  impersonateOrganization,
  getAuditLogs,
  getOrgUsers,
  deleteUser,
  deleteOrganization,
} = require("../controllers/superadminController");
const { protectSuperadmin } = require("../middleware/superadminAuthMiddleware");

router.post("/login", superadminLogin);
router.get("/organizations", protectSuperadmin, getOrganizations);
router.put("/organizations/:id", protectSuperadmin, updateOrganization);
router.delete("/organizations/:id", protectSuperadmin, deleteOrganization);
router.get("/organizations/:id/users", protectSuperadmin, getOrgUsers);
router.delete("/users/:userId", protectSuperadmin, deleteUser);
router.post("/organizations/:id/impersonate", protectSuperadmin, impersonateOrganization);
router.get("/audit-logs", protectSuperadmin, getAuditLogs);

module.exports = router;
