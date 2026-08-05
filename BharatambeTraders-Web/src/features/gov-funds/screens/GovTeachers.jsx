import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGovTeachers, createGovTeacher, updateGovTeacher, deleteGovTeacher, fetchGovSchools } from "../govFundSlice";
import axiosInstance from "../../../app/api/axiosInstance";
import {
  FaUserGraduate,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaFileInvoiceDollar,
  FaSchool,
  FaPhone,
  FaTimes,
  FaMoneyBillWave,
  FaShoppingBag,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovTeachers = () => {
  const dispatch = useDispatch();
  const { teachers, schools, loading } = useSelector((state) => state.govFunds);

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("");

  const [formData, setFormData] = useState({
    teacherName: "",
    mobileNumber: "",
    designation: "Teacher",
    schoolId: "",
    isActive: true,
  });

  // Teacher Ledger Modal State
  const [selectedLedgerTeacher, setSelectedLedgerTeacher] = useState(null);
  const [teacherLedgerData, setTeacherLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchGovSchools());
    dispatch(fetchGovTeachers(filterSchool));
  }, [dispatch, filterSchool]);

  const handleOpenModal = (teacher = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        teacherName: teacher.teacherName || "",
        mobileNumber: teacher.mobileNumber || "",
        designation: teacher.designation || "Teacher",
        schoolId: teacher.schoolId?._id || teacher.schoolId || "",
        isActive: teacher.isActive !== false,
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        teacherName: "",
        mobileNumber: "",
        designation: "Teacher",
        schoolId: schools.length > 0 ? schools[0]._id : "",
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teacherName || !formData.mobileNumber || !formData.schoolId) {
      alert("Teacher Name, Mobile Number, and School selection are required");
      return;
    }

    if (editingTeacher) {
      await dispatch(updateGovTeacher({ id: editingTeacher._id, teacherData: formData }));
    } else {
      await dispatch(createGovTeacher(formData));
    }
    setShowModal(false);
    dispatch(fetchGovTeachers(filterSchool));
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this teacher record?")) {
      await dispatch(deleteGovTeacher(id));
      dispatch(fetchGovTeachers(filterSchool));
    }
  };

  const handleViewLedger = async (teacher) => {
    setSelectedLedgerTeacher(teacher);
    setLedgerLoading(true);
    try {
      const res = await axiosInstance.get(`/gov-funds/ledgers/teacher/${teacher._id}`);
      setTeacherLedgerData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load teacher ledger details");
    } finally {
      setLedgerLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.teacherName?.toLowerCase().includes(search.toLowerCase()) ||
      t.mobileNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.designation?.toLowerCase().includes(search.toLowerCase()) ||
      t.schoolId?.schoolName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Loading Teacher Master records..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaUserGraduate /> Government Teacher Master
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register teachers authorized to make material purchases and withdraw cash against school grants.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-2 shadow"
        >
          <FaPlus /> Add New Teacher
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-slate-500 text-xs" />
          <input
            type="text"
            placeholder="Search Teacher Name, Phone, Designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Schools</option>
          {schools.map((s) => (
            <option key={s._id} value={s._id}>
              {s.schoolName}
            </option>
          ))}
        </select>
      </div>

      {/* Teachers Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Teacher Name & Designation</th>
                <th className="p-3">Mobile Number</th>
                <th className="p-3">Assigned School</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500">
                    No teacher records found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-bold text-slate-100">{t.teacherName}</div>
                      <div className="text-[10px] text-slate-400">{t.designation}</div>
                    </td>
                    <td className="p-3 font-mono">{t.mobileNumber}</td>
                    <td className="p-3 font-semibold text-amber-400">{t.schoolId?.schoolName || "N/A"}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewLedger(t)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <FaFileInvoiceDollar /> Ledger
                        </button>
                        <button
                          onClick={() => handleOpenModal(t)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 transition"
                          title="Edit Teacher"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition"
                          title="Delete Teacher"
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

      {/* Modal: Create/Edit Teacher */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <FaUserGraduate /> {editingTeacher ? "Edit Teacher Details" : "Add New Teacher"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select School *</label>
                <select
                  required
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Teacher Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
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
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Senior Assistant Teacher / Science Teacher"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="isActive" className="text-xs text-slate-300 cursor-pointer">
                  Active Status (Allowed to make grant purchases)
                </label>
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
                  {editingTeacher ? "Update Teacher" : "Save Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Teacher Ledger View */}
      {selectedLedgerTeacher && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <FaUserGraduate /> Teacher Ledger: {selectedLedgerTeacher.teacherName}
                </h3>
                <p className="text-xs text-slate-400">
                  School: {selectedLedgerTeacher.schoolId?.schoolName} • Phone: {selectedLedgerTeacher.mobileNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedLedgerTeacher(null);
                  setTeacherLedgerData(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            {ledgerLoading || !teacherLedgerData ? (
              <div className="p-8 text-center text-slate-400">Loading teacher ledger statement...</div>
            ) : (
              <div className="overflow-y-auto space-y-6 flex-1 pr-1">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cash Taken</span>
                    <span className="text-base font-black text-purple-400">
                      ₹{(teacherLedgerData.summary.cashTaken || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Material Purchased</span>
                    <span className="text-base font-black text-blue-400">
                      ₹{(teacherLedgerData.summary.materialPurchased || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Spent</span>
                    <span className="text-base font-black text-emerald-400">
                      ₹{(teacherLedgerData.summary.totalSpent || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Invoices List */}
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Invoice Purchase History</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-2">Invoice #</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Grant</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {teacherLedgerData.invoices.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-3 text-center text-slate-500">No invoice purchases by teacher yet.</td>
                          </tr>
                        ) : (
                          teacherLedgerData.invoices.map((inv) => (
                            <tr key={inv._id}>
                              <td className="p-2 font-mono font-bold text-amber-400">{inv.invoiceId}</td>
                              <td className="p-2">{new Date(inv.date).toLocaleDateString()}</td>
                              <td className="p-2">{inv.govGrantId?.grantName || "—"}</td>
                              <td className="p-2 text-right font-bold text-slate-100">₹{inv.total?.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cash Payment History */}
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Direct Cash Withdrawals</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Purpose</th>
                          <th className="p-2">Grant</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {teacherLedgerData.cashPayments.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-3 text-center text-slate-500">No cash withdrawals recorded.</td>
                          </tr>
                        ) : (
                          teacherLedgerData.cashPayments.map((cp) => (
                            <tr key={cp._id}>
                              <td className="p-2">{new Date(cp.date).toLocaleDateString()}</td>
                              <td className="p-2 font-medium">{cp.purpose}</td>
                              <td className="p-2">{cp.grantId?.grantName || "—"}</td>
                              <td className="p-2 text-right font-bold text-purple-400">₹{cp.amount?.toLocaleString()}</td>
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

export default GovTeachers;
