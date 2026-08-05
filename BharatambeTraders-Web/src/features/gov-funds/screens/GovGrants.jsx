import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGovGrants, createGovGrant, fetchGovSchools, closeGovGrant } from "../govFundSlice";
import {
  FaLandmark,
  FaPlus,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaShoppingBag,
  FaHistory,
  FaTimes,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovGrants = () => {
  const dispatch = useDispatch();
  const { grants, schools, loading, error } = useSelector((state) => state.govFunds);

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [formData, setFormData] = useState({
    schoolId: "",
    headmasterName: "",
    grantName: "",
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    grantCategory: "Composite School Grant",
    grantAmount: "",
    amountReceivedDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    notes: "",
  });

  const [settlementError, setSettlementError] = useState("");

  useEffect(() => {
    dispatch(fetchGovSchools());
    dispatch(fetchGovGrants({ schoolId: filterSchool, status: filterStatus, academicYear: filterYear, search }));
  }, [dispatch, filterSchool, filterStatus, filterYear, search]);

  const handleSchoolChange = (e) => {
    const sId = e.target.value;
    const selectedSchool = schools.find((s) => s._id === sId);
    setFormData({
      ...formData,
      schoolId: sId,
      headmasterName: selectedSchool ? selectedSchool.headmasterName : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schoolId || !formData.grantName || !formData.grantAmount) {
      alert("Please fill all required fields");
      return;
    }

    const res = await dispatch(createGovGrant(formData));
    if (createGovGrant.fulfilled.match(res)) {
      setShowModal(false);
      setFormData({
        schoolId: "",
        headmasterName: "",
        grantName: "",
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        grantCategory: "Composite School Grant",
        grantAmount: "",
        amountReceivedDate: new Date().toISOString().split("T")[0],
        referenceNumber: "",
        notes: "",
      });
      dispatch(fetchGovGrants());
    }
  };

  const handleCloseGrant = async (grant) => {
    setSettlementError("");
    const res = await dispatch(closeGovGrant(grant._id));
    if (closeGovGrant.rejected.match(res)) {
      setSettlementError(res.payload || "Failed to close grant.");
    } else {
      alert(`Grant "${grant.grantName}" settled and closed successfully!`);
      dispatch(fetchGovGrants());
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Processing Grant records..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaLandmark /> Government Grant Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sanction and monitor Government Education Grants received into business account.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-2 shadow"
        >
          <FaPlus /> Create New Grant
        </button>
      </div>

      {/* Settlement Error Warning Banner */}
      {settlementError && (
        <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-xl flex items-center justify-between text-red-300 text-xs">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-400 text-base" />
            <span>{settlementError}</span>
          </div>
          <button onClick={() => setSettlementError("")} className="text-slate-400 hover:text-white">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-slate-500 text-xs" />
          <input
            type="text"
            placeholder="Search Grant, School, Ref No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter School */}
        <div>
          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s._id} value={s._id}>
                {s.schoolName}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Grants</option>
            <option value="Closed">Closed Grants</option>
          </select>
        </div>

        {/* Filter Academic Year */}
        <div>
          <input
            type="text"
            placeholder="AY (e.g. 2025-2026)"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Grants Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">School & Headmaster</th>
                <th className="p-3">Grant Name & AY</th>
                <th className="p-3">Category & Ref No</th>
                <th className="p-3 text-right">Total Grant</th>
                <th className="p-3 text-right">Materials</th>
                <th className="p-3 text-right">Cash Given</th>
                <th className="p-3 text-right">Remaining Balance</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {grants.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-500">
                    No Government Grants found matching filters.
                  </td>
                </tr>
              ) : (
                grants.map((g) => {
                  const rem = g.remainingBalance ?? g.grantAmount;
                  const mat = g.materialsPurchased ?? 0;
                  const cash = g.cashGiven ?? 0;

                  return (
                    <tr key={g._id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-slate-100">{g.schoolId?.schoolName || "N/A"}</div>
                        <div className="text-[10px] text-slate-400">HM: {g.headmasterName}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-amber-400">{g.grantName}</div>
                        <div className="text-[10px] text-slate-400">AY: {g.academicYear}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-300">{g.grantCategory}</div>
                        <div className="text-[10px] font-mono text-slate-400">{g.referenceNumber || "—"}</div>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-100">
                        ₹{g.grantAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-semibold text-blue-400">
                        ₹{mat?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-semibold text-purple-400">
                        ₹{cash?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-400">
                        ₹{rem?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            g.status === "Active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {g.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {g.status === "Active" ? (
                          <button
                            onClick={() => handleCloseGrant(g)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition shadow"
                            title="Settle and Close Grant"
                          >
                            Close Grant
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold">Closed on {g.closedAt ? new Date(g.closedAt).toLocaleDateString() : "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Grant */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <FaLandmark /> Create New Government Grant
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select School */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">School Name *</label>
                  <select
                    required
                    value={formData.schoolId}
                    onChange={handleSchoolChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select School --</option>
                    {schools.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.schoolName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Headmaster Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Headmaster Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.headmasterName}
                    onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                    placeholder="Headmaster Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Grant Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Grant Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.grantName}
                    onChange={(e) => setFormData({ ...formData, grantName: e.target.value })}
                    placeholder="e.g. Composite School Grant 2025"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Academic Year *</label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="e.g. 2025-2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Grant Category */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Grant Category *</label>
                  <select
                    value={formData.grantCategory}
                    onChange={(e) => setFormData({ ...formData, grantCategory: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Composite School Grant">Composite School Grant</option>
                    <option value="Maintenance Grant">Maintenance Grant</option>
                    <option value="Sports & Physical Education">Sports & Physical Education</option>
                    <option value="Library & Reading Grant">Library & Reading Grant</option>
                    <option value="ICT & Smart Classroom Grant">ICT & Smart Classroom Grant</option>
                    <option value="TLM & Stationary Grant">TLM & Stationary Grant</option>
                    <option value="Other Grant">Other Grant</option>
                  </select>
                </div>

                {/* Grant Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Grant Sanctioned Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.grantAmount}
                    onChange={(e) => setFormData({ ...formData, grantAmount: e.target.value })}
                    placeholder="e.g. 100000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Date Received */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Amount Received Date</label>
                  <input
                    type="date"
                    value={formData.amountReceivedDate}
                    onChange={(e) => setFormData({ ...formData, amountReceivedDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Reference Number / Chq No</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="e.g. UTR12345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional grant details..."
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
                  Sanction & Create Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovGrants;
