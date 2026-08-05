import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGovCashPayments,
  createGovCashPayment,
  fetchGovSchools,
  fetchGovGrants,
  fetchGovTeachers,
} from "../govFundSlice";
import {
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaCalendarAlt,
  FaSchool,
  FaUserGraduate,
  FaLandmark,
  FaExclamationTriangle,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovCashPayments = () => {
  const dispatch = useDispatch();
  const { cashPayments, schools, grants, teachers, loading } = useSelector((state) => state.govFunds);

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    schoolId: "",
    grantId: "",
    teacherId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    purpose: "",
    remarks: "",
  });

  const [selectedGrantObject, setSelectedGrantObject] = useState(null);

  useEffect(() => {
    dispatch(fetchGovSchools());
    dispatch(fetchGovGrants());
    dispatch(fetchGovTeachers());
    dispatch(fetchGovCashPayments());
  }, [dispatch]);

  const availableGrantsForSchool = grants.filter(
    (g) => g.schoolId?._id === formData.schoolId || g.schoolId === formData.schoolId
  );
  const availableTeachersForSchool = teachers.filter(
    (t) => t.schoolId?._id === formData.schoolId || t.schoolId === formData.schoolId
  );

  const handleGrantChange = (e) => {
    const gId = e.target.value;
    const gObj = grants.find((g) => g._id === gId);
    setSelectedGrantObject(gObj);
    setFormData({ ...formData, grantId: gId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.schoolId || !formData.grantId || !formData.teacherId || !formData.amount || !formData.purpose) {
      setErrorMessage("Please fill all required fields");
      return;
    }

    const numAmount = parseFloat(formData.amount);
    const availableBalance = selectedGrantObject?.remainingBalance ?? selectedGrantObject?.grantAmount ?? 0;

    if (numAmount > availableBalance) {
      setErrorMessage(`Insufficient Grant Balance! Requested: ₹${numAmount}, Available: ₹${availableBalance}`);
      return;
    }

    const res = await dispatch(createGovCashPayment(formData));
    if (createGovCashPayment.rejected.match(res)) {
      setErrorMessage(res.payload || "Failed to record cash payment.");
    } else {
      setShowModal(false);
      setFormData({
        schoolId: "",
        grantId: "",
        teacherId: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        purpose: "",
        remarks: "",
      });
      setSelectedGrantObject(null);
      dispatch(fetchGovCashPayments());
      dispatch(fetchGovGrants());
    }
  };

  const filteredPayments = cashPayments.filter(
    (cp) =>
      cp.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      cp.teacherId?.teacherName?.toLowerCase().includes(search.toLowerCase()) ||
      cp.schoolId?.schoolName?.toLowerCase().includes(search.toLowerCase()) ||
      cp.grantId?.grantName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Processing Cash Payment Record..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-purple-400 flex items-center gap-2">
            <FaMoneyBillWave /> Teacher Cash Payment Module
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Record direct cash disbursements to teachers from sanctioned grant funds for external local purchases.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow"
        >
          <FaPlus /> Record Cash Payment
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FaSearch className="absolute left-3 top-3 text-slate-500 text-xs" />
        <input
          type="text"
          placeholder="Search purpose, teacher, school..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Cash Payments Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Teacher</th>
                <th className="p-3">School Name</th>
                <th className="p-3">Grant Name</th>
                <th className="p-3">Purpose & Remarks</th>
                <th className="p-3 text-right">Cash Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500">
                    No cash payments recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((cp) => (
                  <tr key={cp._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono">{new Date(cp.date).toLocaleDateString()}</td>
                    <td className="p-3 font-bold text-slate-100">{cp.teacherId?.teacherName || "N/A"}</td>
                    <td className="p-3 font-semibold">{cp.schoolId?.schoolName || "N/A"}</td>
                    <td className="p-3 text-amber-400 font-medium">{cp.grantId?.grantName || "N/A"}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{cp.purpose}</div>
                      {cp.remarks && <div className="text-[10px] text-slate-400">{cp.remarks}</div>}
                    </td>
                    <td className="p-3 text-right font-black text-purple-400">
                      ₹{cp.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Cash Payment */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                <FaMoneyBillWave /> Record Teacher Cash Disbursement
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <FaExclamationTriangle className="text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Select School */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select School *</label>
                  <select
                    required
                    value={formData.schoolId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        schoolId: e.target.value,
                        grantId: "",
                        teacherId: "",
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Select School --</option>
                    {schools.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.schoolName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Grant */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Grant *</label>
                  <select
                    required
                    disabled={!formData.schoolId}
                    value={formData.grantId}
                    onChange={handleGrantChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="">-- Select Grant --</option>
                    {availableGrantsForSchool.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.grantName} (Bal: ₹{(g.remainingBalance ?? g.grantAmount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Teacher */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Teacher *</label>
                  <select
                    required
                    disabled={!formData.schoolId}
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="">-- Select Teacher --</option>
                    {availableTeachersForSchool.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.teacherName} ({t.designation})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Available Balance Alert */}
                {selectedGrantObject && (
                  <div className="sm:col-span-2 p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-slate-300">Grant Available Balance:</span>
                    <span className="font-black text-emerald-400">
                      ₹{(selectedGrantObject.remainingBalance ?? selectedGrantObject.grantAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Cash Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cash Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Purpose */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Purpose of Cash Withdrawal *</label>
                  <input
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g. Purchase of local science experiment materials"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Additional Remarks</label>
                  <textarea
                    rows="2"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Optional details..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition"
                >
                  Save Cash Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovCashPayments;
