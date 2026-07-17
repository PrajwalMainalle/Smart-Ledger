const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const drawPageDecorations = (doc, pageNum) => {
  // Save bottom margin to prevent auto page break
  const oldBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  // Double outline border design (olive green)
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(1).stroke("#6b8e23");
  doc.rect(23, 23, doc.page.width - 46, doc.page.height - 46).lineWidth(0.5).stroke("#6b8e23");
  
  // Simple footer page numbering
  const fontRegular = doc.customFontRegular || "Helvetica";
  doc.fillColor("#64748b").font(fontRegular).fontSize(7.5);
  doc.text(`Page ${pageNum}`, 35, doc.page.height - 32, { align: "right", width: doc.page.width - 70 });

  // Restore bottom margin
  doc.page.margins.bottom = oldBottomMargin;
};

const drawPageHeader = (doc, invoice, tenant, pageNum) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const printWidth = pageWidth - 2 * margin;
  
  const profile = tenant.profile || {};
  const shopName = profile.shopName || tenant.businessName || "SmartLedger";
  const address = profile.businessAddress || "N/A Address";
  const phone = profile.mobileNumber || tenant.mobileNumber || "9845757296";
  const gstNumber = profile.gstNumber || "29ANOPM8542Q1ZU";
  
  const primaryColor = "#0f172a";
  const bannerBg = "#6b8e23"; // Olive Green
  const bannerLightBg = "#e2ebc8"; // Light Olive Green
  const borderColor = "#94a3b8";

  const fontRegular = doc.customFontRegular || "Helvetica";
  const fontBold = doc.customFontBold || "Helvetica-Bold";

  // Outline decorations
  drawPageDecorations(doc, pageNum);

  if (pageNum === 1) {
    // 1. Light-green top banner
    doc.rect(margin, margin, printWidth, 20).fill(bannerLightBg);
    doc.fillColor(primaryColor).font(fontBold).fontSize(8.5);
    if (invoice.isGstBilling !== false) {
      doc.text(`.REG.GSTIN-${gstNumber}`, margin + 8, margin + 6);
    }
    doc.text(`MOBILE: ${phone}`, margin + printWidth - 140, margin + 6, { align: "right", width: 130 });

    // 2. Centered logo (if exists) & Olive green branding block banner
    let textStartY = margin + 20;
    let logoDrawn = false;

    if (profile.logo && profile.logo.startsWith("data:image")) {
      try {
        const base64Data = profile.logo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        doc.image(buffer, (pageWidth - 40) / 2, margin + 25, { width: 40, height: 40 });
        logoDrawn = true;
        textStartY += 48;
      } catch (e) {
        console.error("Failed to draw logo inside PDF:", e.message);
      }
    } else {
      try {
        const defaultLogoPath = path.join(__dirname, "..", "assets", "SLLogo.png");
        if (fs.existsSync(defaultLogoPath)) {
          doc.image(defaultLogoPath, (pageWidth - 40) / 2, margin + 25, { width: 40, height: 40 });
          logoDrawn = true;
          textStartY += 48;
        }
      } catch (e) {
        // Silent fail
      }
    }

    doc.rect(margin, textStartY, printWidth, 40).fill(bannerBg);
    doc.fillColor("#ffffff").font(fontBold).fontSize(18).text(shopName.toUpperCase(), margin, textStartY + 6, { align: "center", width: printWidth });
    doc.fontSize(9.5).text("WHOLE SALER'S", margin, textStartY + 26, { align: "center", width: printWidth });

    // 3. Light green address and tagline block
    doc.rect(margin, textStartY + 40, printWidth, 40).fill(bannerLightBg);
    doc.fillColor(primaryColor).font(fontBold).fontSize(8).text(address.toUpperCase(), margin + 10, textStartY + 46, { align: "center", width: printWidth - 20 });
    
    const tagText = profile.businessDescription || "OFFICE STATIONARY, SCHOOL ITEMS, ALL NOTE BOOKS, ZEROX PAPERS, SPORTS ITMES, COMPUTERS MATERIALS AND OTHERS MATERIALS";
    doc.font(fontRegular).fontSize(7.5).text(tagText.toUpperCase(), margin + 10, textStartY + 60, { align: "center", width: printWidth - 20 });

    // 4. Centered Title
    const titleY = textStartY + 95;
    const titleText = invoice.isQuotation ? "ESTIMATE / QUOTATION" : `${invoice.paymentMethod.toUpperCase()} BILL`;
    doc.fillColor(primaryColor).font(fontBold).fontSize(13).text(titleText, margin, titleY, { align: "center", width: printWidth });
    
    const textWidth = doc.widthOfString(titleText);
    doc.moveTo((pageWidth - textWidth) / 2, titleY + 14).lineTo((pageWidth + textWidth) / 2, titleY + 14).stroke(primaryColor);

    // 5. Metadata fields
    const metaY = titleY + 25;
    doc.font(fontBold).fontSize(9.5);
    doc.text(`NO: ${invoice.invoiceId}`, margin + 5, metaY);
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString("en-IN")}`, margin + printWidth - 150, metaY, { align: "right", width: 145 });

    doc.text(`NAME: ${invoice.customerName.toUpperCase()}`, margin + 5, metaY + 15);
    if (invoice.customerPhone && invoice.customerPhone !== "N/A") {
      doc.text(`PHONE: ${invoice.customerPhone}`, margin + printWidth - 150, metaY + 15, { align: "right", width: 145 });
    }

    let offset = 0;
    const isCredit = invoice.paymentMethod === "Credit";
    const isSplit = invoice.paymentMethod === "Split";
    if (isCredit || isSplit) {
      if (invoice.outstandingAmount > 0) {
        offset = 12;
        doc.font(fontBold).fontSize(8.5);
        doc.fillColor("#b91c1c"); // red
        doc.text(isCredit ? "STATUS: UNPAID (CREDIT OUTSTANDING)" : "STATUS: PARTIALLY PAID (CREDIT OUTSTANDING)", margin + 5, metaY + 30);
        doc.fillColor("#000000"); // reset
      } else if (isCredit && invoice.creditSettled) {
        offset = 12;
        doc.font(fontBold).fontSize(8.5);
        doc.fillColor("#16a34a"); // green
        doc.text(`STATUS: SETTLED via ${invoice.settlementMethod.toUpperCase()} on ${new Date(invoice.settlementDate).toLocaleDateString("en-IN")}`, margin + 5, metaY + 30);
        doc.fillColor("#000000"); // reset
      }
    }

    doc.moveTo(margin, metaY + 30 + offset).lineTo(pageWidth - margin, metaY + 30 + offset).stroke(borderColor);
    
    return metaY + 36 + offset;
  } else {
    // Page 2+ compact header
    doc.fillColor(primaryColor).font(fontBold).fontSize(10);
    doc.text(shopName.toUpperCase(), margin + 5, margin + 5);
    
    const titleText = invoice.isQuotation ? `ESTIMATE / QUOTATION (Page ${pageNum})` : `${invoice.paymentMethod.toUpperCase()} BILL (Page ${pageNum})`;
    doc.text(titleText, margin + printWidth - 200, margin + 5, { align: "right", width: 195 });
    
    doc.fontSize(8.5).font(fontRegular);
    doc.text(`Invoice NO: ${invoice.invoiceId}`, margin + 5, margin + 18);
    
    doc.moveTo(margin, margin + 30).lineTo(pageWidth - margin, margin + 30).stroke(borderColor);
    
    return margin + 35;
  }
};

const drawTableHeaders = (doc, startY) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const printWidth = pageWidth - 2 * margin;
  const borderColor = "#94a3b8";
  
  const col1X = margin;
  const col2X = margin + 35;
  const col3X = margin + Math.round(printWidth * 0.60);
  const col4X = margin + Math.round(printWidth * 0.70);
  const col5X = margin + Math.round(printWidth * 0.82);

  const fontBold = doc.customFontBold || "Helvetica-Bold";

  // Draw header box border
  doc.rect(margin, startY, printWidth, 20).stroke(borderColor);
  
  // Draw header text
  doc.fillColor("#000000").font(fontBold).fontSize(8.5);
  doc.text("S.No", col1X + 5, startY + 6, { width: col2X - col1X - 10, align: "center" });
  doc.text("PARTICULARS", col2X + 8, startY + 6);
  doc.text("QTY", col3X + 2, startY + 6, { width: col4X - col3X - 4, align: "center" });
  doc.text("RATE", col4X + 2, startY + 6, { width: col5X - col4X - 4, align: "right" });
  doc.text("AMOUNT", col5X + 2, startY + 6, { width: (pageWidth - margin) - col5X - 4, align: "right" });

  // Draw vertical header lines
  doc.moveTo(col2X, startY).lineTo(col2X, startY + 20).stroke(borderColor);
  doc.moveTo(col3X, startY).lineTo(col3X, startY + 20).stroke(borderColor);
  doc.moveTo(col4X, startY).lineTo(col4X, startY + 20).stroke(borderColor);
  doc.moveTo(col5X, startY).lineTo(col5X, startY + 20).stroke(borderColor);
};

const generateInvoicePDF = (invoice, tenant, target, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const hasGst = invoice.isGstBilling !== false;
      let qrBuffer = null;
      if (!hasGst) {
        try {
          const qrPhone = invoice.total >= 5000 ? "6364676448" : "6361037157";
          const qrAmount = invoice.paymentMethod === "Split" ? (invoice.upiAmount || 0) : invoice.total;
          const upiString = `upi://pay?pa=${qrPhone}@ybl&pn=Bharatambe%20Traders&cu=INR&am=${qrAmount.toFixed(2)}`;
          qrBuffer = await QRCode.toBuffer(upiString, { width: 120, margin: 1 });
        } catch (qrErr) {
          console.error("Failed to generate QR Code for invoice PDF:", qrErr);
        }
      }
      // Determine page size and orientation
      let size = "A4";
      let layout = options.orientation || "portrait";
      
      if (options.pageSize === "A3") {
        size = "A3";
      } else if (options.pageSize === "A4") {
        size = "A4";
      } else if (options.pageSize === "auto") {
        // Auto sizing logic: If invoice has more than 12 items, default to A4, multi-page is handled dynamically.
        size = "A4";
      }

      const doc = new PDFDocument({ size: size, layout: layout, margin: 40 });

      // Font Registration for Indic (Kannada, Hindi, English) Scripts
      const localFontPath = path.join(__dirname, "..", "assets", "fonts", "Nirmala.ttc");
      const systemFontPath = "C:\\Windows\\Fonts\\Nirmala.ttc";
      let fontPath = "";
      
      if (fs.existsSync(localFontPath)) {
        fontPath = localFontPath;
      } else if (fs.existsSync(systemFontPath)) {
        fontPath = systemFontPath;
      }

      let hasNirmala = false;
      if (fontPath) {
        try {
          doc.registerFont("Nirmala", fontPath, "NirmalaUI");
          doc.registerFont("Nirmala-Bold", fontPath, "NirmalaUI-Bold");
          hasNirmala = true;
        } catch (fontErr) {
          console.error("Failed to register Nirmala font in PDFGenerator:", fontErr);
        }
      }

      doc.customFontRegular = hasNirmala ? "Nirmala" : "Helvetica";
      doc.customFontBold = hasNirmala ? "Nirmala-Bold" : "Helvetica-Bold";

      const fontRegular = doc.customFontRegular;
      const fontBold = doc.customFontBold;
      
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
      
      doc.pipe(stream);

      const margin = 40;
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const printWidth = pageWidth - 2 * margin;
      const borderColor = "#94a3b8";

      const col1X = margin;
      const col2X = margin + 35;
      const col3X = margin + Math.round(printWidth * 0.60);
      const col4X = margin + Math.round(printWidth * 0.70);
      const col5X = margin + Math.round(printWidth * 0.82);
      const col6X = pageWidth - margin;

      let pageNum = 1;
      let startY = drawPageHeader(doc, invoice, tenant, pageNum);
      drawTableHeaders(doc, startY);
      
      let currentY = startY + 20;
      const rowHeight = 22;

      invoice.items.forEach((item, idx) => {
        // Check for row overflow (leaving room at bottom)
        if (currentY + rowHeight > pageHeight - 120) {
          doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke(borderColor);
          
          doc.addPage();
          pageNum++;
          
          startY = drawPageHeader(doc, invoice, tenant, pageNum);
          drawTableHeaders(doc, startY);
          currentY = startY + 20;
        }

        // Draw text
        doc.fillColor("#000000").font(fontRegular).fontSize(8.5);
        doc.text(String(idx + 1), col1X, currentY + 6, { width: col2X - col1X, align: "center" });
        
        // Render item name (no toUpperCase to preserve exact case as stored in inventory)
        const displayItemName = item.name;
        doc.text(displayItemName, col2X + 8, currentY + 6, { width: col3X - col2X - 16, height: 12, ellipsis: true });
        
        doc.text(String(item.qty), col3X, currentY + 6, { width: col4X - col3X, align: "center" });
        doc.text(`₹${item.price.toFixed(2)}`, col4X, currentY + 6, { width: col5X - col4X - 5, align: "right" });
        
        const lineTotal = item.price * item.qty;
        doc.font(fontBold).text(`₹${lineTotal.toFixed(2)}`, col5X, currentY + 6, { width: col6X - col5X - 5, align: "right" });

        // Draw row borders
        doc.rect(margin, currentY, printWidth, rowHeight).stroke(borderColor);
        doc.moveTo(col2X, currentY).lineTo(col2X, currentY + rowHeight).stroke(borderColor);
        doc.moveTo(col3X, currentY).lineTo(col3X, currentY + rowHeight).stroke(borderColor);
        doc.moveTo(col4X, currentY).lineTo(col4X, currentY + rowHeight).stroke(borderColor);
        doc.moveTo(col5X, currentY).lineTo(col5X, currentY + rowHeight).stroke(borderColor);

        currentY += rowHeight;
      });

      // summary parameters
      const discountAmount = invoice.discountAmount || 0;
      const isCredit = invoice.paymentMethod === "Credit";
      const isSplit = invoice.paymentMethod === "Split";

      // Calculate height needed for calculations column
      let calcRowsHeight = 0;
      if (discountAmount > 0) calcRowsHeight += 20;
      if (hasGst) calcRowsHeight += 40;
      if (isCredit) calcRowsHeight += 40;
      if (isSplit) {
        calcRowsHeight += 40;
        if (invoice.outstandingAmount > 0) calcRowsHeight += 20;
      }

      // The Grand Total row needs at least 20 points, but expands if needed to ensure the box is at least 75 points tall (so bank details don't overflow)
      const grandTotalHeight = Math.max(20, 75 - 20 - (discountAmount > 0 ? 20 : 0) - (hasGst ? 40 : 0));
      const summaryHeight = 20 + calcRowsHeight + grandTotalHeight;

      // Check if we need another page for the summary rows + signature block
      if (currentY + summaryHeight + 80 > pageHeight - 40) {
        doc.addPage();
        pageNum++;
        startY = drawPageHeader(doc, invoice, tenant, pageNum);
        drawTableHeaders(doc, startY);
        currentY = startY + 20;
      }

      // 1. Draw outer summary box
      doc.rect(margin, currentY, printWidth, summaryHeight).stroke(borderColor);
      
      // Divider 1: Below TOTAL row (always, full width)
      doc.moveTo(margin, currentY + 20).lineTo(pageWidth - margin, currentY + 20).stroke(borderColor);

      // Intermediate calculation row dividers (right column only)
      let lineY = currentY + 20;
      if (discountAmount > 0) {
        lineY += 20;
        doc.moveTo(col3X, lineY).lineTo(pageWidth - margin, lineY).stroke(borderColor);
      }
      if (hasGst) {
        lineY += 20;
        doc.moveTo(col3X, lineY).lineTo(pageWidth - margin, lineY).stroke(borderColor);
        lineY += 20;
        doc.moveTo(col3X, lineY).lineTo(pageWidth - margin, lineY).stroke(borderColor);
      }
      
      // Divider below Grand Total (since we have extra rows under it for credit or split)
      if (isCredit || isSplit) {
        lineY += grandTotalHeight;
        doc.moveTo(col3X, lineY).lineTo(pageWidth - margin, lineY).stroke(borderColor);
        lineY += 20;
        doc.moveTo(col3X, lineY).lineTo(pageWidth - margin, lineY).stroke(borderColor);
        if (isSplit && invoice.outstandingAmount > 0) {
          lineY += 20;
          doc.moveTo(col3X, lineY).lineTo(pageWidth - margin, lineY).stroke(borderColor);
        }
      }

      // Row 1: TOTAL columns
      doc.moveTo(col2X, currentY).lineTo(col2X, currentY + 20).stroke(borderColor);
      doc.moveTo(col3X, currentY).lineTo(col3X, currentY + 20).stroke(borderColor);
      doc.moveTo(col4X, currentY).lineTo(col4X, currentY + 20).stroke(borderColor);
      doc.moveTo(col5X, currentY).lineTo(col5X, currentY + 20).stroke(borderColor);

      doc.fillColor("#000000").font(fontBold).fontSize(8.5);
      doc.text("TOTAL", col1X, currentY + 5, { width: col3X - col1X, align: "center" });

      const totalQty = invoice.items.reduce((sum, item) => sum + item.qty, 0);
      doc.text(String(totalQty), col3X, currentY + 5, { width: col4X - col3X, align: "center" });
      doc.text(`₹${invoice.subtotal.toFixed(2)}`, col5X, currentY + 5, { width: col6X - col5X - 5, align: "right" });

      // Rows 2+: Bank Details (left merged) vs Calculations (right)
      doc.moveTo(col3X, currentY + 20).lineTo(col3X, currentY + summaryHeight).stroke(borderColor);
      doc.moveTo(col5X, currentY + 20).lineTo(col5X, currentY + summaryHeight).stroke(borderColor);

      const bankDetailsY = currentY + 25;
      if (hasGst) {
        doc.fillColor("#000000").font(fontBold).fontSize(8);
        doc.text("BANK ACCOUNT DETAILS:", margin + 8, bankDetailsY);
        
        doc.fillColor("#000000").font(fontRegular).fontSize(7.5);
        const profile = tenant.profile || {};
        const shopNameStr = (profile.shopName || tenant.businessName || "SmartLedger").toUpperCase();
        doc.text(`Account Name:  ${shopNameStr}`, margin + 8, bankDetailsY + 11, { width: col3X - margin - 16 });
        doc.text("Bank Name:      CANARA BANK, BASAVAKALYAN BRANCH", margin + 8, bankDetailsY + 20, { width: col3X - margin - 16 });
        doc.text("A/C Number:     120033287950  |  IFSC Code: CNRB0010700", margin + 8, bankDetailsY + 29, { width: col3X - margin - 16 });
      } else if (invoice.paymentMethod === "Credit" && invoice.creditSettled) {
        doc.fillColor("#000000").font(fontBold).fontSize(8.5);
        doc.text("CREDIT STATUS:", margin + 8, bankDetailsY - 2);
        
        doc.fillColor("#000000").font(fontBold).fontSize(8);
        doc.text("FULLY SETTLED & PAID", margin + 8, bankDetailsY + 10);
        doc.font(fontRegular).fontSize(7);
        doc.text(`Method: ${invoice.settlementMethod.toUpperCase()}`, margin + 8, bankDetailsY + 19);
        doc.text(`Date:   ${new Date(invoice.settlementDate).toLocaleDateString("en-IN")}`, margin + 8, bankDetailsY + 27);
        doc.fillColor("#000000").fontSize(6.5).text("Thank you for your business!", margin + 8, bankDetailsY + 36);
      } else {
        doc.fillColor("#000000").font(fontBold).fontSize(8);
        doc.text("SCAN & PAY (UPI):", margin + 8, bankDetailsY - 2);
        
        if (qrBuffer) {
          try {
            doc.image(qrBuffer, margin + 8, bankDetailsY + 8, { width: 42, height: 42 });
          } catch (imgErr) {
            console.error("Failed to embed QR code image in PDF:", imgErr);
          }
        }
        
        doc.fillColor("#000000").font(fontBold).fontSize(7.5);
        doc.text("BHARATAMBE TRADERS", margin + 56, bankDetailsY + 10);
        const qrPhone = invoice.total >= 5000 ? "6364676448" : "6361037157";
        const qrAmount = invoice.paymentMethod === "Split" ? (invoice.upiAmount || 0) : invoice.total;
        doc.text(`Mobile: ${qrPhone}`, margin + 56, bankDetailsY + 18);
        doc.text(`Amount: ₹${qrAmount.toFixed(2)}`, margin + 56, bankDetailsY + 26);
        doc.fillColor("#000000").fontSize(6.5).text("Scan with GPay/PhonePe/Paytm", margin + 56, bankDetailsY + 34);
      }

      // Calculations right column
      let calcY = currentY + 20;

      if (discountAmount > 0) {
        doc.fillColor("#000000").font(fontBold).fontSize(7.5);
        doc.text("DISCOUNT", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
        doc.font(fontRegular).text(`-₹${discountAmount.toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
        calcY += 20;
      }

      if (hasGst) {
        const sgstAmt = invoice.gstAmount / 2;
        doc.fillColor("#000000").font(fontBold).fontSize(7.5);
        doc.text("SGST (State Tax)", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
        doc.font(fontRegular).text(`₹${sgstAmt.toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
        calcY += 20;

        doc.font(fontBold).text("CGST (Central Tax)", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
        doc.font(fontRegular).text(`₹${sgstAmt.toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
        calcY += 20;
      }

      const grandTotalLabel = invoice.isQuotation ? "ESTIMATED TOTAL" : "GRAND TOTAL";
      const cellPaddingY = (grandTotalHeight - 10) / 2;
      doc.font(fontBold).fontSize(9.5).fillColor("#000000");
      doc.text(grandTotalLabel, col3X, calcY + cellPaddingY, { width: col5X - col3X - 5, align: "right" });
      doc.text(`₹${invoice.total.toFixed(2)}`, col5X, calcY + cellPaddingY, { width: col6X - col5X - 5, align: "right" });
      calcY += grandTotalHeight;

      if (isCredit) {
        doc.fillColor("#000000").font(fontBold).fontSize(7.5);
        doc.text("AMOUNT PAID TODAY", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
        doc.font(fontRegular).text(`₹${(invoice.amountPaid || 0).toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
        calcY += 20;

        doc.font(fontBold).text("OUTSTANDING BALANCE", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
        doc.fillColor("#000000").text(`₹${(invoice.outstandingAmount || 0).toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
        calcY += 20;
      } else if (isSplit) {
        doc.fillColor("#000000").font(fontBold).fontSize(7.5);
        doc.text("CASH PAID", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
        doc.font(fontRegular).text(`₹${(invoice.cashAmount || 0).toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
        calcY += 20;

        doc.font(fontBold).text("UPI PAID", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
        doc.font(fontRegular).text(`₹${(invoice.upiAmount || 0).toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
        calcY += 20;

        if (invoice.outstandingAmount > 0) {
          doc.font(fontBold).text("OUTSTANDING BALANCE", col3X, calcY + 5, { width: col5X - col3X - 5, align: "right" });
          doc.fillColor("#000000").text(`₹${(invoice.outstandingAmount || 0).toFixed(2)}`, col5X, calcY + 5, { width: col6X - col5X - 5, align: "right" });
          calcY += 20;
        }
      }

      // Signatures row
      const footerY = currentY + summaryHeight + 20;
      doc.fillColor("#0f172a").font(fontRegular).fontSize(9);
      doc.text("Thanku visit again", margin + 10, footerY + 20);
      
      doc.font(fontBold).fontSize(9);
      doc.text("Authorized signature", col5X - 40, footerY + 20, { align: "right", width: col6X - col5X + 40 });
      doc.moveTo(col5X - 20, footerY + 14).lineTo(col6X, footerY + 14).stroke(borderColor);

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
