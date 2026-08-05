import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGovSchools, createGovSchool, updateGovSchool, deleteGovSchool } from "../govFundSlice";
import axiosInstance from "../../../app/api/axiosInstance";
import {
  FaSchool,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaFileInvoiceDollar,
  FaLandmark,
  FaTimes,
  FaPhone,
  FaUserTie,
  FaMapMarkerAlt,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovSchools = () => {
  const dispatch = useDispatch();
  const { schools, loading } = useSelector((state) => state.govFunds);

  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    schoolName: "",
    udiseCode: "",
    headmasterName: "",
    mobileNumber: "",
    address: "",
    district: "",
    taluk: "",
    remarks: "",
  });

  // School Ledger Modal State
  const [selectedLedgerSchool, setSelectedLedgerSchool] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchGovSchools());
  }, [dispatch]);

  const handleOpenModal = (school = null) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        schoolName: school.schoolName || "",
        udiseCode: school.udiseCode || "",
        headmasterName: school.headmasterName || "",
        mobileNumber: school.mobileNumber || "",
        address: school.address || "",
        district: school.district || "",
        taluk: school.taluk || "",
        remarks: school.remarks || "",
      });
    } else {
      setEditingSchool(null);
      setFormData({
        schoolName: "",
        udiseCode: "",
        headmasterName: "",
        mobileNumber: "",
        address: "",
        district: "",
        taluk: "",
        remarks: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.headmasterName || !formData.mobileNumber) {
      alert("School Name, Headmaster Name, and Mobile Number are required");
      return;
    }

    if (editingSchool) {
      await dispatch(updateGovSchool({ id: editingSchool._id, schoolData: formData }));
    } else {
      await dispatch(createGovSchool(formData));
    }
    setShowModal(false);
    dispatch(fetchGovSchools());
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this school record?")) {
      const res = await dispatch(deleteGovSchool(id));
      if (deleteGovSchool.rejected.match(res)) {
        alert(res.payload || "Failed to delete school");
      } else {
        dispatch(fetchGovSchools());
      }
    }
  };

  const handleViewLedger = async (school) => {
    setSelectedLedgerSchool(school);
    setLedgerLoading(true);
    try {
      const res = await axiosInstance.get(`/gov-funds/ledgers/school/${school._id}`);
      setLedgerData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load school ledger details");
    } finally {
      setLedgerLoading(false);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.schoolName?.toLowerCase().includes(search.toLowerCase()) ||
      s.headmasterName?.toLowerCase().includes(search.toLowerCase()) ||
      s.udiseCode?.toLowerCase().includes(search.toLowerCase()) ||
      s.district?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Loading School Master records..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaSchool /> Government School Master
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain government schools directory, UDISE codes, headmasters, and linked grant ledgers.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-2 shadow"
        >
          <FaPlus /> Add New School
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <FaSearch className="absolute left-3 top-3 text-slate-500 text-xs" />
        <input
          type="text"
          placeholder="Search by School Name, HM, UDISE, District..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* School Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchools.length === 0 ? (
          <div className="col-span-full bg-slate-900/60 p-8 rounded-xl border border-slate-800 text-center text-slate-500 text-xs">
            No schools found matching search criteria.
          </div>
        ) : (
          filteredSchools.map((s) => (
            <div
              key={s._id}
              className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 p-4 rounded-xl shadow-lg flex flex-col justify-between space-y-4 transition"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <FaSchool className="text-amber-400" /> {s.schoolName}
                    </h3>
                    {s.udiseCode && <span className="text-[10px] font-mono text-amber-400/80">UDISE: {s.udiseCode}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(s)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 transition"
                      title="Edit School"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 transition"
                      title="Delete School"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <p className="flex items-center gap-2 text-slate-400">
                    <FaUserTie className="text-amber-500 text-xs" /> HM: <span className="text-slate-200 font-semibold">{s.headmasterName}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-400">
                    <FaPhone className="text-emerald-500 text-xs" /> Phone: <span className="text-slate-200">{s.mobileNumber}</span>
                  </p>
                  {(s.district || s.taluk) && (
                    <p className="flex items-center gap-2 text-slate-400">
                      <FaMapMarkerAlt className="text-red-400 text-xs" /> {s.taluk ? `${s.taluk}, ` : ""}
                      {s.district}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Summary & Ledger Link */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Grant Balance</span>
                  <span className="text-xs font-black text-emerald-400">
                    ₹{(s.totalRemainingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={() => handleViewLedger(s)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                >
                  <FaFileInvoiceDollar /> School Ledger
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create/Edit School */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <FaSchool /> {editingSchool ? "Edit School Details" : "Add New School Master"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">School Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="e.g. Government Higher Primary School, Main Branch"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">UDISE Code (Optional)</label>
                  <input
                    type="text"
                    value={formData.udiseCode}
                    onChange={(e) => setFormData({ ...formData, udiseCode: e.target.value })}
                    placeholder="11-digit UDISE Code"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Headmaster Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.headmasterName}
                    onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                    placeholder="Headmaster Full Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder="10-digit Mobile Number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Taluk</label>
                  <input
                    type="text"
                    value={formData.taluk}
                    onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                    placeholder="Taluk / Block"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="District"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">School Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full Address"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Remarks</label>
                <textarea
                  rows="2"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional remarks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
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
                  {editingSchool ? "Update School" : "Save School Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: School Ledger View */}
      {selectedLedgerSchool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <FaLandmark /> School Ledger: {selectedLedgerSchool.schoolName}
                </h3>
                <p className="text-xs text-slate-400">Headmaster: {selectedLedgerSchool.headmasterName} • Phone: {selectedLedgerSchool.mobileNumber}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedLedgerSchool(null);
                  setLedgerData(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            {ledgerLoading || !ledgerData ? (
              <div className="p-8 text-center text-slate-400">Loading full school ledger...</div>
            ) : (
              <div className="overflow-y-auto space-y-6 flex-1 pr-1">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Sanctioned</span>
                    <span className="text-sm font-black text-slate-100">₹{(ledgerData.summary.totalSanctioned || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Material Purchased</span>
                    <span className="text-sm font-black text-blue-400">₹{(ledgerData.summary.totalPurchased || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cash Given</span>
                    <span className="text-sm font-black text-purple-400">₹{(ledgerData.summary.totalCashGiven || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Current Balance</span>
                    <span className="text-sm font-black text-emerald-400">₹{(ledgerData.summary.currentBalance || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Grants Section */}
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Grant History</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-2">Grant Name</th>
                          <th className="p-2">AY</th>
                          <th className="p-2 text-right">Sanctioned</th>
                          <th className="p-2 text-right">Purchased</th>
                          <th className="p-2 text-right">Cash</th>
                          <th className="p-2 text-right">Balance</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {ledgerData.grants.map((g) => (
                          <tr key={g._id}>
                            <td className="p-2 font-semibold">{g.grantName}</td>
                            <td className="p-2">{g.academicYear}</td>
                            <td className="p-2 text-right font-bold text-slate-100">₹{g.totalGrantAmount?.toLocaleString()}</td>
                            <td className="p-2 text-right text-blue-400">₹{g.materialsPurchased?.toLocaleString()}</td>
                            <td className="p-2 text-right text-purple-400">₹{g.cashGiven?.toLocaleString()}</td>
                            <td className="p-2 text-right font-black text-emerald-400">₹{g.remainingBalance?.toLocaleString()}</td>
                            <td className="p-2 text-center font-bold text-[10px]">{g.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Invoices Section */}
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Material Purchase Invoices</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-2">Invoice #</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Teacher</th>
                          <th className="p-2">Grant</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {ledgerData.invoices.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-3 text-center text-slate-500">No invoices generated for this school yet.</td>
                          </tr>
                        ) : (
                          ledgerData.invoices.map((inv) => (
                            <tr key={inv._id}>
                              <td className="p-2 font-mono font-bold text-amber-400">{inv.invoiceId}</td>
                              <td className="p-2">{new Date(inv.date).toLocaleDateString()}</td>
                              <td className="p-2">{inv.govDetails?.teacherName || "—"}</td>
                              <td className="p-2">{inv.govDetails?.grantName || "—"}</td>
                              <td className="p-2 text-right font-bold text-slate-100">₹{inv.total?.toLocaleString()}</td>
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

export default GovSchools;
