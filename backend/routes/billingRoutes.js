const express = require("express");
const router = express.Router();
const {
  getInvoices,
  createInvoice,
  updateInvoice,
  refundInvoice,
  convertQuotationToSale,
  streamInvoicePDF,
  settleInvoice,
  resetBusinessData,
  lookupInvoice,
  getPendingCreditInvoices,
  recordCollection,
  getCreditReminders,
  updateInvoicePaymentMethod,
  deleteInvoice,
} = require("../controllers/billingController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect); // protect all billing routes

router.get("/", getInvoices);
router.post("/", createInvoice);
router.put("/:id", updateInvoice);
router.get("/credit-reminders", getCreditReminders);
router.get("/lookup-invoice", lookupInvoice);
router.get("/customer/:phone/pending", getPendingCreditInvoices);
router.post("/collection", recordCollection);
router.post("/reset-business-data", authorize("admin"), resetBusinessData);
router.put("/:id/refund", refundInvoice);
router.put("/:id/convert-quotation", convertQuotationToSale);
router.put("/:id/settle", settleInvoice);
router.put("/:id/payment-method", updateInvoicePaymentMethod);
router.delete("/:id", authorize("admin"), deleteInvoice);
router.get("/:id/pdf", streamInvoicePDF);

module.exports = router;
