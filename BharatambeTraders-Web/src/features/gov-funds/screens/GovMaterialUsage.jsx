import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGovMaterialUsage, fetchGovSchools, fetchGovGrants, fetchGovTeachers } from "../govFundSlice";
import {
  FaBoxes,
  FaSearch,
  FaFileExcel,
  FaPrint,
  FaCalendarAlt,
  FaShoppingBag,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovMaterialUsage = () => {
  const dispatch = useDispatch();
  const { materialUsage, schools, grants, teachers, loading } = useSelector((state) => state.govFunds);

  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterGrant, setFilterGrant] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    dispatch(fetchGovSchools());
    dispatch(fetchGovGrants());
    dispatch(fetchGovTeachers());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchGovMaterialUsage({
        schoolId: filterSchool,
        grantId: filterGrant,
        teacherId: filterTeacher,
        startDate,
        endDate,
        search,
      })
    );
  }, [dispatch, filterSchool, filterGrant, filterTeacher, startDate, endDate, search]);

  const totalUsageAmount = materialUsage.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  const handleExportExcel = () => {
    if (materialUsage.length === 0) return alert("No material usage data to export");

    const exportData = materialUsage.map((m) => ({
      "Date": new Date(m.date).toLocaleDateString(),
      "Invoice Number": m.invoiceNumber,
      "Item Name": m.itemName,
      "Quantity": m.qty,
      "Unit Price (₹)": m.price,
      "GST Rate (%)": m.gstRate,
      "Total Amount (₹)": m.totalAmount,
      "School Name": m.schoolName,
      "Grant Name": m.grantName,
      "Teacher Name": m.teacherName,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gov Material Usage");
    XLSX.writeFile(workbook, `Government_School_Material_Usage_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Loading Itemized Material Usage..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaBoxes /> Government School Material Usage
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Itemized breakdown of educational materials, lab equipment, and stationeries purchased through school grants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
          >
            <FaFileExcel /> Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow"
          >
            <FaPrint /> Print Breakdown
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Items Purchased</span>
          <span className="text-lg font-bold text-slate-100">{materialUsage.length} Line Items</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Material Value</span>
          <span className="text-xl font-black text-amber-400">
            ₹{totalUsageAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800 print:hidden">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <FaSearch className="absolute left-3 top-3 text-slate-500 text-xs" />
          <input
            type="text"
            placeholder="Search material name, invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* School */}
        <div>
          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s._id} value={s._id}>
                {s.schoolName}
              </option>
            ))}
          </select>
        </div>

        {/* Grant */}
        <div>
          <select
            value={filterGrant}
            onChange={(e) => setFilterGrant(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Grants</option>
            {grants.map((g) => (
              <option key={g._id} value={g._id}>
                {g.grantName}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* End Date */}
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Material Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg print:bg-white print:text-black">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black">
              <tr>
                <th className="p-3">Material / Product Name</th>
                <th className="p-3">Invoice # & Date</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Total (₹)</th>
                <th className="p-3">School Name</th>
                <th className="p-3">Grant Name</th>
                <th className="p-3">Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
              {materialUsage.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">
                    No material usage items found matching criteria.
                  </td>
                </tr>
              ) : (
                materialUsage.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-100 print:text-black">{m.itemName}</td>
                    <td className="p-3 font-mono text-amber-400">
                      <div>{m.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-400">{new Date(m.date).toLocaleDateString()}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-200">{m.qty}</td>
                    <td className="p-3 text-right">₹{m.price?.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-amber-400">
                      ₹{m.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 font-semibold">{m.schoolName}</td>
                    <td className="p-3">{m.grantName}</td>
                    <td className="p-3">{m.teacherName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GovMaterialUsage;
