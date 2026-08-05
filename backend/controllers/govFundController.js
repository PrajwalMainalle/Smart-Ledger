const GovSchool = require("../models/GovSchool");
const Invoice = require("../models/Invoice");

// Helper to calculate total spent and remaining amount for a school
const getSchoolFundStats = async (tenantId, schoolId, grantedAmount) => {
  const invoices = await Invoice.find({
    tenantId,
    govSchoolId: schoolId,
    paymentMethod: "Government School Fund",
    status: { $ne: "Refunded" },
  }).lean();

  let totalSpent = 0;
  invoices.forEach((inv) => {
    totalSpent += inv.total || 0;
  });

  const remainingAmount = (grantedAmount || 0) - totalSpent;

  return {
    totalSpent,
    remainingAmount,
    invoicesCount: invoices.length,
    invoices,
  };
};

// GET all government schools with granted amount, total spent, and remaining balance
const getSchools = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const schools = await GovSchool.find({ tenantId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const schoolsWithFundStats = await Promise.all(
      schools.map(async (school) => {
        const phone = school.contactNumber || school.mobileNumber || "";
        const stats = await getSchoolFundStats(tenantId, school._id, school.grantedAmount);
        return {
          ...school,
          contactNumber: phone,
          mobileNumber: phone,
          totalSpent: stats.totalSpent,
          remainingAmount: stats.remainingAmount,
          invoicesCount: stats.invoicesCount,
        };
      })
    );

    res.json(schoolsWithFundStats);
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ message: "Failed to fetch government schools" });
  }
};

// CREATE a new government school record
const createSchool = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { schoolName, headmasterName, contactNumber, mobileNumber, grantedAmount } = req.body;
    const phone = (contactNumber || mobileNumber || "").trim();

    if (!schoolName || !headmasterName || !phone) {
      return res.status(400).json({
        message: "School Name, Headmaster Name, and Contact Number are required",
      });
    }

    const school = await GovSchool.create({
      tenantId,
      schoolName: schoolName.trim(),
      headmasterName: headmasterName.trim(),
      contactNumber: phone,
      mobileNumber: phone,
      grantedAmount: parseFloat(grantedAmount) || 0,
    });

    const schoolObj = school.toObject();

    res.status(201).json({
      ...schoolObj,
      contactNumber: phone,
      mobileNumber: phone,
      totalSpent: 0,
      remainingAmount: parseFloat(grantedAmount) || 0,
      invoicesCount: 0,
    });
  } catch (error) {
    console.error("Error creating school:", error);
    res.status(500).json({ message: "Failed to create government school record: " + error.message });
  }
};

// UPDATE a government school record
const updateSchool = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { id } = req.params;

    const school = await GovSchool.findOne({ _id: id, tenantId, isDeleted: { $ne: true } });
    if (!school) return res.status(404).json({ message: "Government school record not found" });

    const phone = (req.body.contactNumber || req.body.mobileNumber || school.contactNumber || school.mobileNumber || "").trim();

    if (req.body.schoolName) school.schoolName = req.body.schoolName.trim();
    if (req.body.headmasterName) school.headmasterName = req.body.headmasterName.trim();
    school.contactNumber = phone;
    school.mobileNumber = phone;
    if (req.body.grantedAmount !== undefined) school.grantedAmount = parseFloat(req.body.grantedAmount) || 0;

    await school.save();

    const stats = await getSchoolFundStats(tenantId, id, school.grantedAmount);

    res.json({
      ...school.toObject(),
      contactNumber: phone,
      mobileNumber: phone,
      totalSpent: stats.totalSpent,
      remainingAmount: stats.remainingAmount,
      invoicesCount: stats.invoicesCount,
    });
  } catch (error) {
    console.error("Error updating school:", error);
    res.status(500).json({ message: "Failed to update school record" });
  }
};

// DELETE a government school record (Soft Delete)
const deleteSchool = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { id } = req.params;

    const school = await GovSchool.findOne({ _id: id, tenantId, isDeleted: { $ne: true } });
    if (!school) return res.status(404).json({ message: "Government school record not found" });

    school.isDeleted = true;
    await school.save();

    res.json({ message: "Government school record deleted successfully" });
  } catch (error) {
    console.error("Error deleting school:", error);
    res.status(500).json({ message: "Failed to delete school record" });
  }
};

// GET detailed purchase history & items purchased for a school
const getSchoolDetails = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { id } = req.params;

    const school = await GovSchool.findOne({ _id: id, tenantId, isDeleted: { $ne: true } }).lean();
    if (!school) return res.status(404).json({ message: "Government school record not found" });

    const phone = school.contactNumber || school.mobileNumber || "";
    school.contactNumber = phone;
    school.mobileNumber = phone;

    const invoices = await Invoice.find({
      tenantId,
      govSchoolId: id,
      paymentMethod: "Government School Fund",
      status: { $ne: "Refunded" },
    })
      .sort({ date: -1 })
      .lean();

    let totalSpent = 0;
    const itemisedPurchases = [];

    invoices.forEach((inv) => {
      totalSpent += inv.total || 0;
      (inv.items || []).forEach((item) => {
        itemisedPurchases.push({
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceId,
          date: inv.date,
          name: item.name,
          qty: item.qty,
          price: item.price,
          total: (item.price || 0) * (item.qty || 0),
        });
      });
    });

    const remainingAmount = (school.grantedAmount || 0) - totalSpent;

    res.json({
      school,
      summary: {
        grantedAmount: school.grantedAmount || 0,
        totalSpent,
        remainingAmount,
      },
      invoices,
      purchasedItems: itemisedPurchases,
    });
  } catch (error) {
    console.error("Error fetching school details:", error);
    res.status(500).json({ message: "Failed to fetch school purchase details" });
  }
};

module.exports = {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getSchoolDetails,
  getSchoolFundStats,
};
