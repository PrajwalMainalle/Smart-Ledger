import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGovTransactions, fetchGovSchools, fetchGovGrants, fetchGovTeachers } from "../govFundSlice";
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaFileExcel,
  FaPrint,
  FaLandmark,
  FaCalendarAlt,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovTransactions = () => {
  const dispatch = useDispatch();
  const { transactions, schools, grants, teachers, loading } = useSelector((state) => state.govFunds);

  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterGrant, setFilterGrant] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterType, setFilterType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    dispatch(fetchGovSchools());
    dispatch(fetchGovGrants());
    dispatch(fetchGovTeachers());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchGovTransactions({
        schoolId: filterSchool,
        grantId: filterGrant,
        teacherId: filterTeacher,
        type: filterType,
        startDate,
        endDate,
        search,
      })
    );
  }, [dispatch, filterSchool, filterGrant, filterTeacher, filterType, startDate, endDate, search]);

  const handleExportExcel = () => {
    if (transactions.length === 0) return alert("No transactions to export");

    const exportData = transactions.map((tx) => ({
      "Date": new Date(tx.date).toLocaleDateString(),
      "Transaction Type": tx.type,
      "Invoice / Ref": tx.invoiceNumber || tx.cashPaymentId || "N/A",
      "School": tx.schoolId?.schoolName || "N/A",
      "Grant": tx.grantId?.grantName || "N/A",
      "Teacher": tx.teacherId?.teacherName || "N/A",
      "Remarks / Purpose": tx.remarks || "",
      "Amount (₹)": tx.amount,
      "Running Balance (₹)": tx.runningBalance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gov Transactions Ledger");
    XLSX.writeFile(workbook, `Government_Fund_Transactions_Ledger_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Fetching Bank Statement Ledger..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaHistory /> Government Fund Transaction Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete bank statement format ledger tracking all grant receipts, material invoices, and cash payments.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
          >
            <FaFileExcel /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow"
          >
            <FaPrint /> Print Statement
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800 print:hidden">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <FaSearch className="absolute left-3 top-3 text-slate-500 text-xs" />
          <input
            type="text"
            placeholder="Search invoice #, remarks..."
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

        {/* Transaction Type */}
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Types</option>
            <option value="Grant Received">Grant Received</option>
            <option value="Material Purchase">Material Purchase</option>
            <option value="Cash Given">Cash Given</option>
            <option value="Adjustment">Adjustment</option>
            <option value="Refund">Refund</option>
            <option value="Closing Adjustment">Closing Adjustment</option>
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

      {/* Statement Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg print:bg-white print:text-black print:border-none">
        <div className="p-4 border-b border-slate-800 hidden print:block text-center">
          <h2 className="text-lg font-bold">Government School Funds - Bank Statement Ledger</h2>
          <p className="text-xs text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-gray-700">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Transaction Type</th>
                <th className="p-3">Reference / Invoice #</th>
                <th className="p-3">School & Grant</th>
                <th className="p-3">Teacher</th>
                <th className="p-3">Remarks</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-right">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500 print:text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                    <td className="p-3 whitespace-nowrap font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === "Grant Received"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : tx.type === "Material Purchase"
                            ? "bg-blue-500/20 text-blue-400"
                            : tx.type === "Cash Given"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-amber-400 font-bold">{tx.invoiceNumber || "—"}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-100 print:text-black">{tx.schoolId?.schoolName || "N/A"}</div>
                      <div className="text-[10px] text-slate-400 print:text-gray-600">{tx.grantId?.grantName || "N/A"}</div>
                    </td>
                    <td className="p-3">{tx.teacherId?.teacherName || "—"}</td>
                    <td className="p-3 max-w-[200px] truncate text-slate-400 print:text-gray-700" title={tx.remarks}>
                      {tx.remarks || "—"}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        tx.type === "Grant Received" || tx.type === "Refund" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {tx.type === "Grant Received" || tx.type === "Refund" ? "+" : "-"}₹
                      {tx.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-black text-slate-100 print:text-black">
                      ₹{tx.runningBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
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

export default GovTransactions;
