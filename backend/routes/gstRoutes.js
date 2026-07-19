const express = require("express");
const router = express.Router();
const {
  getGstDashboard,
  getGstSalesSummary,
  getGstPurchasesSummary,
  getGstCaSummary,
  getInventoryGstSummary,
  getProfitReport
} = require("../controllers/gstController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // protect all routes

router.get("/dashboard", getGstDashboard);
router.get("/reports/sales", getGstSalesSummary);
router.get("/reports/purchases", getGstPurchasesSummary);
router.get("/reports/ca-summary", getGstCaSummary);
router.get("/reports/profit", getProfitReport);
router.get("/inventory-summary", getInventoryGstSummary);

module.exports = router;
