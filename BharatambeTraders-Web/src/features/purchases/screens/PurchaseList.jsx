import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { IoSearch } from "react-icons/io5";
import {
  FaReceipt,
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrashAlt,
  FaExclamationTriangle,
  FaFileCsv,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function PurchaseList() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPurchaseId, setCurrentPurchaseId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    supplierName: "",
    supplierGst: "",
    billNumber: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    status: "Paid",
    remarks: "",
    items: [
      { productId: "", sku: "", name: "", price: "", qty: "1", gstRate: "18" }
    ]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchRes, prodRes] = await Promise.all([
        axiosInstance.get("/purchases"),
        axiosInstance.get("/inventory")
      ]);
      setPurchases(purchRes.data);
      setProducts(prodRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch purchases records.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered purchases list
  const filteredPurchases = purchases.filter((item) => {
    if (!item) return false;
    const matchesPayment = paymentFilter === "All" || item.paymentMethod === paymentFilter;
    const supplierName = item.supplierName || "";
    const billNumber = item.billNumber || "";
    const itemsList = item.items || [];
    
    const matchesSearch =
      supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemsList.some(it => (it.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesPayment && matchesSearch;
  });

  // KPI Calculations
  const totalPurchasesAmount = purchases.reduce((acc, curr) => acc + curr.total, 0);
  const totalGstPaid = purchases.reduce((acc, curr) => acc + curr.gstAmount, 0);
  const totalBillsCount = purchases.length;
  const pendingBillsCount = purchases.filter(p => p.status === "Pending").length;

  // Form item array management
  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: "", price: "", qty: "1", gstRate: "18" }]
    });
  };

  const handleRemoveItemRow = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  // Live calculations for the Form Modal
  const calculateFormTotals = () => {
    let subtotal = 0;
    let gstAmount = 0;
    formData.items.forEach(item => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty) || 0;
      const rate = parseFloat(item.gstRate) || 0;
      const itemSubtotal = price * qty;
      const itemGst = (itemSubtotal * rate) / 100;
      subtotal += itemSubtotal;
      gstAmount += itemGst;
    });
    return { subtotal, gstAmount, total: subtotal + gstAmount };
  };

  const formTotals = calculateFormTotals();

  // Reset form helper
  const resetForm = () => {
    setFormData({
      supplierName: "",
      supplierGst: "",
      billNumber: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "Cash",
      status: "Paid",
      remarks: "",
      items: [{ productId: "", sku: "", name: "", price: "", qty: "1", gstRate: "18" }]
    });
    setCurrentPurchaseId(null);
  };

  // Auto-suggest product change handler
  const handleItemNameChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].name = value;

    // Search for a matching product name in the catalog (case-insensitive)
    const matchedProduct = products.find(p => p.name.toLowerCase() === value.toLowerCase());
    if (matchedProduct) {
      newItems[index].productId = matchedProduct._id || matchedProduct.id;
      newItems[index].sku = matchedProduct.sku || "";
      // Pre-populate latest purchase price (or retail base if empty) and GST rate
      newItems[index].price = (matchedProduct.prices?.purchase || matchedProduct.price || 0).toString();
      newItems[index].gstRate = (matchedProduct.gstRate !== undefined ? matchedProduct.gstRate : 18).toString();
    } else {
      // Clear product reference if name is modified/custom
      newItems[index].productId = "";
      newItems[index].sku = "";
    }

    setFormData({ ...formData, items: newItems });
  };

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierName || !formData.billNumber) {
      alert("Please fill all required supplier and bill fields.");
      return;
    }
    if (formData.items.some(item => !item.name || !item.price || !item.qty)) {
      alert("Please fill name, price, and quantity for all items.");
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post("/purchases", formData);
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to log supplier purchase bill.");
      setLoading(false);
    }
  };

  // Trigger Edit
  const openEditModal = (purchase) => {
    setCurrentPurchaseId(purchase._id);
    setFormData({
      supplierName: purchase.supplierName,
      supplierGst: purchase.supplierGst || "",
      billNumber: purchase.billNumber,
      date: new Date(purchase.date).toISOString().split("T")[0],
      paymentMethod: purchase.paymentMethod,
      status: purchase.status,
      remarks: purchase.remarks || "",
      items: purchase.items.map(item => ({
        productId: item.productId || "",
        sku: item.sku || "",
        name: item.name,
        price: item.price.toString(),
        qty: item.qty.toString(),
        gstRate: item.gstRate.toString()
      }))
    });
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierName || !formData.billNumber) {
      alert("Please fill all required fields.");
      return;
    }
    if (formData.items.some(item => !item.name || !item.price || !item.qty)) {
      alert("Please fill name, price, and quantity for all items.");
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.put(`/purchases/${currentPurchaseId}`, formData);
      setShowEditModal(true); // Close edit modal
      setShowEditModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update supplier purchase bill.");
      setLoading(false);
    }
  };

  // Delete Purchase
  const handleDelete = async (id, billNo, supplier) => {
    if (window.confirm(`Are you sure you want to delete bill '${billNo}' from supplier '${supplier}'?`)) {
      try {
        setLoading(true);
        await axiosInstance.delete(`/purchases/${id}`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Failed to delete purchase record.");
        setLoading(false);
      }
    }
  };

  // Export to CSV for CA
  const exportToCSV = () => {
    if (purchases.length === 0) return alert("No purchase data available to export");
    
    // CSV Headers
    const headers = [
      "Purchase Date",
      "Supplier Name",
      "Supplier GSTIN",
      "Bill Number",
      "Payment Status",
      "Payment Method",
      "Taxable Value (Subtotal)",
      "GST Paid (ITC)",
      "Total Amount Paid",
      "Item Details"
    ];
    
    const csvRows = [headers.join(",")];
    
    purchases.forEach((p) => {
      const pDate = new Date(p.date).toLocaleDateString("en-IN");
      const itemSummaries = p.items.map(it => `${it.name} (x${it.qty} @ ${it.gstRate}%)`).join(" | ");
      
      const values = [
        `"${pDate}"`,
        `"${p.supplierName.replace(/"/g, '""')}"`,
        `"${(p.supplierGst || "").replace(/"/g, '""')}"`,
        `"${p.billNumber.replace(/"/g, '""')}"`,
        `"${p.status}"`,
        `"${p.paymentMethod}"`,
        `"${p.subtotal.toFixed(2)}"`,
        `"${p.gstAmount.toFixed(2)}"`,
        `"${p.total.toFixed(2)}"`,
        `"${itemSummaries.replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `supplier_purchases_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Supplier Purchases &amp; Bills</h2>
            <p className="text-slate-400 text-sm mt-1">Log supplier purchase bills, track tax inputs (ITC), and prepare spreadsheets for your CA.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition"
            >
              <FaFileCsv /> Export to CA
            </button>
            <button 
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-95 text-xs"
            >
              <FaPlus /> Log Purchase Bill
            </button>
          </div>
        </div>

        {/* Statistical KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Total Purchase Value</span>
            <p className="text-xl font-bold text-slate-100 mt-1">₹{totalPurchasesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">GST Paid (ITC Asset)</span>
            <p className="text-xl font-bold text-emerald-400 mt-1">₹{totalGstPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Logged Bills Count</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{totalBillsCount} Invoices</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Pending Payments</span>
            <p className={`text-xl font-bold mt-1 ${pendingBillsCount > 0 ? "text-rose-500" : "text-slate-400"}`}>
              {pendingBillsCount} Pending
            </p>
          </div>
        </div>

        {/* Search and Filters toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/20 p-4 rounded-xl border border-slate-900/60">
          <div className="relative w-full max-w-md">
            <input 
              type="text" 
              placeholder="Search by supplier, bill number or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            <IoSearch className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Payment:</span>
            <select 
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-855 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="All">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Credit">Credit/Outstanding</option>
            </select>
          </div>
        </div>

        {/* Purchases log Table */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden shadow-lg relative">
          {loading && <LoadingOverlay message="Syncing supplier bills..." />}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Bill Date</th>
                  <th className="py-3 px-2">Supplier details</th>
                  <th className="py-3 px-2">Bill Number</th>
                  <th className="py-3 px-2 text-center">Payment Status</th>
                  <th className="py-3 px-2 text-right">Taxable Value</th>
                  <th className="py-3 px-2 text-right">GST Paid</th>
                  <th className="py-3 px-2 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-330">
                {filteredPurchases.map((p) => {
                  const billDate = new Date(p.date).toLocaleDateString("en-IN");
                  const isPending = p.status === "Pending";

                  return (
                    <tr key={p._id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-4 font-mono font-semibold text-slate-400">{billDate}</td>
                      <td className="py-4 px-2">
                        <div>
                          <div className="font-bold text-slate-100">{p.supplierName}</div>
                          {p.supplierGst && (
                            <div className="text-[10px] text-slate-500 font-mono">GSTIN: {p.supplierGst}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2 font-mono font-bold text-slate-350">{p.billNumber}</td>
                      <td className="py-4 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${isPending 
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" 
                            : "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20"
                          }
                        `}>
                          {p.status} ({p.paymentMethod})
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right font-mono">₹{p.subtotal.toFixed(2)}</td>
                      <td className="py-4 px-2 text-right font-mono text-emerald-450">₹{p.gstAmount.toFixed(2)}</td>
                      <td className="py-4 px-2 text-right font-mono font-bold text-slate-100">₹{p.total.toFixed(2)}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openEditModal(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded border border-slate-700 transition"
                            title="Edit purchase record"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p._id, p.billNumber, p.supplierName)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded border border-rose-500/20 transition"
                            title="Delete purchase record"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPurchases.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500 text-sm">No supplier purchase bills found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ADD / EDIT MODALS */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FaReceipt className="text-orange-500" /> 
                {showAddModal ? "Log Supplier Purchase Bill" : "Edit Supplier Purchase Bill"}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} 
                className="text-slate-400 hover:text-slate-200"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-4 text-xs">
              
              {/* Supplier & Bill Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Supplier Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter supplier shop or business name"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Supplier GSTIN (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 29AAAAA0000A1Z0"
                    maxLength={15}
                    value={formData.supplierGst}
                    onChange={(e) => setFormData({ ...formData, supplierGst: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Bill / Invoice Number *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Invoice ID"
                    value={formData.billNumber}
                    onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Invoice Date *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Payment Method</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit/Outstanding</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Bill Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending / Outstanding</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-slate-800/80 pt-3 mt-1">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-orange-400 font-bold uppercase tracking-wider text-[10px]">Purchase Bill Items</h4>
                  <button 
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-md font-semibold text-[10px] transition"
                  >
                    <FaPlus size={10} /> Add Item Row
                  </button>
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 relative group">
                      <div className="flex-1 space-y-1">
                        <label className="text-slate-500 font-medium">Item Name *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Search or type product name..."
                          list={`product-options-${idx}`}
                          value={item.name}
                          onChange={(e) => handleItemNameChange(idx, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-orange-500"
                        />
                        <datalist id={`product-options-${idx}`}>
                          {products.map(p => (
                            <option key={p._id || p.id} value={p.name}>
                              SKU: {p.sku} | Cost: ₹{(p.prices?.purchase || p.price || 0).toFixed(2)}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      
                      <div className="w-24 space-y-1">
                        <label className="text-slate-500 font-medium">Net Price *</label>
                        <input 
                          type="number" step="0.01" required
                          placeholder="₹"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>

                      <div className="w-20 space-y-1">
                        <label className="text-slate-500 font-medium">Qty *</label>
                        <input 
                          type="number" required
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>

                      <div className="w-28 space-y-1">
                        <label className="text-slate-500 font-medium">GST Rate</label>
                        <select 
                          value={item.gstRate}
                          onChange={(e) => handleItemChange(idx, "gstRate", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-100 focus:outline-none"
                        >
                          <option value="0">0% (Exempt)</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST</option>
                        </select>
                      </div>

                      {formData.items.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded border border-rose-500/20 transition mb-0.5"
                          title="Remove item"
                        >
                          <FaTrashAlt size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Remarks / Internal Notes</label>
                <textarea 
                  placeholder="Any additional details or payment tracking details..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500 h-16 resize-none"
                />
              </div>

              {/* Calculations drawer */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs md:text-sm font-mono">
                <div className="space-y-1">
                  <div className="text-slate-500 text-[10px] font-semibold uppercase">Base Subtotal</div>
                  <div className="text-slate-100 font-bold">₹{formTotals.subtotal.toFixed(2)}</div>
                </div>
                <div className="space-y-1 text-center">
                  <div className="text-slate-500 text-[10px] font-semibold uppercase">GST Input Amount</div>
                  <div className="text-emerald-400 font-bold">₹{formTotals.gstAmount.toFixed(2)}</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-orange-500 text-[10px] font-semibold uppercase">Grand Total</div>
                  <div className="text-lg font-black text-orange-400">₹{formTotals.total.toFixed(2)}</div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-900">
                <button 
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-95"
                >
                  {showAddModal ? "Log Bill" : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseList;
