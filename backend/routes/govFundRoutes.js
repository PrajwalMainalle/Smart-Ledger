const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getSchoolDetails,
} = require("../controllers/govFundController");

// Protect all routes with JWT authentication
router.use(protect);

router.get("/schools", getSchools);
router.post("/schools", createSchool);
router.put("/schools/:id", updateSchool);
router.delete("/schools/:id", deleteSchool);
router.get("/schools/:id", getSchoolDetails);

module.exports = router;
