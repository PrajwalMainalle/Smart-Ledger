const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const drawPageDecorations = (doc, pageNum) => {
  // Save bottom margin to prevent auto page break
  const oldBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  // Single crisp outer border wrapping the whole sheet
  doc.roundedRect(20, 20, doc.page.width - 40, doc.page.height - 40, 8).lineWidth(1.25).stroke("#334155");
  
  // Footer page numbering
  const fontRegular = doc.customFontRegular || "Helvetica";
  doc.fillColor("#64748b").font(fontRegular).fontSize(7.5);
  doc.text(`Page ${pageNum}`, 35, doc.page.height - 32, { align: "right", width: doc.page.width - 70 });

  // Restore bottom margin
  doc.page.margins.bottom = oldBottomMargin;
};

const drawPageHeader = (doc, invoice, tenant, pageNum, customer = null) => {
  const margin = 35;
  const pageWidth = doc.page.width;
  const printWidth = pageWidth - 2 * margin;
  
  const profile = tenant.profile || {};
  const shopName = profile.shopName || tenant.businessName || "Smart Ledger";
  const address = profile.businessAddress || "";
  const phone = profile.mobileNumber || tenant.mobileNumber || "";
  const gstNumber = profile.gstNumber || "";
  
  const primaryColor = "#034b54"; // Dark Teal
  const accentColor = "#d97706";  // Amber / Gold
  const textDark = "#0f172a";
  const textMuted = "#64748b";
  const borderColor = "#334155";

  const fontRegular = doc.customFontRegular || "Helvetica";
  const fontBold = doc.customFontBold || "Helvetica-Bold";

  // Outline decorations
  drawPageDecorations(doc, pageNum);

  if (pageNum === 1) {
    // 1. Top Left Dark-Teal Badge for Logo
    const badgeX = 20;
    const badgeY = 20;
    const badgeW = 68;
    const badgeH = 68;

    doc.save();
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8).fill(primaryColor);
    doc.path(`M ${badgeX + badgeW - 15} ${badgeY + badgeH} Q ${badgeX + badgeW} ${badgeY + badgeH} ${badgeX + badgeW} ${badgeY + badgeH - 15}`)
       .lineWidth(2.5).stroke(accentColor);
    doc.restore();

    // Helper to get business initials if no logo is uploaded
    const getInitials = (name) => {
      if (!name) return "BT";
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    };

    // Embed logo inside top-left badge
    let logoBuffer = null;
    if (profile.logo && typeof profile.logo === "string") {
      if (profile.logo.startsWith("data:image")) {
        try {
          const base64Data = profile.logo.replace(/^data:image\/\w+;base64,/, "");
          logoBuffer = Buffer.from(base64Data, "base64");
        } catch (e) {}
      } else if (fs.existsSync(profile.logo)) {
        try {
          logoBuffer = fs.readFileSync(profile.logo);
        } catch (e) {}
      } else if (profile.logo.trim().length > 50) {
        try {
          logoBuffer = Buffer.from(profile.logo, "base64");
        } catch (e) {}
      }
    }

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, badgeX + 10, badgeY + 10, { width: 48, height: 48, fit: [48, 48], align: 'center', valing: 'center' });
      } catch (e) {
        doc.fillColor("#ffffff").font(fontBold).fontSize(20).text(getInitials(shopName), badgeX + 4, badgeY + 22, { width: 60, align: "center" });
      }
    } else {
      try {
        doc.fillColor("#ffffff").font(fontBold).fontSize(20).text(getInitials(shopName), badgeX + 4, badgeY + 22, { width: 60, align: "center" });
      } catch (e) {}
    }

    // 2. Top Right GSTIN & Mobile Info
    let topRightY = margin + 8;
    if (invoice.isGstBilling !== false || invoice.isQuotation === true) {
      doc.font(fontBold).fontSize(8.5).fillColor(textDark).text(`GSTIN ${gstNumber}`, pageWidth - margin - 200, topRightY, { align: "right", width: 200 });
      topRightY += 14;
    }
    doc.font(fontBold).fontSize(8.5).fillColor(textDark).text(`Mobile ${phone}`, pageWidth - margin - 200, topRightY, { align: "right", width: 200 });

    // 3. Centered Header Branding, Subtitle & Store Address
    const brandStartY = margin + 4;
    const logoRightX = margin + 60;
    const centerAreaWidth = printWidth - 140;

    doc.fillColor(primaryColor).font(fontBold).fontSize(19).text(shopName.toUpperCase(), logoRightX, brandStartY, { align: "center", width: centerAreaWidth });
    if (profile.tagline) {
      doc.fillColor(accentColor).font(fontBold).fontSize(8.5).text(profile.tagline.toUpperCase(), logoRightX, brandStartY + 23, { align: "center", width: centerAreaWidth });
    }

    // Store Address
    let addressParts = [];
    if (profile.businessAddress) addressParts.push(profile.businessAddress.trim());
    if (profile.pincode) addressParts.push(profile.pincode.trim());
    if (profile.state) addressParts.push(profile.state.trim());
    const storeAddressStr = addressParts.join(", ");

    doc.fillColor("#334155").font(fontBold).fontSize(7.5).text(storeAddressStr, logoRightX, brandStartY + 35, { align: "center", width: centerAreaWidth });

    // Gold accent horizontal divider line
    const lineY = margin + badgeH + 18;
    doc.moveTo(margin + 20, lineY).lineTo(pageWidth - margin - 20, lineY).lineWidth(1).stroke(accentColor);

    // Tagline / Description
    const tagText = profile.businessDescription || "Office Stationery • School Items • Note Books • Xerox Papers • Sports Items • Computer Materials & More";
    doc.fillColor("#475569").font(fontBold).fontSize(7).text(tagText, margin + 10, lineY + 6, { align: "center", width: printWidth - 20 });

    // 4. Document Title with Side Accent Lines
    const titleY = lineY + 26;
    const isGst = invoice.isGstBilling !== false;
    const titleText = invoice.isQuotation
      ? "Estimate / Quotation"
      : (isGst ? "Tax Invoice" : `${(invoice.paymentMethod || "CASH").toUpperCase()} BILL`);
    
    doc.fillColor(primaryColor).font(fontBold).fontSize(14).text(titleText, margin, titleY, { align: "center", width: printWidth });
    const textWidth = doc.widthOfString(titleText);
    const sideLineLen = 60;
    doc.moveTo((pageWidth - textWidth) / 2 - sideLineLen - 10, titleY + 8).lineTo((pageWidth - textWidth) / 2 - 10, titleY + 8).lineWidth(0.5).stroke("#cbd5e1");
    doc.moveTo((pageWidth + textWidth) / 2 + 10, titleY + 8).lineTo((pageWidth + textWidth) / 2 + sideLineLen + 10, titleY + 8).lineWidth(0.5).stroke("#cbd5e1");

    // 5. Metadata 2-Column Section (INVOICE NO, DATE, BILLED TO, PHONE)
    const metaY = titleY + 26;
    const rightColX = pageWidth - margin - 150;

    // Left Side: Invoice No & Customer
    doc.fillColor(textMuted).font(fontBold).fontSize(7.5).text("INVOICE NO.", margin + 5, metaY);
    doc.fillColor(textDark).font(fontBold).fontSize(9.5).text(invoice.invoiceId, margin + 5, metaY + 11);

    doc.fillColor(textMuted).font(fontBold).fontSize(7.5).text("BILLED TO", margin + 5, metaY + 28);
    doc.fillColor(textDark).font(fontBold).fontSize(9.5).text(invoice.customerName.toUpperCase(), margin + 5, metaY + 39);

    // Right Side: Date & Phone
    doc.fillColor(textMuted).font(fontBold).fontSize(7.5).text("DATE", rightColX, metaY, { align: "right", width: 145 });
    doc.fillColor(textDark).font(fontBold).fontSize(9.5).text(new Date(invoice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), rightColX, metaY + 11, { align: "right", width: 145 });

    doc.fillColor(textMuted).font(fontBold).fontSize(7.5).text("PHONE", rightColX, metaY + 28, { align: "right", width: 145 });
    const custPhone = (invoice.customerPhone && invoice.customerPhone !== "N/A") ? invoice.customerPhone : "N/A";
    doc.fillColor(textDark).font(fontBold).fontSize(9.5).text(custPhone, rightColX, metaY + 39, { align: "right", width: 145 });

    let offset = 0;
    if (customer && customer.gstNumber) {
      doc.fillColor(textMuted).font(fontBold).fontSize(7.5).text("GSTIN", margin + 5, metaY + 56);
      doc.fillColor(textDark).font(fontBold).fontSize(9).text(customer.gstNumber.toUpperCase(), margin + 5, metaY + 66);
      offset += 20;
    }

    const isCredit = invoice.paymentMethod === "Credit";
    const isSplit = invoice.paymentMethod === "Split";
    if (isCredit || isSplit) {
      if (invoice.outstandingAmount > 0) {
        doc.font(fontBold).fontSize(8);
        doc.fillColor("#b91c1c"); // red
        doc.text(isCredit ? "STATUS: UNPAID (CREDIT OUTSTANDING)" : "STATUS: PARTIALLY PAID (CREDIT OUTSTANDING)", margin + 5, metaY + 56 + offset);
        doc.fillColor(textDark);
        offset += 14;
      } else if (isCredit && invoice.creditSettled) {
        doc.font(fontBold).fontSize(8);
        doc.fillColor("#16a34a"); // green
        doc.text(`STATUS: SETTLED via ${invoice.settlementMethod.toUpperCase()} on ${new Date(invoice.settlementDate).toLocaleDateString("en-IN")}`, margin + 5, metaY + 56 + offset);
        doc.fillColor(textDark);
        offset += 14;
      }
    }

    return metaY + 58 + offset;
  } else {
    // Page 2+ compact header
    doc.fillColor(primaryColor).font(fontBold).fontSize(10);
    doc.text(shopName.toUpperCase(), margin + 5, margin + 5);
    
    const isGst = invoice.isGstBilling !== false;
    const titleText = invoice.isQuotation
      ? `Estimate / Quotation (Page ${pageNum})`
      : (isGst ? `Tax Invoice (Page ${pageNum})` : `${(invoice.paymentMethod || "CASH").toUpperCase()} BILL (Page ${pageNum})`);
    doc.text(titleText, margin + printWidth - 200, margin + 5, { align: "right", width: 195 });
    
    doc.fontSize(8.5).font(fontRegular).fillColor(textDark);
    doc.text(`Invoice NO: ${invoice.invoiceId}`, margin + 5, margin + 18);
    
    doc.moveTo(margin, margin + 30).lineTo(pageWidth - margin, margin + 30).lineWidth(0.5).stroke(borderColor);
    
    return margin + 35;
  }
};

const drawTableHeaders = (doc, startY) => {
  const margin = 35;
  const pageWidth = doc.page.width;
  const printWidth = pageWidth - 2 * margin;
  const primaryColor = "#034b54"; // Dark Teal
  
  const col1X = margin;
  const col2X = margin + 35;
  const col3X = margin + Math.round(printWidth * 0.54);
  const col4X = margin + Math.round(printWidth * 0.65);
  const col5X = margin + Math.round(printWidth * 0.81);
  const col6X = pageWidth - margin;

  const fontBold = doc.customFontBold || "Helvetica-Bold";

  // Solid dark teal table header row with rounded top corners
  doc.save();
  doc.roundedRect(margin, startY, printWidth, 22, 4).fill(primaryColor);
  doc.restore();
  
  // White header text
  doc.fillColor("#ffffff").font(fontBold).fontSize(8.5);
  doc.text("S.NO", col1X + 5, startY + 6, { width: col2X - col1X - 8, align: "center" });
  doc.text("PARTICULARS", col2X + 8, startY + 6);
  doc.text("QTY", col3X + 2, startY + 6, { width: col4X - col3X - 4, align: "center" });
  doc.text("RATE", col4X + 2, startY + 6, { width: col5X - col4X - 6, align: "right" });
  doc.text("AMOUNT", col5X + 2, startY + 6, { width: col6X - col5X - 6, align: "right" });
};

const resolveInvoiceUpiId = (invoice, tenant) => {
  if (invoice && invoice.upiIdUsed && invoice.upiIdUsed.trim() !== "") {
    return invoice.upiIdUsed.trim();
  }
  const isGst = invoice?.isGstBilling !== false;
  const configuredUpi = isGst ? tenant?.profile?.gstUpiId : tenant?.profile?.nonGstUpiId;
  if (configuredUpi && configuredUpi.trim() !== "") {
    return configuredUpi.trim();
  }
  return "";
};

const generateInvoicePDF = (invoice, tenant, target, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const hasGst = invoice.isGstBilling !== false || invoice.isQuotation === true;
      const upiVpa = resolveInvoiceUpiId(invoice, tenant);
      const merchantName = encodeURIComponent(tenant?.profile?.shopName || tenant?.businessName || "Store Merchant");
      let qrBuffer = null;

      if (upiVpa) {
        try {
          const qrAmount = invoice.paymentMethod === "Split" ? (invoice.upiAmount || 0) : invoice.total;
          const upiString = `upi://pay?pa=${upiVpa}&pn=${merchantName}&cu=INR&am=${qrAmount.toFixed(2)}`;
          // High-DPI 800px buffer, margin 3 quiet-zone, Error Correction 'H' for crystal clear scanning on A5 paper
          qrBuffer = await QRCode.toBuffer(upiString, { width: 800, margin: 3, errorCorrectionLevel: "H" });
        } catch (qrErr) {
          console.error("Failed to generate QR Code for invoice PDF:", qrErr);
        }
      }

      let pdfPageSize = "A4";
      if (options.pageSize && options.pageSize !== "auto") {
        pdfPageSize = options.pageSize.toUpperCase();
      }
      let pdfLayout = "portrait";
      if (options.orientation) {
        pdfLayout = options.orientation.toLowerCase();
      }

      const doc = new PDFDocument({
        size: pdfPageSize,
        layout: pdfLayout,
        margin: pdfPageSize === "A5" ? 22 : 35,
        bufferPages: true,
        info: {
          Title: `${invoice.isQuotation ? "Quotation" : "Invoice"}_${invoice.invoiceId}`,
          Author: tenant.businessName || tenant.profile?.shopName || "Smart Ledger",
        },
      });

      // Register system font supporting Unicode Rupee symbol (₹)
      const fontCandidatesRegular = [
        path.join(__dirname, "..", "assets", "fonts", "segoeui.ttf"),
        path.join(__dirname, "..", "assets", "fonts", "Nirmala.ttf"),
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arial.ttf"
      ];
      const fontCandidatesBold = [
        path.join(__dirname, "..", "assets", "fonts", "segoeuib.ttf"),
        path.join(__dirname, "..", "assets", "fonts", "NirmalaBD.ttf"),
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf"
      ];

      for (const fPath of fontCandidatesRegular) {
        if (fs.existsSync(fPath)) {
          try {
            doc.registerFont("CustomRegular", fPath);
            doc.customFontRegular = "CustomRegular";
            break;
          } catch(e) {}
        }
      }

      for (const fPath of fontCandidatesBold) {
        if (fs.existsSync(fPath)) {
          try {
            doc.registerFont("CustomBold", fPath);
            doc.customFontBold = "CustomBold";
            break;
          } catch(e) {}
        }
      }

      const fontRegular = doc.customFontRegular || "Helvetica";
      const fontBold = doc.customFontBold || "Helvetica-Bold";

      let stream;
      if (typeof target === "string") {
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        stream = fs.createWriteStream(target);
      } else {
        stream = target;
      }

      if (stream && typeof stream.on === "function") {
        stream.on("error", (err) => {
          reject(err);
        });
      }

      doc.pipe(stream);

      let currentPage = 1;
      let y = drawPageHeader(doc, invoice, tenant, currentPage, options.customer);
      drawTableHeaders(doc, y);
      y += 24;

      const margin = 35;
      const pageWidth = doc.page.width;
      const printWidth = pageWidth - 2 * margin;
      const primaryColor = "#034b54";
      const accentColor = "#d97706";
      const borderColor = "#cbd5e1";

      const col1X = margin;
      const col2X = margin + 35;
      const col3X = margin + Math.round(printWidth * 0.54);
      const col4X = margin + Math.round(printWidth * 0.65);
      const col5X = margin + Math.round(printWidth * 0.81);
      const col6X = pageWidth - margin;

      const discountAmount = invoice.discount || 0;
      let summaryRowsCount = 1; // Total row
      if (discountAmount > 0) summaryRowsCount++;
      if (hasGst) {
        summaryRowsCount += (invoice.igst > 0) ? 1 : 2; // IGST or CGST+SGST
      }
      summaryRowsCount++; // Grand Total row
      if (invoice.paymentMethod === "Credit" || invoice.paymentMethod === "Split") summaryRowsCount += 2;

      const grandTotalHeight = 32;
      const summaryHeight = summaryRowsCount * 20 + grandTotalHeight + 60;
      const bottomLimit = doc.page.height - margin - summaryHeight;

      // Print Table Items
      const currencySymbol = doc.customFontRegular ? "₹" : "Rs. ";
      invoice.items.forEach((item, index) => {
        if (y > bottomLimit) {
          doc.addPage();
          currentPage++;
          y = drawPageHeader(doc, invoice, tenant, currentPage, options.customer);
          drawTableHeaders(doc, y);
          y += 24;
        }

        const lineTotal = item.price * item.qty;
        doc.fillColor("#0f172a").font(fontRegular).fontSize(8.5);
        doc.text(String(index + 1), col1X + 5, y + 4, { width: col2X - col1X - 8, align: "center" });
        doc.text(item.name, col2X + 8, y + 4, { width: col3X - col2X - 12 });
        doc.text(String(item.qty), col3X + 2, y + 4, { width: col4X - col3X - 4, align: "center" });
        doc.text(`${currencySymbol} ${item.price.toFixed(2)}`, col4X + 2, y + 4, { width: col5X - col4X - 6, align: "right" });
        doc.font(fontBold).text(`${currencySymbol} ${lineTotal.toFixed(2)}`, col5X + 2, y + 4, { width: col6X - col5X - 6, align: "right" });

        // Row underline
        doc.moveTo(margin, y + 20).lineTo(pageWidth - margin, y + 20).lineWidth(0.75).stroke("#94a3b8");
        y += 20;
      });

      // Total Items Summary Row
      doc.moveTo(margin, y + 2).lineTo(pageWidth - margin, y + 2).lineWidth(1).stroke(borderColor);
      doc.fillColor(primaryColor).font(fontBold).fontSize(9);
      doc.text("Total", col2X + 8, y + 6);
      const totalQty = invoice.items.reduce((sum, item) => sum + item.qty, 0);
      doc.text(String(totalQty), col3X, y + 6, { width: col4X - col3X, align: "center" });
      doc.text(`${currencySymbol} ${invoice.subtotal.toFixed(2)}`, col5X + 2, y + 6, { width: col6X - col5X - 6, align: "right" });
      doc.moveTo(margin, y + 22).lineTo(pageWidth - margin, y + 22).lineWidth(0.5).stroke(borderColor);

      y += 28;

      const pillWidth = 240;
      const pillX = pageWidth - margin - pillWidth;

      // Round Off Row (if applicable)
      if (invoice.roundOff && Math.abs(invoice.roundOff) >= 0.01) {
        const roundOffVal = invoice.roundOff;
        const signStr = roundOffVal > 0 ? "+" : "";
        doc.fillColor("#475569").font(fontRegular).fontSize(8.5);
        doc.text("Round Off:", pillX + 12, y, { width: 90, align: "left" });
        doc.font(fontBold).text(`${signStr}${currencySymbol} ${roundOffVal.toFixed(2)}`, pillX + 110, y, { width: pillWidth - 122, align: "right" });
        y += 18;
      }

      // Grand Total Right-Aligned Pill Card
      const grandTotalLabel = invoice.isQuotation ? "GRAND TOTAL (EST.)" : "GRAND TOTAL (INCL. TAX)";
      const pillHeight = 30;
      
      doc.save();
      doc.roundedRect(pillX, y, pillWidth, pillHeight, 6).fill(primaryColor);
      doc.fillColor(accentColor).font(fontBold).fontSize(8.5).text(grandTotalLabel, pillX + 12, y + 9);
      doc.fillColor("#ffffff").font(fontBold).fontSize(13).text(`${currencySymbol} ${invoice.total.toFixed(2)}`, pillX + 110, y + 7, { align: "right", width: pillWidth - 122 });
      doc.restore();

      y += 42;

      // Footer Grid: Bank Account Details Card (Left) & Scan & Pay Card (Right)
      const footerCardHeight = 82;
      const cardWidth = Math.round((printWidth - 15) / 2);

      // Left Box: BANK ACCOUNT DETAILS (Only for GST Tax Invoices)
      const leftCardX = margin;
      doc.roundedRect(leftCardX, y, cardWidth, footerCardHeight, 6).lineWidth(0.75).stroke(borderColor);
      doc.fillColor(primaryColor).font(fontBold).fontSize(8.5).text("BANK ACCOUNT DETAILS", leftCardX + 12, y + 8);
      
      doc.fillColor("#0f172a").font(fontRegular).fontSize(7.5);
      const profile = tenant.profile || {};

      if (hasGst) {
        const accountHolder = (profile.accountHolderName || profile.shopName || tenant.businessName || "").toUpperCase();
        const bankNameStr = profile.bankName || "";
        const accountNumberStr = profile.accountNumber || "";
        const ifscCodeStr = profile.ifscCode || "";

        doc.font(fontBold).text("Account Name: ", leftCardX + 12, y + 23);
        doc.font(fontRegular).text(accountHolder || "N/A", leftCardX + 80, y + 23, { width: cardWidth - 90 });

        doc.font(fontBold).text("Bank Name: ", leftCardX + 12, y + 36);
        doc.font(fontRegular).text(bankNameStr || "N/A", leftCardX + 80, y + 36);

        doc.font(fontBold).text("A/C No: ", leftCardX + 12, y + 49);
        doc.font(fontRegular).text(accountNumberStr || "N/A", leftCardX + 80, y + 49);

        doc.font(fontBold).text("IFSC Code: ", leftCardX + 12, y + 62);
        doc.font(fontRegular).text(ifscCodeStr || "N/A", leftCardX + 80, y + 62);
      } else {
        doc.font(fontRegular).fontSize(8).fillColor("#94a3b8").text("N/A (Non-GST Estimate Bill)", leftCardX + 12, y + 36);
      }

      // Right Box: SCAN & PAY (UPI)
      const rightCardX = margin + cardWidth + 15;
      doc.roundedRect(rightCardX, y, cardWidth, footerCardHeight, 6).lineWidth(0.75).stroke(borderColor);
      doc.fillColor(primaryColor).font(fontBold).fontSize(8.5).text("SCAN & PAY (UPI)", rightCardX + 12, y + 8, { align: "center", width: cardWidth - 24 });

      if (qrBuffer) {
        try {
          doc.image(qrBuffer, rightCardX + 10, y + 15, { width: 56, height: 56 });
        } catch (imgErr) {}
      }

      const upiIdStr = upiVpa || "UPI QR Unconfigured";
      const qrAmount = invoice.paymentMethod === "Split" ? (invoice.upiAmount || 0) : invoice.total;
      doc.fillColor("#0f172a").font(fontRegular).fontSize(7.5);
      doc.text(`UPI ID: ${upiIdStr}`, rightCardX + (qrBuffer ? 72 : 10), y + 28, { width: cardWidth - (qrBuffer ? 80 : 20) });
      doc.fillColor(primaryColor).font(fontBold).fontSize(12).text(`${currencySymbol} ${qrAmount.toFixed(2)}`, rightCardX + (qrBuffer ? 72 : 10), y + 44, { width: cardWidth - (qrBuffer ? 80 : 20) });

      y += footerCardHeight + 25;

      // Bottom Sign-off
      doc.fillColor("#334155").font(fontRegular).fontSize(9);
      doc.text("Thank you, visit again.", margin + 5, y + 10);
      
      const sigX = pageWidth - margin - 150;
      doc.moveTo(sigX, y).lineTo(pageWidth - margin, y).lineWidth(0.5).stroke(borderColor);
      doc.fillColor(primaryColor).font(fontBold).fontSize(8.5).text("Authorized Signature", sigX, y + 6, { align: "center", width: 150 });

      doc.end();

      if (typeof target === "string") {
        stream.on("finish", () => {
          resolve(true);
        });
        stream.on("error", (err) => {
          reject(err);
        });
      } else {
        resolve(true);
      }

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoicePDF };
