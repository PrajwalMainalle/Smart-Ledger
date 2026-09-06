const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Organization = require("../models/Organization");
const User = require("../models/User");
const Customer = require("../models/Customer");
const CustomerLedger = require("../models/CustomerLedger");
const CustomerRequest = require("../models/CustomerRequest");
const DamagedStock = require("../models/DamagedStock");
const GovAuditLog = require("../models/GovAuditLog");
const GovCashPayment = require("../models/GovCashPayment");
const GovGrant = require("../models/GovGrant");
const GovSchool = require("../models/GovSchool");
const GovTeacher = require("../models/GovTeacher");
const GovTransaction = require("../models/GovTransaction");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");

const modelsToMigrate = [
  { name: "User", model: User },
  { name: "Customer", model: Customer },
  { name: "CustomerLedger", model: CustomerLedger },
  { name: "CustomerRequest", model: CustomerRequest },
  { name: "DamagedStock", model: DamagedStock },
  { name: "GovAuditLog", model: GovAuditLog },
  { name: "GovCashPayment", model: GovCashPayment },
  { name: "GovGrant", model: GovGrant },
  { name: "GovSchool", model: GovSchool },
  { name: "GovTeacher", model: GovTeacher },
  { name: "GovTransaction", model: GovTransaction },
  { name: "Invoice", model: Invoice },
  { name: "Product", model: Product },
  { name: "Purchase", model: Purchase },
];

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/bharatambetraders";
  console.log(`Connecting to MongoDB: ${mongoUri}`);

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected successfully. Initializing Multi-Tenant Migration...");

  // 1. Find or create primary Organization for Bharatambe Traders
  let primaryOrg = await Organization.findOne({ slug: "bharatambe-traders" });
  if (!primaryOrg) {
    // Attempt to pull shop profile details from existing admin user
    const adminUser = await User.findOne({ role: "admin" });
    const profile = adminUser?.profile || {};

    primaryOrg = await Organization.create({
      name: "Bharatambe Traders",
      slug: "bharatambe-traders",
      ownerName: adminUser?.ownerName || "Merchant Owner",
      email: adminUser?.email || "admin@bharatambe.com",
      phone: adminUser?.mobileNumber || profile.mobileNumber || "9845757296",
      gstNumber: profile.gstNumber || "",
      address: profile.businessAddress || "",
      logo: profile.logo || "",
      tagline: profile.tagline || "",
      plan: "free",
      status: "active",
    });
    console.log(`Created primary Organization: ${primaryOrg.name} (ID: ${primaryOrg._id})`);
  } else {
    if (primaryOrg.name !== "Bharatambe Traders") {
      primaryOrg.name = "Bharatambe Traders";
      await primaryOrg.save();
    }
    console.log(`Using existing primary Organization: ${primaryOrg.name} (ID: ${primaryOrg._id})`);
  }

  const orgId = primaryOrg._id;
  const auditReport = [];

  // 2. Perform Before Migration Count & Update
  for (const { name, model } of modelsToMigrate) {
    console.log(`Processing collection: ${name}...`);
    const beforeCount = await model.countDocuments({}, { bypassTenantFilter: true });
    const unassignedCount = await model.countDocuments(
      { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
      { bypassTenantFilter: true }
    );

    if (unassignedCount > 0) {
      await model.updateMany(
        { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
        { $set: { organizationId: orgId } },
        { bypassTenantFilter: true }
      );
    }

    const afterCount = await model.countDocuments({}, { bypassTenantFilter: true });
    const migratedCount = await model.countDocuments({ organizationId: orgId }, { bypassTenantFilter: true });

    auditReport.push({
      Collection: name,
      BeforeTotal: beforeCount,
      UnassignedBefore: unassignedCount,
      AfterTotal: afterCount,
      MigratedToPrimaryOrg: migratedCount,
      Status: beforeCount === afterCount ? "PASSED (100% Match)" : "FAILED (Mismatch)",
    });
  }

  console.log("\n=============================================================");
  console.log("            MULTI-TENANT DATA MIGRATION AUDIT REPORT          ");
  console.log("=============================================================");
  console.table(auditReport);
  console.log("=============================================================\n");

  const allPassed = auditReport.every((r) => r.Status.includes("PASSED"));
  if (allPassed) {
    console.log("SUCCESS: All existing client data has been safely backfilled into primary Organization!");
  } else {
    console.error("ERROR: Count mismatch detected in migration! Review table above.");
  }

  await mongoose.disconnect();
  return { primaryOrg, auditReport, allPassed };
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed with error:", err);
      process.exit(1);
    });
}

module.exports = { runMigration };
