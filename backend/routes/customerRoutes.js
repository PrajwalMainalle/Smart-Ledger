const express = require("express");
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
} = require("../controllers/customerController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // protect all customer endpoints

router.get("/", getCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.get("/:id/ledger", getCustomerLedger);

module.exports = router;
