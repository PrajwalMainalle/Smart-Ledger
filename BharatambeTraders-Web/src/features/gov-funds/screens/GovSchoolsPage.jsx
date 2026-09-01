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
  FaMoneyBillWave,
  FaHistory,
  FaUndo,
  FaCheckCircle,
  FaPrint,
  FaExchangeAlt,
  FaDownload,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";
import GovFundVoucherModal from "../components/GovFundVoucherModal";

const GovSchoolsPage = () => {
  const [schools, setSchools] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State: Create / Edit School
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [schoolFormData, setSchoolFormData] = useState({
    schoolName: "",
    headmasterName: "",
    contactNumber: "",
    grantedAmount: "",
  });

  // Modal State: Create Government Fund Account
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundFormData, setFundFormData] = useState({
    schoolId: "",
    grantName: "Composite School Grant",
    grantCategory: "Composite School Grant",
    academicYear: "2026-27",
    department: "School Education Department",
    approvedBudget: "",
    referenceNumber: "",
    notes: "",
  });

  // Modal State: View Permanent Audit Ledger
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolDetailsData, setSchoolDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Voucher Print State
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [schoolsRes, fundsRes] = await Promise.all([
        axiosInstance.get("/gov-funds/schools"),
        axiosInstance.get("/gov-funds/funds"),
      ]);
      setSchools(schoolsRes.data);
      setFunds(fundsRes.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load Government School Fund data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSchoolModal = (school = null) => {
    if (school) {
      setEditingSchool(school);
      setSchoolFormData({
        schoolName: school.schoolName || "",
        headmasterName: school.headmasterName || "",
        contactNumber: school.contactNumber || "",
        grantedAmount: school.grantedAmount || "",
      });
    } else {
      setEditingSchool(null);
      setSchoolFormData({
        schoolName: "",
        headmasterName: "",
        contactNumber: "",
        grantedAmount: "",
      });
    }
    setShowSchoolModal(true);
  };

  const handleSchoolSubmit = async (e) => {
    e.preventDefault();
    if (!schoolFormData.schoolName || !schoolFormData.headmasterName || !schoolFormData.contactNumber) {
      alert("Please fill all required fields");
      return;
    }

    const payload = {
      schoolName: schoolFormData.schoolName,
      headmasterName: schoolFormData.headmasterName,
      contactNumber: schoolFormData.contactNumber,
      mobileNumber: schoolFormData.contactNumber,
      grantedAmount: schoolFormData.grantedAmount || 0,
    };

    try {
      if (editingSchool) {
        await axiosInstance.put(`/gov-funds/schools/${editingSchool._id}`, payload);
      } else {
        await axiosInstance.post("/gov-funds/schools", payload);
      }
      setShowSchoolModal(false);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to save school record");
    }
  };

  const handleOpenFundModal = (schoolId = "") => {
    setFundFormData({
      schoolId: schoolId || (schools.length > 0 ? schools[0]._id : ""),
      grantName: "Composite School Grant",
      grantCategory: "Composite School Grant",
      academicYear: "2026-27",
      department: "School Education Department",
      approvedBudget: "",
      referenceNumber: "",
      notes: "",
    });
    setShowFundModal(true);
  };

  const handleFundSubmit = async (e) => {
    e.preventDefault();
    if (!fundFormData.schoolId || !fundFormData.approvedBudget || parseFloat(fundFormData.approvedBudget) <= 0) {
      alert("Please select a school and enter an Approved Budget (> ₹0)");
      return;
    }

    try {
      await axiosInstance.post("/gov-funds/funds", fundFormData);
      alert("Government Fund Account created successfully!");
      setShowFundModal(false);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create Government Fund Account");
    }
  };

  const handleActivateFund = async (fundId) => {
    if (window.confirm("Activate this Government Fund Account? This enables material distribution & cash withdrawals via POS.")) {
      try {
        await axiosInstance.put(`/gov-funds/funds/${fundId}/activate`);
        alert("Fund Account activated successfully!");
        fetchInitialData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Failed to activate fund account");
      }
    }
  };

  const handleViewSchoolLedger = async (school) => {
    setSelectedSchool(school);
    setShowLedgerModal(true);
    setDetailsLoading(true);
    try {
      const res = await axiosInstance.get(`/gov-funds/schools/${school._id}`);
      setSchoolDetailsData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load school fund audit ledger");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleReverseLedger = async (ledgerId, voucherNo) => {
    const reason = window.prompt(`Enter reason for reversing transaction ${voucherNo}:`, "Correction of entry");
    if (reason !== null) {
      try {
        const res = await axiosInstance.post(`/gov-funds/ledger/${ledgerId}/reverse`, { reason });
        alert(res.data.message || "Transaction reversed successfully!");
        if (selectedSchool) {
          handleViewSchoolLedger(selectedSchool);
        }
        fetchInitialData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Failed to reverse transaction");
      }
    }
  };

  const handleDeleteSchool = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete school record for "${name}"?`)) {
      try {
        await axiosInstance.delete(`/gov-funds/schools/${id}`);
        fetchInitialData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Failed to delete school");
      }
    }
  };

  const filteredSchools = React.useMemo(() => {
    return schools.filter(
      (s) =>
        s.schoolName?.toLowerCase().includes(search.toLowerCase()) ||
        s.headmasterName?.toLowerCase().includes(search.toLowerCase()) ||
        s.contactNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [schools, search]);

  // Overall KPI Aggregations
  const { totalApprovedAll, totalMaterialUtilizedAll, totalCashWithdrawnAll, totalRemainingAll } = React.useMemo(() => {
    const approved = funds.reduce((acc, f) => acc + Number(f.approvedBudget || 0), 0);
    const matUtilized = funds.reduce((acc, f) => acc + Number(f.materialUtilized || 0), 0);
    const cashWithdrawn = funds.reduce((acc, f) => acc + Number(f.cashWithdrawn || 0), 0);
    const remaining = funds.reduce((acc, f) => {
      const appr = Number(f.approvedBudget || 0);
      const mat = Number(f.materialUtilized || 0);
      const cash = Number(f.cashWithdrawn || 0);
      const rem = f.remainingBalance !== undefined && !isNaN(f.remainingBalance) ? Number(f.remainingBalance) : (appr - mat - cash);
      return acc + (isNaN(rem) ? 0 : rem);
    }, 0);
    return {
      totalApprovedAll: approved,
      totalMaterialUtilizedAll: matUtilized,
      totalCashWithdrawnAll: cashWithdrawn,
      totalRemainingAll: remaining,
    };
  }, [funds]);

  return (
    <div className="space-y-6 text-slate-100">
      {loading && <LoadingOverlay message="Loading Government School Funds..." />}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-5 md:p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <FaLandmark className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              Government School Fund Management
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Manage school fund accounts, material distributions, cash withdrawals, and audit ledgers in real time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenFundModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            <FaPlus /> Create Fund Account
          </button>
          <button
            onClick={() => handleOpenSchoolModal()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <FaSchool /> Add Government School
          </button>
        </div>
      </div>

      {/* Top Analytics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Approved Budget</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><FaLandmark /></div>
          </div>
          <p className="text-2xl font-black text-slate-100 font-mono">₹{totalApprovedAll.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">{funds.length} Fund Accounts Registered</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Materials Utilized</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><FaBoxes /></div>
          </div>
          <p className="text-2xl font-black text-blue-400 font-mono">₹{totalMaterialUtilizedAll.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Physical inventory materials issued</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cash Withdrawn</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><FaMoneyBillWave /></div>
          </div>
          <p className="text-2xl font-black text-purple-400 font-mono">₹{totalCashWithdrawnAll.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Teacher cash withdrawals logged</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Remaining Balance</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><FaWallet /></div>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">₹{totalRemainingAll.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Available for POS utilization</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
          <div className="relative flex-1 min-w-[240px]">
            <FaSearch className="absolute left-3.5 top-3 text-slate-500 text-xs" />
            <input
              type="text"
              placeholder="Search school name, headmaster, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-100">{filteredSchools.length}</strong> Government Schools
          </div>
        </div>

        {/* Table of Schools */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">School Details</th>
                <th className="p-4">Head Master Info</th>
                <th className="p-4 text-right">Approved Budget</th>
                <th className="p-4 text-right">Material Utilized</th>
                <th className="p-4 text-right">Cash Withdrawn</th>
                <th className="p-4 text-right">Remaining Balance</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredSchools.map((school) => {
                const schoolFunds = funds.filter(f => (f.schoolId?._id === school._id || f.schoolId === school._id));
                const approved = schoolFunds.reduce((acc, f) => acc + (f.approvedBudget || 0), school.grantedAmount || 0);
                const matUtil = schoolFunds.reduce((acc, f) => acc + (f.materialUtilized || 0), 0);
                const cashUtil = schoolFunds.reduce((acc, f) => acc + (f.cashWithdrawn || 0), 0);
                const remaining = approved - (matUtil + cashUtil);

                return (
                  <tr key={school._id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-100 text-sm flex items-center gap-2">
                        <FaSchool className="text-amber-400" /> {school.schoolName}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{schoolFunds.length} Active Fund Accounts</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-200">{school.headmasterName}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <FaPhone className="text-[10px]" /> {school.contactNumber || "N/A"}
                      </p>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-100">₹{approved.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-blue-400">₹{matUtil.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-purple-400">₹{cashUtil.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-black text-emerald-400 text-sm">₹{remaining.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewSchoolLedger(school)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          title="View Fund Ledger & History"
                        >
                          <FaHistory /> Audit Ledger
                        </button>
                        <button
                          onClick={() => handleOpenFundModal(school._id)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Add Fund Account"
                        >
                          <FaPlus />
                        </button>
                        <button
                          onClick={() => handleOpenSchoolModal(school)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit School Info"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteSchool(school._id, school.schoolName)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete School Record"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSchools.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500 font-medium">
                    No Government Schools found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT SCHOOL MODAL */}
      {showSchoolModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FaSchool className="text-amber-400" />
                {editingSchool ? "Edit Government School" : "Add Government School"}
              </h3>
              <button onClick={() => setShowSchoolModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSchoolSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">School Name *</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.schoolName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, schoolName: e.target.value })}
                  placeholder="e.g. Govt High School Hulsoor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Headmaster Name *</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.headmasterName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, headmasterName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.contactNumber}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, contactNumber: e.target.value })}
                  placeholder="e.g. 9000000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Initial Granted Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={schoolFormData.grantedAmount}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, grantedAmount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSchoolModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl shadow-lg"
                >
                  Save School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE GOVERNMENT FUND ACCOUNT MODAL */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FaLandmark className="text-amber-400" /> Create Government Fund Account
              </h3>
              <button onClick={() => setShowFundModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleFundSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Government School *</label>
                <select
                  required
                  value={fundFormData.schoolId}
                  onChange={(e) => setFundFormData({ ...fundFormData, schoolId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select School --</option>
                  {schools.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.schoolName} ({s.headmasterName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Grant Name *</label>
                  <input
                    type="text"
                    required
                    value={fundFormData.grantName}
                    onChange={(e) => setFundFormData({ ...fundFormData, grantName: e.target.value })}
                    placeholder="e.g. Library Grant"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={fundFormData.academicYear}
                    onChange={(e) => setFundFormData({ ...fundFormData, academicYear: e.target.value })}
                    placeholder="e.g. 2026-27"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Approved Budget Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={fundFormData.approvedBudget}
                  onChange={(e) => setFundFormData({ ...fundFormData, approvedBudget: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reference Number / Sanction Order (Optional)</label>
                <input
                  type="text"
                  value={fundFormData.referenceNumber}
                  onChange={(e) => setFundFormData({ ...fundFormData, referenceNumber: e.target.value })}
                  placeholder="e.g. GOVT/EDU/2026/8942"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl shadow-lg"
                >
                  Create Fund Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMANENT AUDIT LEDGER & HISTORY MODAL */}
      {showLedgerModal && selectedSchool && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FaHistory className="text-amber-400" /> Government Fund Audit Ledger – {selectedSchool.schoolName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permanent audit history log of all material distributions, cash withdrawals, and fund balance updates.
                </p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400 hover:text-white p-2">
                <FaTimes />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {detailsLoading ? (
                <div className="p-8 text-center text-slate-400">Loading audit ledger history...</div>
              ) : schoolDetailsData ? (
                <>
                  {/* Fund Accounts Summary Grid */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <FaLandmark className="text-amber-400" /> Government Fund Accounts ({schoolDetailsData.funds?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(schoolDetailsData.funds || []).map((f) => (
                        <div key={f._id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-100 text-xs">{f.fundNumber} | {f.grantName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              f.status === "Fund Active" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                              f.status === "Partially Utilized" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                              "bg-slate-800 text-slate-400"
                            }`}>
                              {f.status}
                            </span>
                          </div>
                          {f.invoiceNumber && (
                            <p className="text-[11px] text-slate-400">Ref Tax Invoice: <strong className="text-slate-200 font-mono">{f.invoiceNumber}</strong></p>
                          )}
                          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-900 text-[11px] text-center">
                            <div>
                              <span className="text-slate-500 block text-[10px]">Approved</span>
                              <span className="font-bold text-slate-200">₹{(f.approvedBudget || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[10px]">Utilized</span>
                              <span className="font-bold text-blue-400">₹{((f.materialUtilized || 0) + (f.cashWithdrawn || 0)).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[10px]">Remaining</span>
                              <span className="font-bold text-emerald-400">₹{(f.remainingBalance || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          {["Invoice Issued", "Pending Approval"].includes(f.status) && (
                            <button
                              onClick={() => handleActivateGovFund(f._id)}
                              className="w-full mt-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold"
                            >
                              <FaCheckCircle className="inline mr-1" /> Activate Fund Account
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permanent Audit Log Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <FaReceipt className="text-amber-400" /> Permanent Transaction Ledger Log ({schoolDetailsData.ledgers?.length || 0})
                    </h4>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[9.5px] tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="p-3">Voucher #</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Teacher Info</th>
                            <th className="p-3 text-right">Deducted Amount</th>
                            <th className="p-3 text-right">Balance After</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {(schoolDetailsData.ledgers || []).map((log) => (
                            <tr key={log._id} className={log.isReversal ? "bg-red-950/20" : ""}>
                              <td className="p-3 font-mono font-bold text-amber-400">{log.voucherNumber}</td>
                              <td className="p-3 text-slate-400">{new Date(log.date).toLocaleDateString("en-IN")}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.type === "Material Issue" ? "bg-blue-950 text-blue-400 border border-blue-800" :
                                  log.type === "Cash Withdrawal" ? "bg-purple-950 text-purple-400 border border-purple-800" :
                                  log.type === "Reversal" ? "bg-red-950 text-red-400 border border-red-800" :
                                  "bg-amber-950 text-amber-400 border border-amber-800"
                                }`}>
                                  {log.type}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">
                                {log.teacherDetails?.name || "N/A"}
                                {log.teacherDetails?.designation && <span className="text-slate-500 block text-[10px]">{log.teacherDetails.designation}</span>}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-100">₹{(log.amount || 0).toFixed(2)}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{(log.balanceAfter || 0).toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedVoucher(log)}
                                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded"
                                    title="Print / View Voucher"
                                  >
                                    <FaPrint />
                                  </button>
                                  <button
                                    onClick={() => {
                                      let token = localStorage.getItem("bt_token") || localStorage.getItem("token") || "";
                                      if (!token) {
                                        try {
                                          const userStr = localStorage.getItem("bt_user") || localStorage.getItem("user");
                                          if (userStr) token = JSON.parse(userStr)?.token || "";
                                        } catch (e) {}
                                      }

                                      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                                      window.open(`${baseUrl}/gov-funds/vouchers/${log._id}/pdf?token=${encodeURIComponent(token)}&t=${Date.now()}`, "_blank");
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded"
                                    title="Download Voucher PDF"
                                  >
                                    <FaDownload />
                                  </button>
                                  {!log.isReversal && log.type !== "Reversal" && (
                                    <button
                                      onClick={() => handleReverseLedger(log._id, log.voucherNumber)}
                                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded"
                                      title="Reverse Transaction (Admin)"
                                    >
                                      <FaUndo />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(schoolDetailsData.ledgers || []).length === 0 && (
                            <tr>
                              <td colSpan="7" className="p-8 text-center text-slate-500">
                                No ledger transactions logged yet. Use POS with "Government School Fund" payment method to process visits.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER REPRINT MODAL */}
      {selectedVoucher && (
        <GovFundVoucherModal
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          merchantInfo={{ firmName: "BHARATAMBE TRADERS", mobileNumber: "9741166742" }}
        />
      )}

    </div>
  );
};

export default GovSchoolsPage;
