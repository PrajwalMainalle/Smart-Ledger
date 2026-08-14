const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getSchoolDetails,
  getGovFunds,
  createGovFund,
  activateGovFund,
  processFundUtilization,
  getFundLedger,
  reverseGovTransaction,
  manualAdjustFund,
  getGovDashboardStats,
} = require("../controllers/govFundController");

// Protect all routes with JWT authentication
router.use(protect);

router.get("/schools", getSchools);
router.post("/schools", createSchool);
router.put("/schools/:id", updateSchool);
router.delete("/schools/:id", deleteSchool);
router.get("/schools/:id", getSchoolDetails);

router.get("/funds", getGovFunds);
router.post("/funds", createGovFund);
router.put("/funds/:id/activate", activateGovFund);
router.post("/utilize", processFundUtilization);
router.get("/ledger", getFundLedger);
router.get("/ledger/:fundId", getFundLedger);
router.post("/ledger/:id/reverse", reverseGovTransaction);
router.post("/funds/:fundId/adjust", manualAdjustFund);
router.get("/dashboard-stats", getGovDashboardStats);

module.exports = router;
