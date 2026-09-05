const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generates and saves a Government Fund Utilization Voucher PDF
 * @param {Object} voucher - GovTransaction voucher object
 * @param {Object} merchantInfo - Shop / Merchant profile info
 * @returns {Promise<string>} - Returns relative URL of saved PDF e.g. "/uploads/vouchers/voucher-VOUCHER-2026-0001.pdf"
 */
const generateGovVoucherPDF = (voucher, merchantInfo = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure upload directory exists
      const uploadDir = path.join(__dirname, "../uploads/vouchers");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeVoucherNum = (voucher.voucherNumber || `VOUCHER-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `voucher-${safeVoucherNum}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const relativeUrl = `/uploads/vouchers/${fileName}`;

      const doc = new PDFDocument({ size: "A4", margin: 30 });
      const stream = fs.createWriteStream(filePath);

      stream.on("finish", () => {
        resolve(relativeUrl);
      });

      stream.on("error", (err) => {
        reject(err);
      });

      doc.pipe(stream);

      const margin = 30;
      const pageWidth = doc.page.width;
      const printWidth = pageWidth - 2 * margin;

      // Color Palette
      const primaryColor = "#0f172a"; // Slate 900
      const accentColor = "#d97706";  // Amber 600
      const tealColor = "#0d9488";    // Teal 600
      const lightBg = "#f8fafc";      // Slate 50
      const textDark = "#1e293b";
      const textMuted = "#64748b";
      const borderCol = "#cbd5e1";

      // 1. Outer Border
      doc.roundedRect(margin, margin, printWidth, doc.page.height - 2 * margin, 8)
         .lineWidth(1)
         .stroke(borderCol);

      let y = margin + 15;

      // 2. Header Banner
      const shopName = merchantInfo.shopName || merchantInfo.firmName || "Smart Ledger";
      const address = merchantInfo.businessAddress || merchantInfo.address || "";
      const phone = merchantInfo.phone || merchantInfo.mobileNumber || "";
      const gstNumber = merchantInfo.gstNumber || "";

      doc.font("Helvetica-Bold").fontSize(18).fillColor(primaryColor).text(shopName, margin, y, { align: "center" });
      y += 22;

      const contactSubtitle = [address, phone ? `Mobile: ${phone}` : ""].filter(Boolean).join(" | ");
      doc.font("Helvetica").fontSize(9).fillColor(textMuted).text(contactSubtitle, margin, y, { align: "center" });
      y += 14;

      if (gstNumber) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(textDark).text(`GSTIN: ${gstNumber}`, margin, y, { align: "center" });
        y += 16;
      }

      // Title Pill
      y += 5;
      const badgeW = 260;
      const badgeX = (pageWidth - badgeW) / 2;
      doc.roundedRect(badgeX, y, badgeW, 20, 10).fill(primaryColor);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff").text("GOVERNMENT FUND UTILIZATION VOUCHER", badgeX, y + 5, { align: "center", width: badgeW });
      y += 32;

      // 3. Voucher Key Details Box
      const detailsBoxY = y;
      const detailsBoxH = 65;
      doc.roundedRect(margin + 10, detailsBoxY, printWidth - 20, detailsBoxH, 6).fillAndStroke(lightBg, borderCol);

      const col1X = margin + 20;
      const col2X = margin + (printWidth / 2) + 10;
      let textY = detailsBoxY + 8;

      const formattedDate = voucher.date ? new Date(voucher.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : new Date().toLocaleString("en-IN");
      const teacher = voucher.teacherDetails || {};

      // Left Column
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("Voucher No: ", col1X, textY, { continued: true });
      doc.font("Helvetica-Bold").fillColor(primaryColor).text(voucher.voucherNumber);
      textY += 13;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("Fund Account No: ", col1X, textY, { continued: true });
      doc.font("Helvetica").fillColor(textDark).text(voucher.fundNumber || voucher.grantId?.fundNumber || "N/A");
      textY += 13;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("Ref Tax Invoice: ", col1X, textY, { continued: true });
      doc.font("Helvetica").fillColor(textDark).text(voucher.invoiceNumber || voucher.grantId?.invoiceNumber || "N/A");
      textY += 13;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("Date & Time: ", col1X, textY, { continued: true });
      doc.font("Helvetica").fillColor(textDark).text(formattedDate);

      // Right Column
      textY = detailsBoxY + 8;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("School Name: ", col2X, textY, { continued: true });
      doc.font("Helvetica-Bold").fillColor(textDark).text(voucher.schoolId?.schoolName || "Government School");
      textY += 13;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("Teacher / Receiver: ", col2X, textY, { continued: true });
      doc.font("Helvetica").fillColor(textDark).text(teacher.name || "Headmaster");
      textY += 13;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("Mobile / Designation: ", col2X, textY, { continued: true });
      doc.font("Helvetica").fillColor(textDark).text(teacher.mobile ? `${teacher.mobile} (${teacher.designation || "Teacher"})` : (teacher.designation || "N/A"));
      textY += 13;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted).text("Transaction Type: ", col2X, textY, { continued: true });
      doc.font("Helvetica-Bold").fillColor(accentColor).text(voucher.type);

      y = detailsBoxY + detailsBoxH + 15;

      // 4. Material Items Table (if any)
      const materialItems = voucher.materialItems || [];
      const materialAmount = voucher.materialAmount || 0;

      if (materialItems.length > 0) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(primaryColor).text("MATERIALS ISSUED ITEMS LIST", margin + 10, y);
        y += 14;

        const tableX = margin + 10;
        const tableW = printWidth - 20;
        const rowH = 18;

        // Table Header
        doc.rect(tableX, y, tableW, rowH).fill("#e2e8f0");
        doc.font("Helvetica-Bold").fontSize(8).fillColor(textDark);
        doc.text("#", tableX + 5, y + 5, { width: 25 });
        doc.text("Item Name & Description", tableX + 35, y + 5, { width: 220 });
        doc.text("Rate (INR)", tableX + 260, y + 5, { width: 70, align: "right" });
        doc.text("Qty", tableX + 340, y + 5, { width: 40, align: "center" });
        doc.text("Total Amount (INR)", tableX + 390, y + 5, { width: 100, align: "right" });
        y += rowH;

        // Table Rows
        doc.font("Helvetica").fontSize(8).fillColor(textDark);
        materialItems.forEach((item, idx) => {
          doc.rect(tableX, y, tableW, rowH).stroke(borderCol);
          doc.text((idx + 1).toString(), tableX + 5, y + 5, { width: 25 });
          doc.text(item.name || "Item", tableX + 35, y + 5, { width: 220 });
          doc.text(`INR ${Number(item.price || 0).toFixed(2)}`, tableX + 260, y + 5, { width: 70, align: "right" });
          doc.text((item.qty || 1).toString(), tableX + 340, y + 5, { width: 40, align: "center" });
          doc.text(`INR ${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}`, tableX + 390, y + 5, { width: 100, align: "right" });
          y += rowH;
        });

        // Table Footer Subtotal
        doc.rect(tableX, y, tableW, rowH).fill("#f1f5f9");
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(primaryColor);
        doc.text("Subtotal Material Issued:", tableX + 200, y + 5, { width: 180, align: "right" });
        doc.text(`INR ${materialAmount.toFixed(2)}`, tableX + 390, y + 5, { width: 100, align: "right" });
        y += rowH + 15;
      }

      // 5. Cash Withdrawal Section (if any)
      const cashAmount = voucher.cashWithdrawnAmount || voucher.cashAmount || 0;
      if (cashAmount > 0) {
        const cashBoxY = y;
        doc.roundedRect(margin + 10, cashBoxY, printWidth - 20, 24, 4).fillAndStroke("#fffbeb", "#fde68a");
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#92400e")
           .text("Cash Withdrawal Amount:", margin + 20, cashBoxY + 7);
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#92400e")
           .text(`INR ${cashAmount.toFixed(2)}`, margin + printWidth - 140, cashBoxY + 6, { width: 120, align: "right" });
        y += 34;
      }

      // 6. Fund Balance Breakdown Card
      const summaryBoxY = y;
      const summaryBoxH = 36;
      doc.roundedRect(margin + 10, summaryBoxY, printWidth - 20, summaryBoxH, 6).fill(primaryColor);

      const sectionW = (printWidth - 20) / 3;

      // Balance Before
      doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text("Balance Before", margin + 10, summaryBoxY + 6, { width: sectionW, align: "center" });
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff").text(`INR ${(voucher.balanceBefore || 0).toFixed(2)}`, margin + 10, summaryBoxY + 18, { width: sectionW, align: "center" });

      // Total Deducted
      doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text("Voucher Total Deducted", margin + 10 + sectionW, summaryBoxY + 6, { width: sectionW, align: "center" });
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#f59e0b").text(`INR ${(voucher.amount || 0).toFixed(2)}`, margin + 10 + sectionW, summaryBoxY + 18, { width: sectionW, align: "center" });

      // Remaining Balance
      doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text("Remaining Fund Balance", margin + 10 + (2 * sectionW), summaryBoxY + 6, { width: sectionW, align: "center" });
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#34d399").text(`INR ${(voucher.balanceAfter || 0).toFixed(2)}`, margin + 10 + (2 * sectionW), summaryBoxY + 18, { width: sectionW, align: "center" });

      y += summaryBoxH + 15;

      // 7. Remarks
      if (voucher.remarks) {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor(textMuted).text(`Remarks: ${voucher.remarks}`, margin + 10, y, { width: printWidth - 20 });
        y += 18;
      }

      // 8. Signatures Block
      let sigY = doc.page.height - margin - 75;
      if (y > sigY - 30) {
        doc.addPage();
        // Redraw Outer Border on page 2
        doc.roundedRect(margin, margin, printWidth, doc.page.height - 2 * margin, 8)
           .lineWidth(1)
           .stroke(borderCol);
        sigY = doc.page.height - margin - 75;
      }

      const sigColW = (printWidth - 60) / 2;

      // Receiver Signature
      doc.moveTo(margin + 20, sigY).lineTo(margin + 20 + sigColW, sigY).lineWidth(0.75).stroke(borderCol);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textDark).text("Receiver / Teacher Signature", margin + 20, sigY + 5, { width: sigColW, align: "center" });
      doc.font("Helvetica").fontSize(7.5).fillColor(textMuted).text(`(${teacher.name || "Headmaster / Authorized Teacher"})`, margin + 20, sigY + 16, { width: sigColW, align: "center" });

      // Store Signatory
      doc.moveTo(margin + 40 + sigColW, sigY).lineTo(margin + 40 + (2 * sigColW), sigY).lineWidth(0.75).stroke(borderCol);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textDark).text("Authorized Store Signatory", margin + 40 + sigColW, sigY + 5, { width: sigColW, align: "center" });
      doc.font("Helvetica").fontSize(7.5).fillColor(textMuted).text(`(${shopName})`, margin + 40 + sigColW, sigY + 16, { width: sigColW, align: "center" });

      // Footer disclaimer
      doc.font("Helvetica").fontSize(7).fillColor(textMuted).text(
        "This is an official Government Fund Utilization Voucher. Initial Revenue & Tax Invoice was recorded upon Government Invoice issuance.",
        margin + 10,
        doc.page.height - margin - 22,
        { width: printWidth - 20, align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateGovVoucherPDF };
