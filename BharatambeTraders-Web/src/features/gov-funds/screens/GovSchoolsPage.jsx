import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import {
  FaSchool,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaTimes,
  FaLandmark,
  FaShoppingBag,
  FaWallet,
  FaPhone,
  FaUserTie,
  FaReceipt,
  FaCalendarAlt,
  FaBoxes,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovSchoolsPage = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State: Create / Edit School
  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [formData, setFormData] = useState({
    schoolName: "",
    headmasterName: "",
    contactNumber: "",
    grantedAmount: "",
  });

  // Modal State: View Purchased Items Details
  const [selectedSchoolDetails, setSelectedSchoolDetails] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/gov-funds/schools");
      setSchools(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load government schools");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (school = null) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        schoolName: school.schoolName || "",
        headmasterName: school.headmasterName || "",
        contactNumber: school.contactNumber || "",
        grantedAmount: school.grantedAmount || "",
      });
    } else {
      setEditingSchool(null);
      setFormData({
        schoolName: "",
        headmasterName: "",
        contactNumber: "",
        grantedAmount: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.headmasterName || !formData.contactNumber || !formData.grantedAmount) {
      alert("Please fill all required fields");
      return;
    }

    const payload = {
      schoolName: formData.schoolName,
      headmasterName: formData.headmasterName,
      contactNumber: formData.contactNumber,
      mobileNumber: formData.contactNumber,
      grantedAmount: formData.grantedAmount,
    };

    try {
      if (editingSchool) {
        await axiosInstance.put(`/gov-funds/schools/${editingSchool._id}`, payload);
      } else {
        await axiosInstance.post("/gov-funds/schools", payload);
      }
      setShowModal(false);
      fetchSchools();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to save government school");
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete government school record for "${name}"?`)) {
      try {
        await axiosInstance.delete(`/gov-funds/schools/${id}`);
        fetchSchools();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Failed to delete school");
      }
    }
  };

  const handleViewDetails = async (school) => {
    setSelectedSchoolDetails(school);
    setDetailsLoading(true);
    try {
      const res = await axiosInstance.get(`/gov-funds/schools/${school._id}`);
      setDetailsData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load school purchase details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.schoolName?.toLowerCase().includes(search.toLowerCase()) ||
      s.headmasterName?.toLowerCase().includes(search.toLowerCase()) ||
      s.contactNumber?.toLowerCase().includes(search.toLowerCase())
  );

  // Overall KPI Aggregations
  const totalGrantedAll = schools.reduce((acc, s) => acc + (s.grantedAmount || 0), 0);
  const totalSpentAll = schools.reduce((acc, s) => acc + (s.totalSpent || 0), 0);
  const totalRemainingAll = schools.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Loading Government Schools..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaLandmark className="text-amber-500" /> Government Schools Fund Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track school details, head master contacts, granted amounts, and automatically deduct item purchase costs in real time.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-2 shadow"
        >
          <FaPlus /> Add Government School
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Granted Amount</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">
              ₹{totalGrantedAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <FaLandmark className="text-xl" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Items Purchased Cost</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">
              ₹{totalSpentAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <FaShoppingBag className="text-xl" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Remaining Balance</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              ₹{totalRemainingAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <FaWallet className="text-xl" />
          </div>
        </div>
      </div>

      {/* Action & Search Bar */}
      <div className="relative max-w-md">
        <FaSearch className="absolute left-3 top-3 text-slate-500 text-xs" />
        <input
          type="text"
          placeholder="Search by School Name, Head Master Name, Phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Single Main Table: Government Schools */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">School Name</th>
                <th className="p-3">Head Master Name</th>
                <th className="p-3">Contact Number</th>
                <th className="p-3 text-right">Granted Amount (₹)</th>
                <th className="p-3 text-right">Items Purchased Cost (₹)</th>
                <th className="p-3 text-right">Remaining Balance (₹)</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-500">
                    No Government School records found. Click <strong>"+ Add Government School"</strong> to create one.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-100">{s.schoolName}</td>
                    <td className="p-3 font-semibold text-slate-300">{s.headmasterName}</td>
                    <td className="p-3 font-mono">{s.contactNumber}</td>
                    <td className="p-3 text-right font-bold text-slate-100">
                      ₹{s.grantedAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-blue-400">
                      ₹{(s.totalSpent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-400">
                      ₹{(s.remainingAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(s)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded text-[10px] font-bold transition flex items-center gap-1"
                          title="View Purchased Items & Ledger"
                        >
                          <FaEye /> Purchased Items
                        </button>
                        <button
                          onClick={() => handleOpenModal(s)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 transition"
                          title="Edit School"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id, s.schoolName)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition"
                          title="Delete School"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add / Edit Government School */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <FaLandmark /> {editingSchool ? "Edit Government School" : "Add Government School"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">School Name *</label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="e.g. Government High School, Main Branch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Head Master Name *</label>
                <input
                  type="text"
                  required
                  value={formData.headmasterName}
                  onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                  placeholder="e.g. Head Master Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Granted Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.grantedAmount}
                  onChange={(e) => setFormData({ ...formData, grantedAmount: e.target.value })}
                  placeholder="e.g. 100000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  {editingSchool ? "Update Record" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: View Purchased Items & Ledger Breakdown */}
      {selectedSchoolDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <FaBoxes /> Purchased Items History: {selectedSchoolDetails.schoolName}
                </h3>
                <p className="text-xs text-slate-400">
                  Head Master: {selectedSchoolDetails.headmasterName} • Phone: {selectedSchoolDetails.contactNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSchoolDetails(null);
                  setDetailsData(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            {detailsLoading || !detailsData ? (
              <div className="p-8 text-center text-slate-400">Loading purchase details...</div>
            ) : (
              <div className="overflow-y-auto space-y-5 flex-1 pr-1">
                {/* Summary Banner */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Granted Amount</span>
                    <span className="text-base font-black text-slate-100">
                      ₹{detailsData.summary.grantedAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Items Purchased Cost</span>
                    <span className="text-base font-black text-blue-400">
                      ₹{detailsData.summary.totalSpent?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Remaining Balance</span>
                    <span className="text-base font-black text-emerald-400">
                      ₹{detailsData.summary.remainingAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Purchased Items Table */}
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Itemised Purchased Products</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Invoice #</th>
                          <th className="p-2.5">Purchased Item Name</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5 text-right">Unit Price (₹)</th>
                          <th className="p-2.5 text-right">Total Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {detailsData.purchasedItems.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-4 text-center text-slate-500">
                              No items purchased by this school yet.
                            </td>
                          </tr>
                        ) : (
                          detailsData.purchasedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="p-2.5 font-mono">{new Date(item.date).toLocaleDateString()}</td>
                              <td className="p-2.5 font-mono font-bold text-amber-400">{item.invoiceNumber}</td>
                              <td className="p-2.5 font-semibold text-slate-100">{item.name}</td>
                              <td className="p-2.5 text-right font-bold text-slate-200">{item.qty}</td>
                              <td className="p-2.5 text-right">₹{item.price?.toLocaleString()}</td>
                              <td className="p-2.5 text-right font-black text-blue-400">
                                ₹{item.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoices List */}
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Invoice Bills Summary</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Invoice Number</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">Bill Total (Deducted from Grant)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {detailsData.invoices.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-4 text-center text-slate-500">
                              No billing invoices generated yet.
                            </td>
                          </tr>
                        ) : (
                          detailsData.invoices.map((inv) => (
                            <tr key={inv._id}>
                              <td className="p-2.5 font-mono font-bold text-amber-400">{inv.invoiceId}</td>
                              <td className="p-2.5 font-mono">{new Date(inv.date).toLocaleDateString()}</td>
                              <td className="p-2.5 text-right font-black text-amber-400">
                                -₹{inv.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GovSchoolsPage;
