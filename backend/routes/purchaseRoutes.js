const express = require("express");
const router = express.Router();
const {
  getPurchaseBills,
  createPurchaseBill,
  updatePurchaseBill,
  deletePurchaseBill,
} = require("../controllers/purchaseController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // protect all purchase routes

router.get("/", getPurchaseBills);
router.post("/", createPurchaseBill);
router.put("/:id", updatePurchaseBill);
router.delete("/:id", deletePurchaseBill);

module.exports = router;
