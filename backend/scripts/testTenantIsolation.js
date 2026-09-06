const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { runWithOrgId } = require("../middleware/tenantContext");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const GovGrant = require("../models/GovGrant");

async function runTenantIsolationTest() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/bharatambetraders";
  console.log(`Connecting to MongoDB for Security Audit: ${mongoUri}`);

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected successfully. Running Cross-Tenant Data Isolation Tests...\n");

  // 1. Get Org A (Bharatambe Traders)
  let orgA = await Organization.findOne({ slug: "bharatambe-traders" });
  if (!orgA) {
    orgA = await Organization.create({ name: "Bharatambe Traders", slug: "bharatambe-traders", plan: "free", status: "active" });
  }

  // 2. Get or Create Org B (Ganesh Agencies)
  let orgB = await Organization.findOne({ slug: "ganesh-agencies-test" });
  if (!orgB) {
    orgB = await Organization.create({ name: "Ganesh Agencies", slug: "ganesh-agencies-test", plan: "free", status: "active" });
  }

  console.log(`Org A (Target Victim): ${orgA.name} (${orgA._id})`);
  console.log(`Org B (Attacker Tenant): ${orgB.name} (${orgB._id})\n`);

  let testInvoiceId, testCustomerId, testProductId, testGrantId;

  // 3. Create confidential record under Org A context
  const randomSuffix = Date.now().toString().slice(-4);
  await runWithOrgId(orgA._id.toString(), async () => {
    const cust = await Customer.create({ name: "OrgA Secret Customer", phone: `99988${randomSuffix}` });
    testCustomerId = cust._id;

    const prod = await Product.create({ name: "OrgA Secret Item", sku: `SEC-ITEM-${randomSuffix}`, sellingPrice: 500 });
    testProductId = prod._id;

    const inv = await Invoice.create({ invoiceId: `ORGA-SEC-${randomSuffix}`, invoiceNumber: `ORGA-SEC-${randomSuffix}`, customerName: "OrgA Secret Customer", grandTotal: 500 });
    testInvoiceId = inv._id;

    const dummySchoolId = new mongoose.Types.ObjectId();
    const grant = await GovGrant.create({
      grantName: "OrgA Gov Special Grant",
      fundNumber: `FUND-${randomSuffix}`,
      approvedBudget: 100000,
      remainingBalance: 100000,
      schoolId: dummySchoolId,
      totalAmount: 100000,
    });
    testGrantId = grant._id;
  });

  const testResults = [];

  // Helper to record pass/fail
  const recordTest = (moduleName, testName, isIsolated, detail) => {
    testResults.push({
      Module: moduleName,
      TestDescription: testName,
      Isolated: isIsolated ? "PASSED (BLOCKED)" : "FAILED (DATA LEAK!)",
      Detail: detail,
    });
  };

  // 4. Run cross-tenant access attempts under Org B context (Ganesh Agencies user)
  await runWithOrgId(orgB._id.toString(), async () => {
    // Test 1: Customer List leakage
    const custs = await Customer.find({});
    const leakedCust = custs.find((c) => c._id.toString() === testCustomerId.toString());
    recordTest("Customers", "List All Customers", !leakedCust, `Org B retrieved ${custs.length} items. Leaked Org A customer: ${!!leakedCust}`);

    // Test 2: Customer Direct Fetch by ID
    const custDirect = await Customer.findById(testCustomerId);
    recordTest("Customers", "Fetch Customer by ID", !custDirect, `Fetch Org A Customer by ID returned: ${custDirect ? "FOUND (LEAK!)" : "null (PROTECTED)"}`);

    // Test 3: Product List leakage
    const prods = await Product.find({});
    const leakedProd = prods.find((p) => p._id.toString() === testProductId.toString());
    recordTest("Inventory/POS", "List Products", !leakedProd, `Org B retrieved ${prods.length} items. Leaked Org A product: ${!!leakedProd}`);

    // Test 4: Invoice List leakage
    const invs = await Invoice.find({});
    const leakedInv = invs.find((i) => i._id.toString() === testInvoiceId.toString());
    recordTest("Invoices/Billing", "List Invoices", !leakedInv, `Org B retrieved ${invs.length} items. Leaked Org A invoice: ${!!leakedInv}`);

    // Test 5: Invoice Direct Fetch by ID
    const invDirect = await Invoice.findById(testInvoiceId);
    recordTest("Invoices/Billing", "Fetch Invoice by ID", !invDirect, `Fetch Org A Invoice by ID returned: ${invDirect ? "FOUND (LEAK!)" : "null (PROTECTED)"}`);

    // Test 6: Cross-tenant Write/Update attempt
    const updateResult = await Invoice.updateOne({ _id: testInvoiceId }, { status: "PAID" });
    recordTest("Invoices/Billing", "Unauthorized Update Attempt", updateResult.modifiedCount === 0, `Modified document count: ${updateResult.modifiedCount}`);

    // Test 7: Cross-tenant Delete attempt
    const deleteResult = await Invoice.deleteOne({ _id: testInvoiceId });
    recordTest("Invoices/Billing", "Unauthorized Delete Attempt", deleteResult.deletedCount === 0, `Deleted document count: ${deleteResult.deletedCount}`);

    // Test 8: Gov Grant / Voucher leakage
    const grants = await GovGrant.find({});
    const leakedGrant = grants.find((g) => g._id.toString() === testGrantId.toString());
    recordTest("Gov Grants / Vouchers", "List Gov Grants", !leakedGrant, `Org B retrieved ${grants.length} items. Leaked Org A grant: ${!!leakedGrant}`);
  });

  // 5. Clean up test records (using bypassTenantFilter for cleanup)
  await Customer.deleteOne({ _id: testCustomerId }, { bypassTenantFilter: true });
  await Product.deleteOne({ _id: testProductId }, { bypassTenantFilter: true });
  await Invoice.deleteOne({ _id: testInvoiceId }, { bypassTenantFilter: true });
  await GovGrant.deleteOne({ _id: testGrantId }, { bypassTenantFilter: true });
  await Organization.deleteOne({ _id: orgB._id });

  console.log("=============================================================");
  console.log("       CROSS-TENANT SECURITY & DATA ISOLATION AUDIT          ");
  console.log("=============================================================");
  console.table(testResults);
  console.log("=============================================================\n");

  const allPassed = testResults.every((r) => r.Isolated.includes("PASSED"));
  if (allPassed) {
    console.log("SUCCESS: 100% Data Isolation Confirmed! Cross-tenant access is fully blocked.");
  } else {
    console.error("CRITICAL SECURITY FAILURE: Data leakage detected! Review audit table above.");
  }

  await mongoose.disconnect();
  return { testResults, allPassed };
}

if (require.main === module) {
  runTenantIsolationTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Isolation test failed with error:", err);
      process.exit(1);
    });
}

module.exports = { runTenantIsolationTest };
