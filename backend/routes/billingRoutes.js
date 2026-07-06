const express = require("express");
const router = express.Router();
const {
  getInvoices,
  createInvoice,
  refundInvoice,
  convertQuotationToSale,
  streamInvoicePDF,
  settleInvoice,
  resetBusinessData,
  lookupInvoice,
  getPendingCreditInvoices,
  recordCollection,
} = require("../controllers/billingController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // protect all billing routes

router.get("/", getInvoices);
router.post("/", createInvoice);
router.get("/lookup-invoice", lookupInvoice);
router.get("/customer/:phone/pending", getPendingCreditInvoices);
router.post("/collection", recordCollection);
router.post("/reset-business-data", resetBusinessData);
router.put("/:id/refund", refundInvoice);
router.put("/:id/convert-quotation", convertQuotationToSale);
router.put("/:id/settle", settleInvoice);
router.get("/:id/pdf", streamInvoicePDF);

module.exports = router;
