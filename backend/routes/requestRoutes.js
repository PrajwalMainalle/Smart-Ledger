const express = require("express");
const router = express.Router();
const {
  getRequests,
  createRequest,
  updateRequest,
  deleteRequest,
  getReminderStats,
} = require("../controllers/requestController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // protect all requests routes

router.get("/", getRequests);
router.post("/", createRequest);
router.get("/reminders", getReminderStats);
router.put("/:id", updateRequest);
router.delete("/:id", deleteRequest);

module.exports = router;
