const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({ path: path.join(__dirname, ".env") });

const Purchase = require("./models/Purchase");
const User = require("./models/User");
const purchaseController = require("./controllers/purchaseController");

// Retrieve URI
const MONGODB_URI = process.env.MONGODB_URI;

async function runTest() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  // Create temporary tenant user
  let tenantUser = await User.findOne({ email: "test_tenant_rounding@example.com" });
  if (!tenantUser) {
    tenantUser = new User({
      name: "Test Tenant",
      email: "test_tenant_rounding@example.com",
      password: "password123",
      role: "tenant",
      profile: {
        gstNumber: "29ANOPM8542Q1ZU", // Tenant's GSTIN from PDF
        shopName: "Bharatambe Traders"
      }
    });
    await tenantUser.save();
  }

  // Define request body representing the invoice in the PDF
  const req = {
    user: { _id: tenantUser._id },
    body: {
      billNumber: "IN2655701118_TEST",
      supplierName: "KGOC GLOBAL LLP",
      supplierGst: "29AASFK2654A1Z8",
      date: "2026-07-18",
      paymentMethod: "UPI",
      status: "Paid",
      remarks: "Test rounding verification",
      transport: "0",
      gstType: "CGST+SGST",
      cashDiscountPercent: "1.50",
      items: [
        { productId: null, sku: "", name: "KANGARO PAPER PUNCHES DP-52", price: "54.98", qty: 60, gstRate: 18, schDiscount: 3, splDiscount: 2.20 },
        { productId: null, sku: "", name: "KANGARO PAPER PUNCHES FP-20", price: "64.74", qty: 30, gstRate: 18, schDiscount: 0, splDiscount: 2.20 },
        { productId: null, sku: "", name: "KANGARO STAPLES IN STRIPS NO.10-1M", price: "5.10", qty: 800, gstRate: 18, schDiscount: 15.5, splDiscount: 2.20 }
      ]
    }
  };

  // Mock response object
  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.jsonData = data;
      return this;
    }
  };

  // Clean up any existing duplicate test bill
  await Purchase.deleteOne({ tenantId: tenantUser._id, billNumber: req.body.billNumber });

  // Call the controller's createPurchaseBill function
  console.log("Calling createPurchaseBill controller...");
  const createPurchaseBillModule = require("./controllers/purchaseController").createPurchaseBill;
  
  // Wait for it to save to database and return response
  try {
    await createPurchaseBillModule(req, res);
    console.log("Response status code:", res.statusCode || 201);
    const saved = res.jsonData;
    
    if (saved && saved._id) {
      console.log("\nSaved Purchase Bill details:");
      console.log(`  Subtotal: ${saved.subtotal}`);
      console.log(`  Discount Amount: ${saved.discountAmount}`);
      console.log(`  Taxable Amount (Base): ${saved.taxableAmount}`);
      console.log(`  Cash Discount Amount: ${saved.cashDiscountAmount}`);
      console.log(`  GST Amount: ${saved.gstAmount}`);
      console.log(`  CGST: ${saved.cgst}, SGST: ${saved.sgst}, IGST: ${saved.igst}`);
      console.log(`  Grand Total: ${saved.total}`);

      // Verify each field against the expected calculations
      const matchesPDF = 
        saved.subtotal === 9321 &&
        saved.discountAmount === 920.34 &&
        saved.taxableAmount === 8400.66 &&
        saved.cashDiscountAmount === 126.01 &&
        saved.gstAmount === 1489.46 &&
        saved.cgst === 744.73 &&
        saved.sgst === 744.73 &&
        saved.total === 9764.11;

      console.log("\nDo totals match the PDF values exactly?", matchesPDF ? "YES" : "NO");

      // Clean up the created test bill
      await Purchase.deleteOne({ _id: saved._id });
      console.log("Cleaned up test purchase bill.");
    } else {
      console.error("Failed to save purchase bill. Error response:", saved);
    }
  } catch (err) {
    console.error("Error running controller function:", err);
  }

  // Clean up the temporary tenant user
  await User.deleteOne({ _id: tenantUser._id });
  console.log("Cleaned up temporary user.");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

runTest().catch(console.error);
