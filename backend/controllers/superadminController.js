const Organization = require("../models/Organization");
const User = require("../models/User");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const SuperadminAuditLog = require("../models/SuperadminAuditLog");
const jwt = require("jsonwebtoken");
const { SUPERADMIN_JWT_SECRET } = require("../middleware/superadminAuthMiddleware");

const DEFAULT_SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "prajwalmainalle82@gmail.com";
const DEFAULT_SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || "Mainalle@123";

// @desc    Superadmin Login
// @route   POST /api/superadmin/login
// @access  Public
const superadminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (email === DEFAULT_SUPERADMIN_EMAIL && password === DEFAULT_SUPERADMIN_PASS) {
    const token = jwt.sign(
      {
        isSuperAdminPortal: true,
        email: DEFAULT_SUPERADMIN_EMAIL,
        role: "superadmin",
      },
      SUPERADMIN_JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Superadmin authenticated successfully",
      token,
      email: DEFAULT_SUPERADMIN_EMAIL,
    });
  }

  return res.status(401).json({ message: "Invalid superadmin credentials" });
};

// @desc    Get all organizations with usage metrics
// @route   GET /api/superadmin/organizations
// @access  Private (Superadmin)
const getOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find({}).sort({ createdAt: -1 });

    const results = await Promise.all(
      orgs.map(async (org) => {
        const orgId = org._id;
        const [usersCount, invoicesCount, productsCount, customersCount, primaryAdmin] = await Promise.all([
          User.countDocuments({ organizationId: orgId }, { bypassTenantFilter: true }),
          Invoice.countDocuments({ organizationId: orgId }, { bypassTenantFilter: true }),
          Product.countDocuments({ organizationId: orgId }, { bypassTenantFilter: true }),
          Customer.countDocuments({ organizationId: orgId }, { bypassTenantFilter: true }),
          User.findOne({ organizationId: orgId, role: "admin" }).setOptions({ bypassTenantFilter: true }),
        ]);

        return {
          ...org.toObject(),
          ownerName: primaryAdmin?.ownerName || org.ownerName || "Business Owner",
          email: primaryAdmin?.email || org.email || "N/A",
          phone: primaryAdmin?.mobileNumber || org.phone || "N/A",
          metrics: {
            usersCount,
            invoicesCount,
            productsCount,
            customersCount,
          },
        };
      })
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({ message: "Failed to fetch organizations", error: error.message });
  }
};

// @desc    Update organization status/plan
// @route   PUT /api/superadmin/organizations/:id
// @access  Private (Superadmin)
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, status, trialEndsAt } = req.body;

    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (plan) org.plan = plan;
    if (status) org.status = status;
    if (trialEndsAt) org.trialEndsAt = trialEndsAt;

    await org.save();

    await SuperadminAuditLog.create({
      superadminEmail: req.superadmin?.email || "superadmin@smartledger.com",
      action: "UPDATE_ORGANIZATION",
      targetOrgId: org._id,
      details: { plan, status, trialEndsAt },
      ipAddress: req.ip,
    });

    res.json({ message: "Organization updated successfully", org });
  } catch (error) {
    console.error("Error updating organization:", error);
    res.status(500).json({ message: "Failed to update organization", error: error.message });
  }
};

// @desc    Generate 15-minute support impersonation session token for an organization
// @route   POST /api/superadmin/organizations/:id/impersonate
// @access  Private (Superadmin)
const impersonateOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Find admin user of that org
    let adminUser = await User.findOne({ organizationId: id, role: "admin" }).setOptions({ bypassTenantFilter: true });
    if (!adminUser) {
      adminUser = await User.findOne({ organizationId: id }).setOptions({ bypassTenantFilter: true });
    }

    if (!adminUser) {
      return res.status(404).json({ message: "No user found in this organization to impersonate" });
    }

    // Generate 15-minute impersonation token signed with standard JWT_SECRET
    const impersonationToken = jwt.sign(
      {
        id: adminUser._id,
        organizationId: org._id,
        role: adminUser.role,
        isImpersonating: true,
        orgName: org.name,
        expiresAt: Date.now() + 15 * 60 * 1000,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Audit Log
    await SuperadminAuditLog.create({
      superadminEmail: req.superadmin?.email || "superadmin@smartledger.com",
      action: "SUPPORT_IMPERSONATION_START",
      targetOrgId: org._id,
      targetUserId: adminUser._id,
      details: { orgName: org.name, durationMinutes: 15 },
      ipAddress: req.ip,
    });

    res.json({
      message: `Impersonation session started for ${org.name}`,
      token: impersonationToken,
      orgName: org.name,
      user: {
        _id: adminUser._id,
        email: adminUser.email,
        businessName: org.name,
        ownerName: adminUser.ownerName,
        role: adminUser.role,
        organizationId: org._id,
      },
      expiresInSeconds: 900,
    });
  } catch (error) {
    console.error("Error creating impersonation token:", error);
    res.status(500).json({ message: "Failed to impersonate organization", error: error.message });
  }
};

// @desc    Get Superadmin Audit Logs
// @route   GET /api/superadmin/audit-logs
// @access  Private (Superadmin)
const getAuditLogs = async (req, res) => {
  try {
    const logs = await SuperadminAuditLog.find({})
      .populate("targetOrgId", "name slug")
      .populate("targetUserId", "email ownerName")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs", error: error.message });
  }
};

// @desc    Get all users of a specific organization
// @route   GET /api/superadmin/organizations/:id/users
// @access  Private (Superadmin)
const getOrgUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const users = await User.find({ organizationId: id })
      .select("-password")
      .setOptions({ bypassTenantFilter: true });
    res.json(users);
  } catch (error) {
    console.error("Error fetching org users:", error);
    res.status(500).json({ message: "Failed to fetch organization users", error: error.message });
  }
};

// @desc    Delete a specific user
// @route   DELETE /api/superadmin/users/:userId
// @access  Private (Superadmin)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).setOptions({ bypassTenantFilter: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.deleteOne({ _id: userId }, { bypassTenantFilter: true });

    await SuperadminAuditLog.create({
      superadminEmail: req.superadmin?.email || "prajwalmainalle82@gmail.com",
      action: "DELETE_USER",
      targetOrgId: user.organizationId,
      targetUserId: user._id,
      details: { deletedEmail: user.email, ownerName: user.ownerName, role: user.role },
      ipAddress: req.ip,
    });

    res.json({ message: `User '${user.email}' deleted successfully` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};

// @desc    Delete an organization and its users
// @route   DELETE /api/superadmin/organizations/:id
// @access  Private (Superadmin)
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    await Organization.deleteOne({ _id: id });
    await User.deleteMany({ organizationId: id }, { bypassTenantFilter: true });

    await SuperadminAuditLog.create({
      superadminEmail: req.superadmin?.email || "prajwalmainalle82@gmail.com",
      action: "DELETE_ORGANIZATION",
      targetOrgId: id,
      details: { deletedOrgName: org.name, slug: org.slug },
      ipAddress: req.ip,
    });

    res.json({ message: `Organization '${org.name}' and associated users deleted successfully` });
  } catch (error) {
    console.error("Error deleting organization:", error);
    res.status(500).json({ message: "Failed to delete organization", error: error.message });
  }
};

module.exports = {
  superadminLogin,
  getOrganizations,
  updateOrganization,
  impersonateOrganization,
  getAuditLogs,
  getOrgUsers,
  deleteUser,
  deleteOrganization,
};
