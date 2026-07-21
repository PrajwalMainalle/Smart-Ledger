const formData = {
  supplierName: "KGOC GLOBAL LLP",
  supplierGst: "29AASFK2654A1Z8",
  billNumber: "IN2655701118",
  date: "2026-07-18",
  paymentMethod: "UPI",
  status: "Paid",
  remarks: "",
  transport: "",
  discountAmount: "",
  cashDiscountPercent: "1.50",
  cashDiscountAmount: "", // let's calculate based on percent
  gstType: "CGST+SGST",
  items: [
    { productId: "", sku: "", name: "KANGARO PAPER PUNCHES DP-52", price: "54.98", qty: "60", gstRate: "18", schDiscount: "3", splDiscount: "2.20" },
    { productId: "", sku: "", name: "KANGARO PAPER PUNCHES FP-20", price: "64.74", qty: "30", gstRate: "18", schDiscount: "0", splDiscount: "2.20" },
    { productId: "", sku: "", name: "KANGARO STAPLES IN STRIPS NO.10-1M", price: "5.10", qty: "800", gstRate: "18", schDiscount: "15.50", splDiscount: "2.20" }
  ]
};

const calculateFormTotals = () => {
  let subtotal = 0;
  let totalItemDiscounts = 0;
  let baseTaxable = 0;
  const isGst = formData.supplierGst && formData.supplierGst.trim() !== "";

  // Helper to round to 2 decimal places
  const round2 = (num) => Math.round(num * 100) / 100;

  // First pass: Calculate item-level discounts and taxable amount before cash discount
  const itemDetails = formData.items.map(item => {
    const price = parseFloat(item.price) || 0;
    const qty = parseInt(item.qty) || 0;
    const schDiscount = parseFloat(item.schDiscount) || 0;
    const splDiscount = parseFloat(item.splDiscount) || 0;

    const itemSubtotal = round2(price * qty);
    const tradeDiscount = round2(itemSubtotal * (splDiscount / 100));
    const netAfterTrade = round2(itemSubtotal - tradeDiscount);
    const schemeDiscount = round2(netAfterTrade * (schDiscount / 100));
    const itemDiscount = round2(tradeDiscount + schemeDiscount);
    const itemTaxableBeforeCash = round2(itemSubtotal - itemDiscount);

    subtotal += itemSubtotal;
    totalItemDiscounts += itemDiscount;
    baseTaxable += itemTaxableBeforeCash;

    console.log(`Item: ${item.name}`);
    console.log(`  Subtotal: ${itemSubtotal}`);
    console.log(`  Trade Disc: ${tradeDiscount}`);
    console.log(`  Sch Disc: ${schemeDiscount}`);
    console.log(`  Total Item Disc: ${itemDiscount}`);
    console.log(`  Taxable before Cash: ${itemTaxableBeforeCash}`);

    return {
      name: item.name,
      itemSubtotal,
      tradeDiscount,
      schemeDiscount,
      itemDiscount,
      itemTaxableBeforeCash,
      gstRate: isGst ? (parseFloat(item.gstRate) || 0) : 0
    };
  });

  const cashDiscPercent = parseFloat(formData.cashDiscountPercent) || 0;
  let cashDiscAmount = parseFloat(formData.cashDiscountAmount) || 0;
  if (cashDiscPercent > 0 && cashDiscAmount === 0) {
    cashDiscAmount = round2(baseTaxable * (cashDiscPercent / 100));
  }
  const effectiveCashDiscPercent = cashDiscPercent > 0 
    ? cashDiscPercent 
    : (baseTaxable > 0 ? (cashDiscAmount / baseTaxable) * 100 : 0);

  let gstAmount = 0;
  let finalTaxableAmount = 0;
  let totalCalculatedCashDiscount = 0;

  // Second pass: Calculate cash discount and GST
  itemDetails.forEach(item => {
    const itemCashDiscount = round2(item.itemTaxableBeforeCash * (effectiveCashDiscPercent / 100));
    const itemTaxable = round2(item.itemTaxableBeforeCash - itemCashDiscount);
    
    totalCalculatedCashDiscount += itemCashDiscount;
    finalTaxableAmount += itemTaxable;

    let itemGst = 0;
    let cgstVal = 0;
    let sgstVal = 0;
    if (isGst && item.gstRate > 0) {
      if (formData.gstType === "IGST") {
        itemGst = round2(itemTaxable * (item.gstRate / 100));
      } else {
        // CGST+SGST
        cgstVal = round2(itemTaxable * (item.gstRate / 2 / 100));
        sgstVal = round2(itemTaxable * (item.gstRate / 2 / 100));
        itemGst = round2(cgstVal + sgstVal);
      }
    }

    gstAmount += itemGst;

    console.log(`Item: ${item.name} Calculations:`);
    console.log(`  Cash Disc: ${itemCashDiscount}`);
    console.log(`  Item Taxable: ${itemTaxable}`);
    console.log(`  CGST: ${cgstVal}, SGST: ${sgstVal}, Item GST: ${itemGst}`);
    console.log(`  Item Total: ${round2(itemTaxable + itemGst)}`);
  });

  const transportCost = parseFloat(formData.transport) || 0;
  const grandTotal = round2(finalTaxableAmount + gstAmount + transportCost);

  return { 
    subtotal: round2(subtotal), 
    discountAmount: round2(totalItemDiscounts), 
    taxableAmount: round2(baseTaxable),
    cashDiscountAmount: round2(totalCalculatedCashDiscount),
    gstAmount: round2(gstAmount), 
    transport: transportCost, 
    total: grandTotal 
  };
};

console.log("\nSummary Totals:\n", calculateFormTotals());
