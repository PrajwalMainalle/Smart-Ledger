import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { IoSearch } from "react-icons/io5";
import { FaFileInvoice, FaPrint, FaTimes, FaUndo, FaCheckCircle, FaExclamationCircle, FaSpinner, FaDownload } from "react-icons/fa";
import { fetchInvoices, refundInvoice, convertQuotation, settleInvoice } from "../billingSlice";
import { fetchProducts } from "../../inventory/inventorySlice";
import LoadingOverlay from "../../../components/LoadingOverlay";
import logo from "../../../assets/SLLogo.png";

function InvoiceList() {
  const dispatch = useDispatch();
  const { invoices, loading, error } = useSelector((state) => state.billing);
  const { user, token: authStoreToken } = useSelector((state) => state.auth);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Settlement dialog states
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleForm, setSettleForm] = useState({ invoiceId: "", invoiceCode: "", settlementMethod: "Cash", settlementDate: "" });

  // PDF Page Size & Orientation settings
  const [pageSize, setPageSize] = useState("auto");
  const [orientation, setOrientation] = useState("portrait");

  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch]);

  // Math Calculations for Dashboard KPIs
  const activeInvoices = invoices.filter(inv => inv.status === "Paid");
  const totalRevenue = activeInvoices.reduce((acc, curr) => acc + curr.total, 0);
  const totalCount = invoices.length;
  const refundCount = invoices.filter(inv => inv.status === "Refunded").length;
  const averageTicket = activeInvoices.length > 0 ? totalRevenue / activeInvoices.length : 0;

  // Credit metrics
  const creditInvoices = invoices.filter(inv => inv.paymentMethod === "Credit" && !inv.creditSettled && inv.status !== "Refunded");
  const creditCount = creditInvoices.length;
  const totalCreditAmt = creditInvoices.reduce((acc, curr) => acc + (curr.outstandingAmount !== undefined ? curr.outstandingAmount : curr.total), 0);

  // Filtered List
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerPhone.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPayment = paymentFilter === "All" || inv.paymentMethod === paymentFilter;
    
    let matchesStatus = false;
    if (statusFilter === "All") {
      matchesStatus = true;
    } else if (statusFilter === "Unpaid") {
      matchesStatus = inv.paymentMethod === "Credit" && !inv.creditSettled;
    } else if (statusFilter === "Paid") {
      matchesStatus = inv.status === "Paid" && !(inv.paymentMethod === "Credit" && !inv.creditSettled);
    } else {
      matchesStatus = inv.status === statusFilter;
    }

    return matchesSearch && matchesPayment && matchesStatus;
  });

  // Handle Refund Action
  const handleRefund = (inv) => {
    const invId = inv._id;
    if (window.confirm(`Are you sure you want to mark Invoice ${inv.invoiceId} as REFUNDED?\nThis will revert stock levels.`)) {
      dispatch(refundInvoice(invId)).then(() => {
        // Sync products stock again
        dispatch(fetchProducts());
        // Update selected modal if active
        if (selectedInvoice && (selectedInvoice._id === invId || selectedInvoice.id === inv.invoiceId)) {
          setSelectedInvoice(prev => ({ ...prev, status: "Refunded" }));
        }
      });
    }
  };

  // Convert Quotation Action
  const handleConvertToSale = (inv) => {
    const invId = inv._id;
    if (window.confirm(`Are you sure you want to convert Quotation/Estimate ${inv.invoiceId} to a tax invoice?\nThis will validate and deduct inventory stock levels.`)) {
      dispatch(convertQuotation(invId)).then((res) => {
        if (!res.error) {
          alert("Successfully converted quotation to Tax Invoice!");
          dispatch(fetchProducts());
          // Update selected modal if active
          setSelectedInvoice(res.payload);
        } else {
          alert(res.payload || "Conversion failed");
        }
      });
    }
  };

  // Settle Credit Action
  const handleSettleSubmit = (e) => {
    e.preventDefault();
    if (!settleForm.settlementMethod) {
      alert("Please select a settlement method.");
      return;
    }
    dispatch(settleInvoice(settleForm)).then((res) => {
      if (!res.error) {
        alert(`Invoice ${settleForm.invoiceCode} credit settled successfully!`);
        setShowSettleModal(false);
      } else {
        alert(res.payload || "Failed to settle invoice credit");
      }
    });
  };

  const getDynamicPdfUrl = () => {
    if (!selectedInvoice?._id) return "";
    const serverUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace("/api", "") : "http://localhost:5000";
    const token = authStoreToken || user?.token || "";
    return `${serverUrl}/api/billing/${selectedInvoice._id}/pdf?pageSize=${pageSize}&orientation=${orientation}&token=${token}&t=${Date.now()}`;
  };

  // Trigger Receipt Printing using dynamic PDF streaming (via blob same-origin URL to avoid CORS blocks)
  const triggerReprint = () => {
    const pdfUrl = getDynamicPdfUrl();
    if (!pdfUrl) return;

    fetch(pdfUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        let iframe = document.getElementById("print-iframe");
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "print-iframe";
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          document.body.appendChild(iframe);
        }
        iframe.src = blobUrl;
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }, 200);
        };
      })
      .catch((err) => {
        console.error("Print fetch failed, opening in new tab instead:", err);
        window.open(pdfUrl, "_blank");
      });
  };

  const getPdfDownloadLink = (inv) => {
    const url = getDynamicPdfUrl();
    return url ? `${url}&download=true` : "";
  };

  const profile = user?.profile || {};
  const shopName = profile.shopName || user?.businessName || "SmartLedger";
  const address = profile.businessAddress || "N/A Address";
  const gstNumber = profile.gstNumber || "N/A GSTIN";
  const contactPhone = profile.mobileNumber || user?.mobileNumber || "N/A Phone";
  const logoSrc = profile.logo || logo;

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Invoice History Log</h2>
          <p className="text-slate-400 text-sm mt-1">Review transactions, issue returns/refunds, and reprint invoices.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Statistical summary boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Gross Sales</span>
            <p className="text-xl font-bold text-slate-100 mt-1">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Active Invoices</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{activeInvoices.length} Bills</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Avg ticket value</span>
            <p className="text-xl font-bold text-slate-100 mt-1">₹{averageTicket.toFixed(2)}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl border-purple-900/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-400">Outstanding Credit</span>
            <p className="text-xl font-bold text-purple-400 mt-1">₹{totalCreditAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-slate-550 mt-0.5">{creditCount} Credit Bills</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Refunded counts</span>
            <p className="text-xl font-bold text-rose-500 mt-1">{refundCount} Returns</p>
          </div>
        </div>

        {/* Filters and search layout */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/20 p-4 rounded-xl border border-slate-900/60">
          <div className="relative w-full max-w-md">
            <input 
              type="text" 
              placeholder="Search by Invoice ID, customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            <IoSearch className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            {/* Payment Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Payment:</span>
              <select 
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-slate-900 border border-slate-855 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="All">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-855 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Refunded">Refunded</option>
                <option value="Quotation">Quotation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice listing Table */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden shadow-lg relative">
          {loading && <LoadingOverlay message="Loading invoice history..." />}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-2">Timestamp</th>
                  <th className="py-3 px-2">Customer Details</th>
                  <th className="py-3 px-2">Payment Method</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Amount Due</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-300">
                {filteredInvoices.map((inv) => {
                  const invId = inv._id;
                  return (
                    <tr key={invId} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-400">{inv.invoiceId}</td>
                      <td className="py-4 px-2">
                        <div>{new Date(inv.date).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">{new Date(inv.date).toLocaleTimeString()}</div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="font-semibold text-slate-100">{inv.customerName}</div>
                        <div className="text-[10px] text-slate-500">{inv.customerPhone}</div>
                      </td>
                      <td className="py-4 px-2">
                        {inv.paymentMethod === "Credit" ? (
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                              ${inv.creditSettled 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                              }
                            `}>
                              {inv.creditSettled ? `Paid: ${inv.settlementMethod}` : "Credit (Unpaid)"}
                            </span>
                            {inv.creditSettled && (
                              <span className="text-[9px] text-slate-500 font-mono">
                                Date: {new Date(inv.settlementDate).toLocaleDateString("en-IN")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                            ${inv.paymentMethod === "UPI" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : ""}
                            ${inv.paymentMethod === "Cash" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : ""}
                            ${inv.paymentMethod === "Card" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : ""}
                          `}>
                            {inv.paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        {inv.paymentMethod === "Credit" && !inv.creditSettled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-500/10 border-rose-500/20 text-rose-500">
                            <FaExclamationCircle className="text-[10px]" />
                            Unpaid
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
                            ${inv.status === "Paid" 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                              : inv.status === "Quotation"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                            }
                          `}>
                            {inv.status === "Paid" ? <FaCheckCircle /> : <FaExclamationCircle />}
                            {inv.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-right font-black text-slate-100">
                        <div>₹{inv.total.toFixed(2)}</div>
                        {inv.paymentMethod === "Credit" && (
                          <div className="text-[10px] text-purple-400 font-bold">
                            Due: ₹{(inv.outstandingAmount !== undefined ? inv.outstandingAmount : (inv.creditSettled ? 0 : inv.total)).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700 font-semibold text-xs transition"
                            title="View Detailed Tax Receipt"
                          >
                            Receipt
                          </button>
                          {inv.paymentMethod === "Credit" && !inv.creditSettled && inv.status === "Paid" && (
                            <button 
                              onClick={() => {
                                const outstanding = inv.outstandingAmount !== undefined ? inv.outstandingAmount : inv.total;
                                setSettleForm({
                                  invoiceId: inv._id,
                                  invoiceCode: inv.invoiceId,
                                  settlementMethod: "Cash",
                                  settlementDate: new Date().toISOString().split('T')[0],
                                  totalAmount: inv.total,
                                  alreadyPaid: inv.amountPaid || 0,
                                  outstandingAmount: outstanding,
                                  amount: outstanding
                                });
                                setShowSettleModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded border border-purple-500/20 font-semibold text-xs transition font-bold"
                              title="Settle Credit Outstanding"
                            >
                              Settle
                            </button>
                          )}
                          {inv.status === "Paid" && (
                            <button 
                              onClick={() => handleRefund(inv)}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded border border-rose-500/20 font-semibold text-xs transition"
                              title="Mark Invoice as Returned / Refunded"
                            >
                              <FaUndo className="text-[10px]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredInvoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 text-sm">No transaction invoices log matches active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* REPRINT / VIEW RECEIPT MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FaFileInvoice className="text-orange-500" /> {selectedInvoice.status === "Quotation" ? "Quotation / Estimate Details" : "Invoice Details"}
              </h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Split Content */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-[68vh]">
              {/* Left Column: PDF Iframe Preview */}
              <div className="flex-1 bg-slate-950 border-r border-slate-855 flex flex-col h-full min-h-[300px] md:min-h-0">
                <div className="p-3 bg-slate-950 border-b border-slate-855 flex flex-wrap justify-between items-center gap-2">
                  <span className="font-bold text-xs text-slate-300">Live Generated PDF Preview</span>
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Size:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-355"
                    >
                      <option value="auto">Auto-Fit</option>
                      <option value="A4">A4 Paper</option>
                      <option value="A3">A3 Paper</option>
                    </select>

                    <label className="text-[10px] text-slate-500 font-bold uppercase">Layout:</label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-[10px] rounded px-1.5 py-0.5 text-slate-355"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
                <iframe
                  src={getDynamicPdfUrl()}
                  className="w-full h-full flex-1 border-none bg-slate-950"
                  title="Live Invoice PDF"
                />
              </div>

              {/* Right Column: HTML Print Preview */}
              <div className="w-full md:w-[480px] overflow-y-auto p-4 bg-slate-950 flex flex-col h-full">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 text-center">
                  POS Print Receipt Preview
                </div>
                <div className="bg-white p-4 rounded-lg overflow-y-auto flex-1 max-h-full" style={{ color: "#1e293b" }}>
                  <div id="reprint-area">
                    <div className="print-receipt">
                      {/* GSTIN / MOBILE Light olive green banner */}
                      <div className="shop-header-banner">
                        {selectedInvoice.isGstBilling !== false && (
                          <span>REG.GSTIN: {gstNumber}</span>
                        )}
                        <span>MOBILE: {contactPhone}</span>
                      </div>

                      {/* Logo container if logoSrc exists */}
                      {logoSrc && (
                        <div className="logo-container">
                          <img src={logoSrc} alt="Logo" className="logo-img" />
                        </div>
                      )}

                      {/* Olive Green Shop Banner */}
                      <div className="shop-title-banner">
                        <h1 className="shop-title-text">{shopName.toUpperCase()}</h1>
                        <p className="shop-subtitle-text">WHOLE SALER'S</p>
                      </div>

                      {/* Light Green Address & Tagline Banner */}
                      <div className="shop-address-banner">
                        <p className="bold">{address.toUpperCase()}</p>
                        <p className="shop-tagline">
                          {profile.businessDescription || "OFFICE STATIONARY, SCHOOL ITEMS, ALL NOTE BOOKS, ZEROX PAPERS, SPORTS ITMES, COMPUTERS MATERIALS AND OTHERS MATERIALS"}
                        </p>
                      </div>

                      {/* Document Title */}
                      <div className="document-title-container">
                        <span className="document-title">
                          {selectedInvoice.status === "Quotation" ? "ESTIMATE / QUOTATION" : "CREDIT BILL"}
                        </span>
                      </div>

                      {/* Invoice Details Box */}
                      <div className="details-box">
                        <div className="details-row">
                          <span className="details-label">Bill No:</span>
                          <span className="details-val font-mono">{selectedInvoice.invoiceId || selectedInvoice.id}</span>
                        </div>
                        <div className="details-row">
                          <span className="details-label">Date:</span>
                          <span className="details-val">{new Date(selectedInvoice.date).toLocaleDateString("en-IN")}</span>
                        </div>
                        <div className="details-row">
                          <span className="details-label">Customer Name:</span>
                          <span className="details-val">{selectedInvoice.customerName.toUpperCase()}</span>
                        </div>
                        {selectedInvoice.customerPhone && selectedInvoice.customerPhone !== "N/A" && (
                          <div className="details-row">
                            <span className="details-label">Mobile No:</span>
                            <span className="details-val">{selectedInvoice.customerPhone}</span>
                          </div>
                        )}
                      </div>

                      {/* Bordered Table Grid */}
                      <div className="receipt-table-container">
                        <table className="receipt-table">
                          <thead>
                            <tr>
                              <th style={{ width: "8%" }}>S.No</th>
                              <th style={{ width: "52%" }}>PARTICULARS</th>
                              <th style={{ width: "10%" }}>QTY</th>
                              <th style={{ width: "12%" }}>RATE</th>
                              <th style={{ width: "18%" }}>AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.items.map((item, idx) => {
                              const lineTotal = item.price * item.qty;
                              return (
                                <tr key={idx}>
                                  <td className="text-center">{idx + 1}</td>
                                  <td className="bold notranslate" translate="no">{item.name}</td>
                                  <td className="text-center font-mono">{item.qty}</td>
                                  <td className="text-right font-mono">₹{item.price.toFixed(2)}</td>
                                  <td className="text-right font-mono bold">₹{lineTotal.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                            
                            {/* Bank details and Calculations merged row */}
                            <tr>
                              <td colSpan="3" style={{ verticalAlign: "top", padding: "8px", borderRight: "1px solid #94a3b8" }}>
                                <div style={{ color: "#b91c1c", fontWeight: "bold", fontSize: "8.5px", marginBottom: "4px" }}>
                                  BANK ACCOUNT DETAILS:
                                </div>
                                <div style={{ fontSize: "7.5px", color: "#0f172a", lineHeight: "1.3" }}>
                                  <div>A/c Name: {shopName.toUpperCase()}</div>
                                  <div>Bank: CANARA BANK, BASAVAKALYAN BRANCH</div>
                                  <div>A/c No: 120033287950  |  IFSC: CNRB0010700</div>
                                </div>
                              </td>
                              <td colSpan="2" style={{ padding: "0" }}>
                                <table className="inner-calc-table">
                                  <tbody>
                                    <tr>
                                      <td className="bold" style={{ width: "40%" }}>TOTAL QTY:</td>
                                      <td className="text-right font-mono bold" style={{ width: "60%" }}>
                                        {selectedInvoice.items.reduce((sum, item) => sum + item.qty, 0)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="bold">SUBTOTAL:</td>
                                      <td className="text-right font-mono">₹{selectedInvoice.subtotal.toFixed(2)}</td>
                                    </tr>
                                    {selectedInvoice.discountAmount > 0 && (
                                      <tr>
                                        <td className="bold text-rose-500">DISCOUNT:</td>
                                        <td className="text-right font-mono text-rose-500 font-bold">
                                          -₹{selectedInvoice.discountAmount.toFixed(2)}
                                        </td>
                                      </tr>
                                    )}
                                    {selectedInvoice.isGstBilling !== false && (
                                      <>
                                        <tr>
                                          <td className="bold">CGST ({(selectedInvoice.items[0]?.gstRate || 0) / 2}%):</td>
                                          <td className="text-right font-mono">₹{(selectedInvoice.gstAmount / 2).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                          <td className="bold">SGST ({(selectedInvoice.items[0]?.gstRate || 0) / 2}%):</td>
                                          <td className="text-right font-mono">₹{(selectedInvoice.gstAmount / 2).toFixed(2)}</td>
                                        </tr>
                                      </>
                                    )}
                                    <tr style={{ borderTop: "1px solid #94a3b8" }}>
                                      <td className="bold font-extrabold text-orange-600" style={{ fontSize: "10px" }}>
                                        {selectedInvoice.status === "Quotation" ? "ESTIMATED TOTAL" : "GRAND TOTAL"}
                                      </td>
                                      <td className="text-right font-mono font-black text-orange-600" style={{ fontSize: "11px" }}>
                                        ₹{selectedInvoice.total.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Footer & Signature block */}
                      <div className="footer-sig-container">
                        <div className="footer-thankyou">Thanku visit again</div>
                        <div className="sig-block">
                          <div className="sig-line"></div>
                          <div className="sig-text">Authorized signature</div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print toolbar footer */}
            <div className="bg-slate-950 px-6 py-4 flex flex-col gap-2 border-t border-slate-900">
              <div className="flex gap-2">
                <button
                  onClick={triggerReprint}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700 text-xs"
                >
                  <FaPrint /> Reprint Receipt
                </button>
                <a
                  href={getPdfDownloadLink(selectedInvoice)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700 text-xs"
                >
                  <FaDownload /> Download PDF
                </a>
              </div>
              {selectedInvoice.status === "Paid" && (
                <button
                  onClick={() => handleRefund(selectedInvoice)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs"
                >
                  Issue Return Refund
                </button>
              )}
              {selectedInvoice.status === "Quotation" && (
                <button
                  onClick={() => handleConvertToSale(selectedInvoice)}
                  className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-bold text-xs"
                >
                  Convert to Tax Invoice (Sale)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SETTLE CREDIT INVOICE MODAL */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 px-5 py-3.5 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-xs">
                <FaCheckCircle className="text-purple-400" /> Settle Credit Outstanding
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSettleModal(false)} 
                className="text-slate-400 hover:text-slate-200"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <p className="text-slate-400 mb-1">Settling payment for invoice:</p>
                <p className="font-mono text-sm font-bold text-slate-100 mb-2">{settleForm.invoiceCode}</p>
                
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center font-mono text-[10px]">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Total Bill</p>
                    <p className="font-bold text-slate-200">₹{settleForm.totalAmount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-emerald-500 uppercase font-bold">Paid</p>
                    <p className="font-bold text-emerald-450 text-emerald-400">₹{settleForm.alreadyPaid?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-purple-400 uppercase font-bold">Outstanding</p>
                    <p className="font-bold text-purple-400">₹{settleForm.outstandingAmount?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Settlement Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Cash", "UPI", "Card"].map((method) => {
                    const active = settleForm.settlementMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSettleForm({ ...settleForm, settlementMethod: method })}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all duration-150
                          ${active 
                            ? "bg-slate-950 border-purple-500 text-purple-400 font-extrabold shadow" 
                            : "bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-250"
                          }
                        `}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Settlement Amount Paid (₹)</label>
                <input 
                  type="number" step="0.01" min="0.01" max={settleForm.outstandingAmount} required
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-500 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Payment Date</label>
                <input 
                  type="date" required
                  value={settleForm.settlementDate}
                  onChange={(e) => setSettleForm({ ...settleForm, settlementDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="pt-3 flex gap-2.5 border-t border-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-purple-650 to-indigo-650 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default InvoiceList;
