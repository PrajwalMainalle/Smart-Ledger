const path = require("path");
const fs = require("fs");
const GovSchool = require("../models/GovSchool");
const GovGrant = require("../models/GovGrant");
const GovTransaction = require("../models/GovTransaction");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const { generateGovVoucherPDF } = require("../utils/govVoucherPdfGenerator");

// Helper to calculate total spent and remaining amount for a school
const getSchoolFundStats = async (tenantId, schoolId, grantedAmount) => {
  const query = { schoolId, isDeleted: { $ne: true } };
  if (tenantId) query.tenantId = tenantId;
  const funds = await GovGrant.find(query).lean();

  let totalApproved = 0;
  let totalMaterialUtilized = 0;
  let totalCashWithdrawn = 0;
  let totalRemaining = 0;

  funds.forEach((f) => {
    totalApproved += f.approvedBudget || 0;
    totalMaterialUtilized += f.materialUtilized || 0;
    totalCashWithdrawn += f.cashWithdrawn || 0;
    totalRemaining += f.remainingBalance !== undefined ? f.remainingBalance : ((f.approvedBudget || 0) - (f.materialUtilized || 0) - (f.cashWithdrawn || 0));
  });

  return {
    totalApproved: totalApproved || grantedAmount || 0,
    totalMaterialUtilized,
    totalCashWithdrawn,
    totalSpent: totalMaterialUtilized + totalCashWithdrawn,
    remainingAmount: totalRemaining || grantedAmount || 0,
    fundsCount: funds.length,
    funds,
  };
};

// GET all government schools with fund stats
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
          totalApproved: stats.totalApproved,
          totalMaterialUtilized: stats.totalMaterialUtilized,
          totalCashWithdrawn: stats.totalCashWithdrawn,
          totalSpent: stats.totalSpent,
          remainingAmount: stats.remainingAmount,
          fundsCount: stats.fundsCount,
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
      totalApproved: parseFloat(grantedAmount) || 0,
      totalSpent: 0,
      remainingAmount: parseFloat(grantedAmount) || 0,
      fundsCount: 0,
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

    const school = await GovSchool.findOne({ _id: id, isDeleted: { $ne: true } });
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
      totalApproved: stats.totalApproved,
      totalSpent: stats.totalSpent,
      remainingAmount: stats.remainingAmount,
      fundsCount: stats.fundsCount,
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

    const school = await GovSchool.findOne({ _id: id, isDeleted: { $ne: true } });
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

    const school = await GovSchool.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    if (!school) return res.status(404).json({ message: "Government school record not found" });

    const funds = await GovGrant.find({ schoolId: id, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    const ledgers = await GovTransaction.find({ schoolId: id, isDeleted: { $ne: true } })
      .sort({ date: -1 })
      .lean();

    let totalApproved = 0;
    let totalMaterialUtilized = 0;
    let totalCashWithdrawn = 0;

    funds.forEach((f) => {
      totalApproved += f.approvedBudget || 0;
      totalMaterialUtilized += f.materialUtilized || 0;
      totalCashWithdrawn += f.cashWithdrawn || 0;
    });

    const totalSpent = totalMaterialUtilized + totalCashWithdrawn;
    const remainingAmount = totalApproved - totalSpent;

    res.json({
      school,
      summary: {
        totalApproved,
        totalMaterialUtilized,
        totalCashWithdrawn,
        totalSpent,
        remainingAmount,
      },
      funds,
      ledgers,
    });
  } catch (error) {
    console.error("Error fetching school details:", error);
    res.status(500).json({ message: "Failed to fetch school purchase details" });
  }
};

// GET all Government Fund Accounts (Grants)
const getGovFunds = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { schoolId, status } = req.query;

    const query = { tenantId, isDeleted: { $ne: true } };
    if (schoolId) query.schoolId = schoolId;
    if (status) query.status = status;

    const funds = await GovGrant.find(query)
      .populate("schoolId", "schoolName headmasterName contactNumber")
      .populate("invoiceId", "invoiceId date total status")
      .sort({ createdAt: -1 })
      .lean();

    res.json(funds);
  } catch (error) {
    console.error("Error fetching gov funds:", error);
    res.status(500).json({ message: "Failed to fetch government funds" });
  }
};

// CREATE a Government Fund Account manually
const createGovFund = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const {
      schoolId,
      grantName,
      grantCategory,
      academicYear,
      department,
      approvedBudget,
      referenceNumber,
      notes,
    } = req.body;

    if (!schoolId || !approvedBudget || parseFloat(approvedBudget) <= 0) {
      return res.status(400).json({ message: "School selection and Approved Budget (> ₹0) are required" });
    }

    const school = await GovSchool.findOne({ _id: schoolId, isDeleted: { $ne: true } });
    if (!school) return res.status(404).json({ message: "Government school not found" });

    const count = await GovGrant.countDocuments({ tenantId });
    const currentYear = new Date().getFullYear();
    const fundNumber = `GF-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const budgetVal = parseFloat(approvedBudget);

    const fund = await GovGrant.create({
      tenantId,
      fundNumber,
      schoolId,
      headmasterName: school.headmasterName,
      grantName: grantName?.trim() || "Composite School Grant",
      grantCategory: grantCategory?.trim() || "Composite School Grant",
      academicYear: academicYear?.trim() || `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      department: department?.trim() || "School Education Department",
      approvedBudget: budgetVal,
      materialUtilized: 0,
      cashWithdrawn: 0,
      remainingBalance: budgetVal,
      referenceNumber: referenceNumber || "",
      notes: notes || "",
      status: "Fund Active",
    });

    res.status(201).json(fund);
  } catch (error) {
    console.error("Error creating gov fund:", error);
    res.status(500).json({ message: "Failed to create government fund account: " + error.message });
  }
};

// ACTIVATE a Government Fund Account (upon receiving approval/funds)
const activateGovFund = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { id } = req.params;

    const fund = await GovGrant.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!fund) return res.status(404).json({ message: "Government Fund Account not found" });

    fund.status = "Fund Active";
    fund.amountReceivedDate = new Date();
    await fund.save();

    if (fund.invoiceId) {
      await Invoice.updateOne(
        { _id: fund.invoiceId, tenantId },
        { $set: { govFundStatus: "Fund Active" } }
      );
    }

    res.json({ message: "Government Fund Account activated successfully", fund });
  } catch (error) {
    console.error("Error activating fund:", error);
    res.status(500).json({ message: "Failed to activate government fund" });
  }
};

// PROCESS Government Fund Utilization from POS (Layer 2 - ZERO SALES INVOICE CREATED!)
const processFundUtilization = async (req, res) => {
  const {
    schoolId,
    grantId,
    type,
    items,
    cashWithdrawnAmount,
    teacherDetails,
    remarks,
  } = req.body;

  try {
    const tenantId = req.user._id;

    // 1. Fetch Government Fund Account
    const fund = await GovGrant.findOne({ _id: grantId, isDeleted: { $ne: true } });
    if (!fund) {
      return res.status(404).json({ message: "Government Fund Account not found" });
    }

    if (!["Fund Active", "Partially Utilized"].includes(fund.status)) {
      return res.status(400).json({
        message: `Government Fund is not active for utilization. Current status: ${fund.status}`,
      });
    }

    const school = await GovSchool.findOne({ _id: schoolId || fund.schoolId });
    if (!school) {
      return res.status(404).json({ message: "Associated Government School record not found" });
    }

    // 2. Compute material items total & check inventory
    let materialTotal = 0;
    const materialItemsProcessed = [];
    const checkedProducts = [];

    if (items && items.length > 0) {
      for (const cartItem of items) {
        if (cartItem.isManualItem) {
          const itemPrice = parseFloat(cartItem.price) || 0;
          const itemQty = parseFloat(cartItem.qty) || 1;
          materialItemsProcessed.push({
            productId: null,
            name: cartItem.name,
            price: itemPrice,
            qty: itemQty,
            sku: "MANUAL",
            gstRate: cartItem.gstRate || 0,
          });
          materialTotal += itemPrice * itemQty;
          continue;
        }

        const pId = cartItem.id || cartItem.productId;
        const product = await Product.findOne({ _id: pId, tenantId });
        if (!product) {
          return res.status(404).json({ message: `Product '${cartItem.name}' not found in inventory` });
        }

        const itemQty = parseFloat(cartItem.qty) || 1;
        const itemPrice = parseFloat(cartItem.price) || (product.prices ? product.prices.get("retail") : product.price) || 0;

        if (product.stock < itemQty) {
          return res.status(400).json({
            message: `Insufficient stock for '${product.name}'. Available: ${product.stock}, Requested: ${itemQty}`,
          });
        }

        checkedProducts.push({ product, qty: itemQty });
        materialItemsProcessed.push({
          productId: product._id,
          name: cartItem.name || product.name,
          price: itemPrice,
          qty: itemQty,
          sku: product.sku || "",
          gstRate: product.gstRate || 0,
        });
        materialTotal += itemPrice * itemQty;
      }
    }

    const cashVal = parseFloat(cashWithdrawnAmount) || 0;
    const totalUtilization = materialTotal + cashVal;

    if (totalUtilization <= 0) {
      return res.status(400).json({ message: "Utilization total must be greater than ₹0" });
    }

    if (totalUtilization > fund.remainingBalance) {
      return res.status(400).json({
        message: `Transaction total (₹${totalUtilization.toFixed(2)}) exceeds remaining fund balance (₹${fund.remainingBalance.toFixed(2)})`,
      });
    }

    // 3. Deduct stock levels for material items
    for (const item of checkedProducts) {
      item.product.stock -= item.qty;
      if (item.product.gstStock !== undefined && item.product.gstStock >= item.qty) {
        item.product.gstStock -= item.qty;
      } else if (item.product.nonGstStock !== undefined && item.product.nonGstStock >= item.qty) {
        item.product.nonGstStock -= item.qty;
      }
      await item.product.save();
    }

    // 4. Generate unique Voucher Number
    const count = await GovTransaction.countDocuments({});
    const currentYear = new Date().getFullYear();
    const voucherNumber = `VOUCHER-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    // 5. Balance Calculations
    const balanceBefore = fund.remainingBalance;
    const newMaterialUtilized = (fund.materialUtilized || 0) + materialTotal;
    const newCashWithdrawn = (fund.cashWithdrawn || 0) + cashVal;
    const newRemainingBalance = Math.max(0, fund.approvedBudget - (newMaterialUtilized + newCashWithdrawn));
    const newStatus = newRemainingBalance === 0 ? "Fully Utilized" : "Partially Utilized";

    fund.materialUtilized = newMaterialUtilized;
    fund.cashWithdrawn = newCashWithdrawn;
    fund.remainingBalance = newRemainingBalance;
    fund.status = newStatus;
    await fund.save();

    // 6. Record Permanent Fund Ledger Entry
    const transactionType = type || (materialTotal > 0 && cashVal > 0 ? "Material + Cash Withdrawal" : (materialTotal > 0 ? "Material Issue" : "Cash Withdrawal"));

    const ledgerEntry = await GovTransaction.create({
      tenantId,
      voucherNumber,
      grantId: fund._id,
      schoolId: school._id,
      fundNumber: fund.fundNumber,
      invoiceNumber: fund.invoiceNumber || "",
      type: transactionType,
      materialItems: materialItemsProcessed,
      materialAmount: materialTotal,
      cashWithdrawnAmount: cashVal,
      amount: totalUtilization,
      balanceBefore,
      balanceAfter: newRemainingBalance,
      teacherDetails: {
        name: teacherDetails?.name || "",
        mobile: teacherDetails?.mobile || "",
        designation: teacherDetails?.designation || "",
        remarks: teacherDetails?.remarks || remarks || "",
      },
      remarks: remarks || "",
      processedBy: req.user?.name || req.user?.email || "Staff",
    });

    // Generate and save physical Voucher PDF
    try {
      const merchantInfo = {
        ...(req.user?.profile || {}),
        shopName: req.user?.profile?.shopName || req.user?.businessName || "Smart Ledger",
        firmName: req.user?.profile?.shopName || req.user?.businessName || "Smart Ledger",
        address: req.user?.profile?.businessAddress || "",
        mobileNumber: req.user?.profile?.mobileNumber || req.user?.mobileNumber || "",
        phone: req.user?.profile?.mobileNumber || req.user?.mobileNumber || "",
        gstNumber: req.user?.profile?.gstNumber || "",
      };
      const pdfUrl = await generateGovVoucherPDF(ledgerEntry, merchantInfo);
      ledgerEntry.pdfUrl = pdfUrl;
      await ledgerEntry.save();
    } catch (pdfErr) {
      console.error("Voucher PDF Generation error:", pdfErr);
    }

    res.status(201).json({
      message: "Fund utilization recorded successfully",
      voucher: ledgerEntry,
      fund,
      school,
    });

  } catch (error) {
    console.error("Error processing fund utilization:", error);
    res.status(500).json({ message: "Server error processing fund utilization", error: error.message });
  }
};

// GET Fund Permanent Audit Ledger
const getFundLedger = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { fundId } = req.params;

    const query = { tenantId, isDeleted: { $ne: true } };
    if (fundId && fundId !== "all") {
      query.grantId = fundId;
    }

    const ledgers = await GovTransaction.find(query)
      .populate("schoolId", "schoolName headmasterName")
      .populate("grantId", "fundNumber grantName approvedBudget remainingBalance status")
      .sort({ date: -1 })
      .lean();

    res.json(ledgers);
  } catch (error) {
    console.error("Error fetching fund ledger:", error);
    res.status(500).json({ message: "Failed to fetch fund audit ledger" });
  }
};

// REVERSE a Fund Utilization Transaction (Admins Only - Restores stock & balance)
const reverseGovTransaction = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { id } = req.params;
    const { reason } = req.body;

    const originalTx = await GovTransaction.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!originalTx) {
      return res.status(404).json({ message: "Ledger transaction record not found" });
    }

    if (originalTx.isReversal) {
      return res.status(400).json({ message: "This transaction is already a reversal record" });
    }

    const fund = await GovGrant.findOne({ _id: originalTx.grantId });
    if (!fund) {
      return res.status(404).json({ message: "Associated Government Fund Account not found" });
    }

    // Restore Inventory Stock for material items
    if (originalTx.materialItems && originalTx.materialItems.length > 0) {
      for (const item of originalTx.materialItems) {
        if (item.productId) {
          const product = await Product.findOne({ _id: item.productId, tenantId });
          if (product) {
            product.stock += item.qty;
            await product.save();
          }
        }
      }
    }

    // Restore Fund Balances
    const restoredMaterial = Math.max(0, (fund.materialUtilized || 0) - (originalTx.materialAmount || 0));
    const restoredCash = Math.max(0, (fund.cashWithdrawn || 0) - (originalTx.cashWithdrawnAmount || 0));
    const restoredRemaining = fund.approvedBudget - (restoredMaterial + restoredCash);

    const balanceBefore = fund.remainingBalance;

    fund.materialUtilized = restoredMaterial;
    fund.cashWithdrawn = restoredCash;
    fund.remainingBalance = restoredRemaining;
    fund.status = restoredRemaining === fund.approvedBudget ? "Fund Active" : "Partially Utilized";
    await fund.save();

    // Generate Reversal Voucher Number
    const count = await GovTransaction.countDocuments({ tenantId });
    const currentYear = new Date().getFullYear();
    const voucherNumber = `REV-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    // Log Reversal Ledger Transaction
    const reversalLedger = await GovTransaction.create({
      tenantId,
      voucherNumber,
      grantId: fund._id,
      schoolId: originalTx.schoolId,
      fundNumber: fund.fundNumber,
      invoiceNumber: fund.invoiceNumber || "",
      type: "Reversal",
      materialItems: originalTx.materialItems || [],
      materialAmount: originalTx.materialAmount || 0,
      cashWithdrawnAmount: originalTx.cashWithdrawnAmount || 0,
      amount: originalTx.amount,
      balanceBefore,
      balanceAfter: restoredRemaining,
      teacherDetails: originalTx.teacherDetails || {},
      remarks: `Reversal of ${originalTx.voucherNumber}. Reason: ${reason || "Correction"}`,
      processedBy: req.user?.name || req.user?.email || "Admin",
      isReversal: true,
      reversalOfVoucherId: originalTx._id,
    });

    res.json({
      message: "Transaction reversed successfully. Stock and fund balance restored.",
      reversalVoucher: reversalLedger,
      updatedFund: fund,
    });
  } catch (error) {
    console.error("Error reversing transaction:", error);
    res.status(500).json({ message: "Failed to reverse transaction: " + error.message });
  }
};

// MANUAL ADJUSTMENT on Government Fund (Admins Only)
const manualAdjustFund = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { fundId } = req.params;
    const { adjustmentType, amount, remarks } = req.body;

    const adjVal = parseFloat(amount);
    if (isNaN(adjVal) || adjVal <= 0) {
      return res.status(400).json({ message: "Valid adjustment amount (> ₹0) is required" });
    }

    const fund = await GovGrant.findOne({ _id: fundId, tenantId, isDeleted: { $ne: true } });
    if (!fund) return res.status(404).json({ message: "Government Fund Account not found" });

    const balanceBefore = fund.remainingBalance;
    let balanceAfter = balanceBefore;

    if (adjustmentType === "Balance Return") {
      // Return balance increases remaining balance (reducing utilization)
      fund.remainingBalance = Math.min(fund.approvedBudget, fund.remainingBalance + adjVal);
      balanceAfter = fund.remainingBalance;
    } else {
      // Manual Adjustment deducts remaining balance
      if (adjVal > fund.remainingBalance) {
        return res.status(400).json({ message: `Adjustment amount (₹${adjVal}) exceeds remaining balance (₹${fund.remainingBalance})` });
      }
      fund.remainingBalance -= adjVal;
      balanceAfter = fund.remainingBalance;
    }

    fund.status = balanceAfter === 0 ? "Fully Utilized" : (balanceAfter === fund.approvedBudget ? "Fund Active" : "Partially Utilized");
    await fund.save();

    const count = await GovTransaction.countDocuments({ tenantId });
    const currentYear = new Date().getFullYear();
    const voucherNumber = `ADJ-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    const ledgerEntry = await GovTransaction.create({
      tenantId,
      voucherNumber,
      grantId: fund._id,
      schoolId: fund.schoolId,
      fundNumber: fund.fundNumber,
      invoiceNumber: fund.invoiceNumber || "",
      type: adjustmentType || "Manual Adjustment",
      adjustmentAmount: adjVal,
      amount: adjVal,
      balanceBefore,
      balanceAfter,
      remarks: remarks || "Manual adjustment by Admin",
      processedBy: req.user?.name || req.user?.email || "Admin",
    });

    res.json({ message: "Manual adjustment logged successfully", fund, voucher: ledgerEntry });
  } catch (error) {
    console.error("Error performing manual adjustment:", error);
    res.status(500).json({ message: "Failed to perform manual adjustment" });
  }
};

// GET Dashboard KPI Summary for Government School Funds
const getGovDashboardStats = async (req, res) => {
  try {
    const tenantId = req.user._id;

    const funds = await GovGrant.find({ tenantId, isDeleted: { $ne: true } })
      .populate("schoolId", "schoolName headmasterName")
      .lean();

    const schoolsCount = await GovSchool.countDocuments({ tenantId, isDeleted: { $ne: true } });

    let activeFundsCount = 0;
    let completedFundsCount = 0;
    let pendingApprovalsCount = 0;
    let expiredFundsCount = 0;

    let totalApprovedBudget = 0;
    let totalMaterialUtilized = 0;
    let totalCashWithdrawn = 0;
    let totalRemainingBalance = 0;

    funds.forEach((f) => {
      totalApprovedBudget += f.approvedBudget || 0;
      totalMaterialUtilized += f.materialUtilized || 0;
      totalCashWithdrawn += f.cashWithdrawn || 0;
      totalRemainingBalance += f.remainingBalance !== undefined ? f.remainingBalance : ((f.approvedBudget || 0) - (f.materialUtilized || 0) - (f.cashWithdrawn || 0));

      if (["Fund Active", "Partially Utilized"].includes(f.status)) activeFundsCount++;
      else if (f.status === "Fully Utilized" || f.status === "Closed") completedFundsCount++;
      else if (["Draft Invoice", "Invoice Issued", "Pending Approval"].includes(f.status)) pendingApprovalsCount++;
      else if (f.status === "Expired") expiredFundsCount++;
    });

    const recentLedgers = await GovTransaction.find({ tenantId, isDeleted: { $ne: true } })
      .populate("schoolId", "schoolName")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    res.json({
      kpis: {
        schoolsCount,
        fundsCount: funds.length,
        activeFundsCount,
        completedFundsCount,
        pendingApprovalsCount,
        expiredFundsCount,
        totalApprovedBudget,
        totalMaterialUtilized,
        totalCashWithdrawn,
        totalRemainingBalance,
      },
      funds,
      recentLedgers,
    });
  } catch (error) {
    console.error("Error fetching gov dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard analytics" });
  }
};

// GET PDF for a Voucher (Stream / Download PDF file)
const getVoucherPdf = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { id } = req.params;

    const voucher = await GovTransaction.findOne({ _id: id, tenantId, isDeleted: { $ne: true } })
      .populate("schoolId", "schoolName headmasterName contactNumber")
      .populate("grantId", "fundNumber invoiceNumber approvedBudget");

    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    const merchantInfo = {
      ...(req.user?.profile || {}),
      shopName: req.user?.profile?.shopName || req.user?.businessName || "Smart Ledger",
      firmName: req.user?.profile?.shopName || req.user?.businessName || "Smart Ledger",
      address: req.user?.profile?.businessAddress || "",
      mobileNumber: req.user?.profile?.mobileNumber || req.user?.mobileNumber || "",
      phone: req.user?.profile?.mobileNumber || req.user?.mobileNumber || "",
      gstNumber: req.user?.profile?.gstNumber || "",
    };

    if (!voucher.pdfUrl) {
      const pdfUrl = await generateGovVoucherPDF(voucher, merchantInfo);
      voucher.pdfUrl = pdfUrl;
      await voucher.save();
    }

    const filePath = path.join(__dirname, "..", voucher.pdfUrl);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="voucher-${voucher.voucherNumber || id}.pdf"`);
      res.sendFile(filePath);
    } else {
      const pdfUrl = await generateGovVoucherPDF(voucher, merchantInfo);
      voucher.pdfUrl = pdfUrl;
      await voucher.save();
      const newPath = path.join(__dirname, "..", pdfUrl);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="voucher-${voucher.voucherNumber || id}.pdf"`);
      res.sendFile(newPath);
    }
  } catch (error) {
    console.error("Error streaming voucher PDF:", error);
    res.status(500).json({ message: "Failed to stream voucher PDF" });
  }
};

module.exports = {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getSchoolDetails,
  getSchoolFundStats,
  getGovFunds,
  createGovFund,
  activateGovFund,
  processFundUtilization,
  getFundLedger,
  reverseGovTransaction,
  manualAdjustFund,
  getGovDashboardStats,
  getVoucherPdf,
};
