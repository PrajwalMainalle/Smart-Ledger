import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../../../app/api/axiosInstance";
import {
  FaFileAlt,
  FaPlus,
  FaTrashAlt,
  FaPrint,
  FaBuilding,
  FaRedo,
  FaCheckCircle,
} from "react-icons/fa";

function QuotationList() {
  const { user } = useSelector((state) => state.auth);
  const defaultShopName = user?.profile?.shopName || user?.businessName || "BHARATAMBE TRADERS";
  const defaultShopGst = user?.profile?.gstNumber || "29ANOPM8542Q1ZU";
  const isGstDoc = (docType) => {
    if (!docType) return false;
    const str = String(docType).toUpperCase();
    return str.includes("GST") || str.includes("TAX");
  };
  const defaultShopPhone = "9845757296";
  const defaultAddress = "M B PATIL COLONY, NEAR BUSTAND ,GORTA MUCHLAMB ROAD, BASAVAKALYAN";
  const defaultSubtext = "OFFICE STATIONARY , SCHOOL ITEMS , ALL NOTE BOOKS ,XEROX PAPERS ,SPORTS ITEMS,COMPUTERS MATERIALS, GOVERNMENT SUPPLIES AND OTHERS MATERIALS";

  const [products, setProducts] = useState([]);
  const [showFirmSettings, setShowFirmSettings] = useState(false);
  const [selectedPrintQuote, setSelectedPrintQuote] = useState(null);

  // Initial Form State with editable seller firm & customer details
  const [formData, setFormData] = useState({
    docType: "ESTIMATE / QUOTATION",
    quoteNumber: `INV-${new Date().getFullYear()}-0001`,
    date: new Date().toISOString().split("T")[0],
    
    // Seller / Business Firm Details (Fully Editable)
    firmName: defaultShopName,
    firmGst: defaultShopGst,
    firmPhone: defaultShopPhone,
    firmAddress: defaultAddress,
    firmSubtext: defaultSubtext,
    
    // Bank & Payment Details (Fully Editable - Default Empty)
    bankAccountName: "",
    bankName: "",
    bankAccountNo: "",
    bankIfsc: "",
    upiId: "",

    // Customer Details
    customerName: "",
    customerPhone: "",
    customerGst: "",
    
    paymentMethod: "Cash",
    remarks: "",
    transport: "",
    cashDiscountPercent: "",
    cashDiscountAmount: "",
    items: [
      { productId: "", sku: "", name: "", price: "", qty: "1", gstRate: "18", schDiscount: "", splDiscount: "" },
    ],
  });

  // Clear any old stored quotation history from LocalStorage & load inventory catalog
  useEffect(() => {
    try {
      localStorage.removeItem("smartledger_quotations");
    } catch (e) {
      console.error(e);
    }

    const fetchInventory = async () => {
      try {
        const res = await axiosInstance.get("/inventory");
        setProducts(Array.isArray(res.data) ? res.data : (res.data?.products || []));
      } catch (err) {
        console.warn("Using offline catalog fallback");
      }
    };
    fetchInventory();
  }, []);

  // Reset form to fresh blank state
  const resetForm = () => {
    const randomSeq = String(Math.floor(1000 + Math.random() * 9000));
    setFormData({
      docType: "ESTIMATE / QUOTATION",
      quoteNumber: `INV-${new Date().getFullYear()}-${randomSeq}`,
      date: new Date().toISOString().split("T")[0],
      
      firmName: defaultShopName,
      firmGst: defaultShopGst,
      firmPhone: defaultShopPhone,
      firmAddress: defaultAddress,
      firmSubtext: defaultSubtext,

      bankAccountName: "",
      bankName: "",
      bankAccountNo: "",
      bankIfsc: "",
      upiId: "",

      customerName: "",
      customerPhone: "",
      customerGst: "",
      paymentMethod: "Cash",
      remarks: "",
      transport: "",
      cashDiscountPercent: "",
      cashDiscountAmount: "",
      items: [
        { productId: "", sku: "", name: "", price: "", qty: "1", gstRate: "18", schDiscount: "", splDiscount: "" },
      ],
    });
    setShowFirmSettings(false);
  };

  // Item management in form
  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: "", sku: "", name: "", price: "", qty: "1", gstRate: "18", schDiscount: "", splDiscount: "" },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length === 1) {
      alert("At least one item row is required.");
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleItemNameChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].name = value;

    // Search catalog for auto-fill
    const matched = products.find((p) => (p.name || "").toLowerCase() === value.toLowerCase());
    if (matched) {
      newItems[index].productId = matched._id || matched.id;
      newItems[index].sku = matched.sku || "";
      newItems[index].price = String(matched.prices?.purchase || matched.price || matched.sellingPrice || 0);
      newItems[index].gstRate = String(matched.gstRate !== undefined ? matched.gstRate : 18);
    }
    setFormData({ ...formData, items: newItems });
  };

  // Calculation engine matching checkout bill calculations
  const calculateTotals = (data = formData) => {
    let totalQty = 0;
    let subtotal = 0;
    let totalItemDiscounts = 0;
    let baseTaxable = 0;

    const round2 = (num) => Math.round(num * 100) / 100;

    const itemDetails = (data.items || []).map((item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty) || 0;
      const schDiscount = parseFloat(item.schDiscount) || 0;
      const splDiscount = parseFloat(item.splDiscount) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;

      totalQty += qty;
      const itemSubtotal = round2(price * qty);
      const tradeDiscount = round2(itemSubtotal * (splDiscount / 100));
      const netAfterTrade = round2(itemSubtotal - tradeDiscount);
      const schemeDiscount = round2(netAfterTrade * (schDiscount / 100));
      const itemDiscount = round2(tradeDiscount + schemeDiscount);
      const itemTaxableBeforeCash = round2(itemSubtotal - itemDiscount);

      subtotal += itemSubtotal;
      totalItemDiscounts += itemDiscount;
      baseTaxable += itemTaxableBeforeCash;

      return {
        price,
        qty,
        itemSubtotal,
        itemDiscount,
        itemTaxableBeforeCash,
        gstRate,
      };
    });

    const cashDiscPercent = parseFloat(data.cashDiscountPercent) || 0;
    let cashDiscAmount = parseFloat(data.cashDiscountAmount) || 0;
    if (cashDiscPercent > 0 && cashDiscAmount === 0) {
      cashDiscAmount = round2(baseTaxable * (cashDiscPercent / 100));
    }
    const effectiveCashDiscPercent =
      cashDiscPercent > 0
        ? cashDiscPercent
        : baseTaxable > 0
        ? (cashDiscAmount / baseTaxable) * 100
        : 0;

    let finalTaxableAmount = 0;
    let totalCalculatedCashDiscount = 0;

    itemDetails.forEach((item) => {
      const itemCashDiscount = round2(item.itemTaxableBeforeCash * (effectiveCashDiscPercent / 100));
      const itemTaxable = round2(item.itemTaxableBeforeCash - itemCashDiscount);

      totalCalculatedCashDiscount += itemCashDiscount;
      finalTaxableAmount += itemTaxable;
    });

    const transportCost = parseFloat(data.transport) || 0;
    const grandTotal = round2(finalTaxableAmount + transportCost);

    return {
      totalQty,
      subtotal: round2(subtotal),
      itemDiscounts: round2(totalItemDiscounts),
      taxableAmount: round2(baseTaxable),
      cashDiscountAmount: round2(totalCalculatedCashDiscount),
      gstAmount: 0,
      transport: transportCost,
      grandTotal: round2(grandTotal),
    };
  };

  const formCalculated = calculateTotals(formData);

  // Print Quotation Direct Handler
  const handlePrintQuotation = () => {
    if (!formData.customerName) {
      alert("Please enter customer / billed to name.");
      return;
    }
    if (formData.items.some((it) => !it.name || !it.price || !it.qty)) {
      alert("Please enter particulars, price/rate, and quantity for all items.");
      return;
    }

    const calculated = formCalculated;
    const quoteObject = {
      docType: formData.docType,
      quoteNumber: formData.quoteNumber,
      date: formData.date,
      
      firmName: formData.firmName,
      firmGst: formData.firmGst,
      firmPhone: formData.firmPhone,
      firmAddress: formData.firmAddress,
      firmSubtext: formData.firmSubtext,

      bankAccountName: formData.bankAccountName,
      bankName: formData.bankName,
      bankAccountNo: formData.bankAccountNo,
      bankIfsc: formData.bankIfsc,
      upiId: formData.upiId,

      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerGst: formData.customerGst,
      paymentMethod: formData.paymentMethod,
      remarks: formData.remarks,
      transport: parseFloat(formData.transport) || 0,
      cashDiscountPercent: parseFloat(formData.cashDiscountPercent) || 0,
      cashDiscountAmount: calculated.cashDiscountAmount,
      subtotal: calculated.subtotal,
      totalQty: calculated.totalQty,
      gstAmount: calculated.gstAmount,
      grandTotal: calculated.grandTotal,
      items: formData.items.map((it) => ({
        name: it.name,
        price: parseFloat(it.price) || 0,
        qty: parseInt(it.qty) || 0,
        gstRate: parseFloat(it.gstRate) || 0,
        schDiscount: parseFloat(it.schDiscount) || 0,
        splDiscount: parseFloat(it.splDiscount) || 0,
        amount: (parseFloat(it.price) || 0) * (parseInt(it.qty) || 0),
      })),
    };

    setSelectedPrintQuote(quoteObject);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
            <FaFileAlt className="text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Instant Quotation & Cash Bill Generator</h1>
            <p className="text-xs text-slate-400">
              Generate and print custom dummy quotations for any customer with editable business firm details.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold rounded-xl border border-slate-700 transition text-xs cursor-pointer"
        >
          <FaRedo /> Clear / New Form
        </button>
      </div>

      {/* INSTANT EDITABLE FORM (Purchase Log Screen Inspired) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6 text-xs text-slate-300">
        {/* Document Setup Header Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Document Type *</label>
            <select
              value={formData.docType}
              onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-bold focus:border-orange-500"
            >
              <option value="ESTIMATE / QUOTATION">ESTIMATE / QUOTATION</option>
              <option value="CASH BILL">CASH BILL</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Quote / Invoice No. *</label>
            <input
              type="text"
              value={formData.quoteNumber}
              onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-bold focus:border-orange-500"
              placeholder="e.g. INV-2026-0144"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-bold focus:border-orange-500"
            />
          </div>
        </div>

        {/* SELLER / BUSINESS FIRM DETAILS (Editable for other firms) */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaBuilding className="text-orange-400 text-sm" />
              <span className="font-black text-xs text-slate-200 uppercase tracking-wide">
                Business Firm / Seller Header Details
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowFirmSettings(!showFirmSettings)}
              className="text-xs text-orange-400 hover:underline font-semibold"
            >
              {showFirmSettings ? "▲ Hide Seller Details" : "▼ Edit Seller Firm & Bank Details"}
            </button>
          </div>

          {showFirmSettings ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Firm / Shop Name *</label>
                <input
                  type="text"
                  value={formData.firmName}
                  onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Firm GSTIN *</label>
                <input
                  type="text"
                  value={formData.firmGst}
                  onChange={(e) => setFormData({ ...formData, firmGst: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 uppercase font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Firm Mobile Phone *</label>
                <input
                  type="text"
                  value={formData.firmPhone}
                  onChange={(e) => setFormData({ ...formData, firmPhone: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-slate-400 font-semibold mb-1">Firm Address</label>
                <input
                  type="text"
                  value={formData.firmAddress}
                  onChange={(e) => setFormData({ ...formData, firmAddress: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                />
              </div>
              
              {/* Bank details editable */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">A/C Number</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">IFSC Code / UPI ID</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.bankIfsc}
                    placeholder="IFSC"
                    onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                  <input
                    type="text"
                    value={formData.upiId}
                    placeholder="UPI ID"
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Quotation Header: <strong className="text-slate-200">{formData.firmName}</strong> (GSTIN: {formData.firmGst}, Mobile: {formData.firmPhone}). Click edit above if you want to issue under a different business firm.
            </p>
          )}
        </div>

        {/* Customer / Billed To Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Customer / Billed To Name *</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-orange-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Customer Phone (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 9000000000"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Customer GSTIN (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 29AAAAA0000A1Z5"
              value={formData.customerGst}
              onChange={(e) => setFormData({ ...formData, customerGst: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:border-orange-500 uppercase"
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase text-orange-400 tracking-wider">
              QUOTATION / CASH BILL ITEMS
            </h3>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-lg transition"
            >
              <FaPlus className="text-[10px]" /> + Add Item Row
            </button>
          </div>

          <div className="space-y-2">
            {formData.items.map((item, index) => {
              const price = parseFloat(item.price) || 0;
              const qty = parseInt(item.qty) || 0;
              const itemAmt = price * qty;
              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-800"
                >
                  {/* Particulars / Item Name */}
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Particulars / Item Name *</label>
                    <input
                      type="text"
                      list={`catalog-items-${index}`}
                      placeholder="Search or type product..."
                      value={item.name}
                      onChange={(e) => handleItemNameChange(index, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-semibold focus:border-orange-500"
                    />
                    <datalist id={`catalog-items-${index}`}>
                      {products.map((p) => (
                        <option key={p._id || p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Rate / Net Price */}
                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Rate (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="₹ 0.00"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, "price", e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-bold focus:border-orange-500"
                    />
                  </div>

                  {/* Qty */}
                  <div className="col-span-6 md:col-span-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Qty *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-bold text-center focus:border-orange-500"
                    />
                  </div>

                  {/* GST % Alteration */}
                  <div className="col-span-6 md:col-span-1.5">
                    <label className="block text-[10px] text-slate-400 mb-0.5">GST %</label>
                    <select
                      value={item.gstRate !== undefined ? item.gstRate : "18"}
                      onChange={(e) => handleItemChange(index, "gstRate", e.target.value)}
                      className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-bold focus:border-orange-500"
                    >
                      <option value="0">0% GST</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>

                  {/* Sch % */}
                  <div className="col-span-3 md:col-span-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Sch %</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.schDiscount}
                      onChange={(e) => handleItemChange(index, "schDiscount", e.target.value)}
                      className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 text-center"
                    />
                  </div>

                  {/* Spl % */}
                  <div className="col-span-3 md:col-span-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Spl %</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.splDiscount}
                      onChange={(e) => handleItemChange(index, "splDiscount", e.target.value)}
                      className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 text-center"
                    />
                  </div>

                  {/* Amount & Delete */}
                  <div className="col-span-6 md:col-span-2.5 flex items-center justify-between gap-2 pt-3 md:pt-0">
                    <div>
                      <span className="block text-[9px] text-slate-400">Total</span>
                      <span className="font-mono font-bold text-xs text-orange-400">
                        ₹{itemAmt.toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(index)}
                      className="p-1.5 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded transition"
                    >
                      <FaTrashAlt className="text-xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Adjustments & Discounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Transport Charges (Optional)</label>
            <input
              type="number"
              placeholder="e.g. 150"
              value={formData.transport}
              onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:border-orange-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Cash Discount % (Optional)</label>
            <input
              type="number"
              placeholder="e.g. 2"
              value={formData.cashDiscountPercent}
              onChange={(e) => setFormData({ ...formData, cashDiscountPercent: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Remarks / Internal Notes</label>
            <input
              type="text"
              placeholder="e.g. Payment due in 15 days..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Dynamic Calculations & Actions Bar */}
        <div className="bg-slate-950 p-5 rounded-xl border border-orange-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Total Items</span>
              <span className="font-mono font-bold text-sm text-slate-200">{formCalculated.totalQty}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Total (Incl. Tax)</span>
              <span className="font-mono font-bold text-sm text-emerald-400">
                ₹{formCalculated.subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 uppercase">GRAND TOTAL (INCL. TAX)</span>
              <span className="font-mono font-black text-2xl text-emerald-400">
                ₹{formCalculated.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePrintQuotation}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transition cursor-pointer text-sm"
            >
              <FaPrint /> Print Quotation / Bill
            </button>
          </div>
        </div>
      </div>

      {/* EXACT PRINTABLE CASH BILL / ESTIMATE DOCUMENT MODAL */}
      {selectedPrintQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-sm overflow-y-auto printable-modal-container">
          <div className="bg-white text-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden my-4 p-6 relative flex flex-col printable-modal-card">
            {/* Non-printable Controls */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">Print Preview</span>
                <span className="text-xs text-slate-500">
                  Matches your exact Cash Bill / Quotation reference document
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition text-xs"
                >
                  <FaPrint /> Print Now
                </button>
                <button
                  onClick={() => setSelectedPrintQuote(null)}
                  className="px-3 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            {/* PRINT DOCUMENT WRAPPER (MATCHING USER SCREENSHOT EXACTLY) */}
            <div className="quotation-print-document font-sans text-black border border-black p-4 bg-white">
              {/* TOP HEADER BAR (Light Green) */}
              <div className="bg-[#e2ecc8] px-3 py-1.5 flex items-center justify-between border border-black mb-1">
                <div className="text-[11px] font-black uppercase tracking-tight text-black">
                  REG. GSTIN - {selectedPrintQuote.firmGst || defaultShopGst}
                </div>
                <div className="text-[11px] font-black uppercase tracking-tight text-black">
                  MOBILE: {
                    selectedPrintQuote && (isGstDoc(selectedPrintQuote.docType) || selectedPrintQuote.isGstBilling)
                      ? "9845757296"
                      : "6361037157"
                  }
                </div>
              </div>

              {/* MAIN GREEN BANNER */}
              <div className="bg-[#4b6c16] text-white text-center py-2 px-2 border-x border-b border-black mb-1">
                <h1 className="text-2xl font-black tracking-widest uppercase leading-none text-white">
                  {selectedPrintQuote.firmName || defaultShopName}
                </h1>
                <p className="text-[10px] font-bold tracking-widest uppercase mt-1 text-white">WHOLE SALER'S</p>
              </div>

              {/* ADDRESS & CATEGORY SUB-BAR */}
              <div className="bg-[#e2ecc8] text-center py-1.5 px-3 border border-black text-[9px] font-bold text-black uppercase space-y-0.5 mb-2">
                <div className="text-black">{selectedPrintQuote.firmAddress || defaultAddress}</div>
                <div className="text-[8px] font-semibold text-black">
                  {selectedPrintQuote.firmSubtext || defaultSubtext}
                </div>
              </div>

              {/* DOCUMENT TITLE */}
              <div className="text-center my-1.5">
                <h2 className="text-lg font-black tracking-wider uppercase text-black">
                  {selectedPrintQuote.docType || "CASH BILL"}
                </h2>
              </div>

              {/* META INFO ROW */}
              <div className="flex items-start justify-between text-[11px] font-bold uppercase mb-2 border-b border-black pb-1.5 text-black">
                <div className="space-y-0.5">
                  <div>
                    <span className="text-black">NO: </span>
                    <span className="font-mono text-black">{selectedPrintQuote.quoteNumber || selectedPrintQuote.id}</span>
                  </div>
                  <div>
                    <span className="text-black">NAME: </span>
                    <span className="text-black">{selectedPrintQuote.customerName}</span>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div>
                    <span className="text-black">DATE: </span>
                    <span className="text-black">{new Date(selectedPrintQuote.date).toLocaleDateString("en-GB")}</span>
                  </div>
                  {selectedPrintQuote.customerPhone && (
                    <div>
                      <span className="text-black">PHONE: </span>
                      <span className="text-black">{selectedPrintQuote.customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ITEMS TABLE */}
              <table className="w-full border-collapse border border-black text-[10px] text-black bg-white">
                <thead>
                  <tr className="bg-[#f1f5f9] uppercase font-black border-b border-black text-black">
                    <th className="border border-black py-1.5 px-2 text-center w-12 bg-[#f1f5f9] text-black">S.No</th>
                    <th className="border border-black py-1.5 px-3 text-left bg-[#f1f5f9] text-black">PARTICULARS</th>
                    <th className="border border-black py-1.5 px-2 text-center w-16 bg-[#f1f5f9] text-black">QTY</th>
                    <th className="border border-black py-1.5 px-2 text-right w-24 bg-[#f1f5f9] text-black">RATE</th>
                    <th className="border border-black py-1.5 px-2 text-right w-28 bg-[#f1f5f9] text-black">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPrintQuote.items || []).map((item, idx) => {
                    const price = parseFloat(item.price) || 0;
                    const qty = parseInt(item.qty) || 0;
                    const amt = price * qty;
                    return (
                      <tr key={idx} className="border-b border-black text-black bg-white">
                        <td className="border border-black py-1 px-2 text-center font-bold text-black">{idx + 1}</td>
                        <td className="border border-black py-1 px-3 uppercase font-semibold text-black">{item.name}</td>
                        <td className="border border-black py-1 px-2 text-center font-mono font-bold text-black">{qty}</td>
                        <td className="border border-black py-1 px-2 text-right font-mono font-semibold text-black">
                          ₹{price.toFixed(2)}
                        </td>
                        <td className="border border-black py-1 px-2 text-right font-mono font-bold text-black">
                          ₹{amt.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL ROW */}
                  <tr className="font-black bg-[#f1f5f9] uppercase border-t-2 border-black text-black">
                    <td colSpan="2" className="border border-black py-1.5 px-3 text-right bg-[#f1f5f9] text-black font-black">
                      Total
                    </td>
                    <td className="border border-black py-1.5 px-2 text-center font-mono bg-[#f1f5f9] text-black font-black">
                      {calculateTotals(selectedPrintQuote).totalQty}
                    </td>
                    <td className="border border-black py-1.5 px-2 bg-[#f1f5f9]"></td>
                    <td className="border border-black py-1.5 px-2 text-right font-mono text-xs bg-[#f1f5f9] text-black font-black">
                      ₹{calculateTotals(selectedPrintQuote).subtotal.toFixed(2)}
                    </td>
                  </tr>

                  {/* BOTTOM SUMMARY GRID (BANK, SCAN & PAY, GRAND TOTAL) */}
                  <tr>
                    <td colSpan="3" className="border border-black p-2 align-top bg-white text-black">
                      <div className="font-bold text-[9px] uppercase border-b border-black pb-1 mb-1 text-black">
                        BANK ACCOUNT DETAILS:
                      </div>
                      {selectedPrintQuote.bankName || selectedPrintQuote.bankAccountNo || selectedPrintQuote.bankIfsc || selectedPrintQuote.bankAccountName ? (
                        <div className="text-[8px] space-y-0.5 font-semibold leading-tight text-black">
                          {selectedPrintQuote.bankAccountName && (
                            <div>Account Name: {selectedPrintQuote.bankAccountName}</div>
                          )}
                          {selectedPrintQuote.bankName && (
                            <div>Bank Name: {selectedPrintQuote.bankName}</div>
                          )}
                          {selectedPrintQuote.bankAccountNo && (
                            <div>A/C No: {selectedPrintQuote.bankAccountNo}</div>
                          )}
                          {selectedPrintQuote.bankIfsc && (
                            <div>IFSC Code: {selectedPrintQuote.bankIfsc}</div>
                          )}
                        </div>
                      ) : null}
                    </td>

                    <td colSpan="1" className="border border-black p-2 align-top text-center bg-white text-black">
                      <div className="font-bold text-[8px] uppercase mb-1 text-black">SCAN & PAY (UPI)</div>
                      {selectedPrintQuote.upiId ? (
                        <div className="flex flex-col items-center justify-center">
                          {/* Generated UPI QR Box graphic */}
                          <div className="w-12 h-12 border border-black bg-white flex items-center justify-center p-0.5">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=upi://pay?pa=${
                                selectedPrintQuote.upiId
                              }&pn=${encodeURIComponent(selectedPrintQuote.firmName || defaultShopName)}&am=${
                                selectedPrintQuote.grandTotal || calculateTotals(selectedPrintQuote).grandTotal
                              }`}
                              alt="UPI QR"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="text-[7px] font-bold mt-1 text-black">
                            UPI ID: {selectedPrintQuote.upiId}
                          </div>
                          <div className="text-[6px] text-black">GPay/PhonePe/Paytm</div>
                        </div>
                      ) : null}
                    </td>

                    <td colSpan="1" className="border border-black p-2 align-middle text-right bg-[#f1f5f9] text-black">
                      <div className="font-black text-[9px] uppercase text-black">
                        {selectedPrintQuote.docType === "CASH BILL" ? "GRAND TOTAL (INCL. TAX)" : "GRAND TOTAL (EST.)"}
                      </div>
                      <div className="font-mono font-black text-sm text-black mt-1">
                        ₹
                        {(
                          selectedPrintQuote.grandTotal || calculateTotals(selectedPrintQuote).grandTotal
                        ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* FOOTER SIGNATURE & THANK YOU */}
              <div className="flex items-end justify-between mt-6 pt-2 text-[10px] font-bold text-black">
                <div className="text-black">Thanku visit again</div>
                <div className="text-right text-black">
                  <div className="border-t border-black w-36 ml-auto mb-1"></div>
                  <div className="text-black">Authorized signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CSS STYLES FOR EXACT PRINT OUT */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .printable-modal-container,
          .printable-modal-container * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .printable-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }

          .printable-modal-card {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .quotation-print-document {
            border: 1px solid #000000 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 10px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .quotation-print-document table th,
          .quotation-print-document table td,
          .quotation-print-document div,
          .quotation-print-document tr {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

export default QuotationList;
