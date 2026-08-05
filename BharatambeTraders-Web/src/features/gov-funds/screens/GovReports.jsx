import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import {
  FaChartBar,
  FaFileExcel,
  FaPrint,
  FaFilePdf,
  FaSchool,
  FaUserGraduate,
  FaLandmark,
  FaMoneyBillWave,
  FaCheckCircle,
  FaWallet,
  FaCalendarAlt,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovReports = () => {
  const [activeTab, setActiveTab] = useState("grant"); // "school" | "teacher" | "grant" | "cash" | "settlement" | "balance"
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    grants: [],
    schools: [],
    teachers: [],
    cashPayments: [],
    invoices: [],
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/gov-funds/reports");
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  const filteredGrants = data.grants.filter((g) => {
    if (academicYear && g.academicYear !== academicYear) return false;
    return true;
  });

  const handleExportExcel = () => {
    let exportRows = [];
    let sheetName = "Report";

    if (activeTab === "grant") {
      sheetName = "Grant-wise Report";
      exportRows = filteredGrants.map((g) => ({
        "School Name": g.schoolId?.schoolName || "N/A",
        "Grant Name": g.grantName,
        "Academic Year": g.academicYear,
        "Category": g.grantCategory,
        "Sanctioned Amount (₹)": g.totalGrantAmount || g.grantAmount,
        "Materials Purchased (₹)": g.materialsPurchased || 0,
        "Cash Given (₹)": g.cashGiven || 0,
        "Remaining Balance (₹)": g.remainingBalance || 0,
        "Status": g.status,
      }));
    } else if (activeTab === "school") {
      sheetName = "School-wise Report";
      exportRows = data.schools.map((s) => {
        const schoolGrants = data.grants.filter(
          (g) => g.schoolId?._id === s._id || g.schoolId === s._id
        );
        let totalSanctioned = 0;
        let totalSpent = 0;
        let balance = 0;
        schoolGrants.forEach((g) => {
          totalSanctioned += g.totalGrantAmount || g.grantAmount || 0;
          totalSpent += (g.materialsPurchased || 0) + (g.cashGiven || 0);
          balance += g.remainingBalance || 0;
        });

        return {
          "School Name": s.schoolName,
          "UDISE Code": s.udiseCode || "N/A",
          "Headmaster Name": s.headmasterName,
          "Mobile Number": s.mobileNumber,
          "Total Grants Count": schoolGrants.length,
          "Total Sanctioned (₹)": totalSanctioned,
          "Total Spent (₹)": totalSpent,
          "Current Remaining Balance (₹)": balance,
        };
      });
    } else if (activeTab === "teacher") {
      sheetName = "Teacher-wise Report";
      exportRows = data.teachers.map((t) => {
        const teacherInvoices = data.invoices.filter(
          (inv) => inv.govTeacherId?._id === t._id || inv.govTeacherId === t._id
        );
        const teacherCash = data.cashPayments.filter(
          (cp) => cp.teacherId?._id === t._id || cp.teacherId === t._id
        );
        let matPurchased = 0;
        teacherInvoices.forEach((inv) => (matPurchased += inv.total || 0));
        let cashTaken = 0;
        teacherCash.forEach((cp) => (cashTaken += cp.amount || 0));

        return {
          "Teacher Name": t.teacherName,
          "Mobile Number": t.mobileNumber,
          "Designation": t.designation,
          "School Name": t.schoolId?.schoolName || "N/A",
          "Material Purchased (₹)": matPurchased,
          "Cash Taken (₹)": cashTaken,
          "Total Spent (₹)": matPurchased + cashTaken,
        };
      });
    } else if (activeTab === "cash") {
      sheetName = "Cash Payment Report";
      exportRows = data.cashPayments.map((cp) => ({
        "Date": new Date(cp.date).toLocaleDateString(),
        "Teacher Name": cp.teacherId?.teacherName || "N/A",
        "School Name": cp.schoolId?.schoolName || "N/A",
        "Grant Name": cp.grantId?.grantName || "N/A",
        "Purpose": cp.purpose,
        "Remarks": cp.remarks || "",
        "Amount (₹)": cp.amount,
      }));
    } else if (activeTab === "settlement") {
      sheetName = "Settlement Report";
      exportRows = data.grants
        .filter((g) => g.status === "Closed")
        .map((g) => ({
          "School Name": g.schoolId?.schoolName || "N/A",
          "Grant Name": g.grantName,
          "Academic Year": g.academicYear,
          "Sanctioned Amount (₹)": g.grantAmount,
          "Final Remaining Balance (₹)": 0,
          "Settlement Closing Date": g.closedAt ? new Date(g.closedAt).toLocaleDateString() : "Settled",
          "Status": "Closed",
        }));
    } else if (activeTab === "balance") {
      sheetName = "Remaining Balance Report";
      exportRows = data.grants.map((g) => ({
        "School Name": g.schoolId?.schoolName || "N/A",
        "Grant Name": g.grantName,
        "Sanctioned Amount (₹)": g.grantAmount,
        "Total Spent (₹)": (g.materialsPurchased || 0) + (g.cashGiven || 0),
        "Remaining Balance (₹)": g.remainingBalance || 0,
        "Settlement Status": g.status,
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `Gov_School_${sheetName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Compiling Government Fund Reports..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaChartBar /> Government Fund Reports Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and export School-wise, Teacher-wise, Grant-wise, Cash Payment, and Settlement Balance Reports.
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
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow"
          >
            <FaPrint /> Print Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 print:hidden">
        <button
          onClick={() => setActiveTab("grant")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "grant" ? "bg-amber-500 text-slate-950 shadow" : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <FaLandmark /> Grant-wise Report
        </button>
        <button
          onClick={() => setActiveTab("school")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "school" ? "bg-amber-500 text-slate-950 shadow" : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <FaSchool /> School-wise Report
        </button>
        <button
          onClick={() => setActiveTab("teacher")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "teacher" ? "bg-amber-500 text-slate-950 shadow" : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <FaUserGraduate /> Teacher-wise Report
        </button>
        <button
          onClick={() => setActiveTab("cash")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "cash" ? "bg-amber-500 text-slate-950 shadow" : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <FaMoneyBillWave /> Cash Payment Report
        </button>
        <button
          onClick={() => setActiveTab("settlement")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "settlement" ? "bg-amber-500 text-slate-950 shadow" : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <FaCheckCircle /> Settlement Report
        </button>
        <button
          onClick={() => setActiveTab("balance")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "balance" ? "bg-amber-500 text-slate-950 shadow" : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <FaWallet /> Remaining Balance Report
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg print:bg-white print:text-black">
        {/* Printable Title Header */}
        <div className="p-4 border-b border-slate-800 hidden print:block text-center">
          <h2 className="text-lg font-bold">Bharatambe Traders - Government School Funds Report</h2>
          <p className="text-xs text-gray-600">
            Report Type: {activeTab.toUpperCase()} | Generated on {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Tab 1: Grant-wise */}
        {activeTab === "grant" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Grant Name & AY</th>
                  <th className="p-3 text-right">Sanctioned</th>
                  <th className="p-3 text-right">Purchased</th>
                  <th className="p-3 text-right">Cash Given</th>
                  <th className="p-3 text-right">Remaining Balance</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
                {filteredGrants.map((g) => (
                  <tr key={g._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold">{g.schoolId?.schoolName || "N/A"}</td>
                    <td className="p-3">
                      <div className="font-bold text-amber-400">{g.grantName}</div>
                      <div className="text-[10px] text-slate-400">AY {g.academicYear}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-100">
                      ₹{g.grantAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-blue-400 font-medium">
                      ₹{(g.materialsPurchased || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-purple-400 font-medium">
                      ₹{(g.cashGiven || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-400">
                      ₹{(g.remainingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center font-bold text-[10px]">{g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: School-wise */}
        {activeTab === "school" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Headmaster</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3 text-center">Grants Count</th>
                  <th className="p-3 text-right">Total Sanctioned</th>
                  <th className="p-3 text-right">Total Spent</th>
                  <th className="p-3 text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
                {data.schools.map((s) => {
                  const schoolGrants = data.grants.filter(
                    (g) => g.schoolId?._id === s._id || g.schoolId === s._id
                  );
                  let totalSanctioned = 0;
                  let totalSpent = 0;
                  let balance = 0;
                  schoolGrants.forEach((g) => {
                    totalSanctioned += g.totalGrantAmount || g.grantAmount || 0;
                    totalSpent += (g.materialsPurchased || 0) + (g.cashGiven || 0);
                    balance += g.remainingBalance || 0;
                  });

                  return (
                    <tr key={s._id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-100">{s.schoolName}</td>
                      <td className="p-3">{s.headmasterName}</td>
                      <td className="p-3 font-mono">{s.mobileNumber}</td>
                      <td className="p-3 text-center font-bold">{schoolGrants.length}</td>
                      <td className="p-3 text-right font-bold text-slate-100">
                        ₹{totalSanctioned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-blue-400 font-semibold">
                        ₹{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-400">
                        ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Teacher-wise */}
        {activeTab === "teacher" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3">Teacher Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">School Name</th>
                  <th className="p-3 text-right">Material Purchased</th>
                  <th className="p-3 text-right">Cash Taken</th>
                  <th className="p-3 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
                {data.teachers.map((t) => {
                  const teacherInvoices = data.invoices.filter(
                    (inv) => inv.govTeacherId?._id === t._id || inv.govTeacherId === t._id
                  );
                  const teacherCash = data.cashPayments.filter(
                    (cp) => cp.teacherId?._id === t._id || cp.teacherId === t._id
                  );
                  let matPurchased = 0;
                  teacherInvoices.forEach((inv) => (matPurchased += inv.total || 0));
                  let cashTaken = 0;
                  teacherCash.forEach((cp) => (cashTaken += cp.amount || 0));

                  return (
                    <tr key={t._id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-100">{t.teacherName}</td>
                      <td className="p-3">{t.designation}</td>
                      <td className="p-3 font-semibold text-amber-400">{t.schoolId?.schoolName || "N/A"}</td>
                      <td className="p-3 text-right font-semibold text-blue-400">
                        ₹{matPurchased.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-semibold text-purple-400">
                        ₹{cashTaken.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-400">
                        ₹{(matPurchased + cashTaken).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Cash Payments */}
        {activeTab === "cash" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Teacher</th>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Grant Name</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3 text-right">Cash Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
                {data.cashPayments.map((cp) => (
                  <tr key={cp._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono">{new Date(cp.date).toLocaleDateString()}</td>
                    <td className="p-3 font-bold text-slate-100">{cp.teacherId?.teacherName || "N/A"}</td>
                    <td className="p-3 font-semibold">{cp.schoolId?.schoolName || "N/A"}</td>
                    <td className="p-3 text-amber-400">{cp.grantId?.grantName || "N/A"}</td>
                    <td className="p-3">{cp.purpose}</td>
                    <td className="p-3 text-right font-black text-purple-400">
                      ₹{cp.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Settlement Report */}
        {activeTab === "settlement" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Grant Name</th>
                  <th className="p-3">AY</th>
                  <th className="p-3 text-right">Sanctioned Amount</th>
                  <th className="p-3 text-right">Remaining Balance</th>
                  <th className="p-3 text-center">Settlement Closing Date</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
                {data.grants
                  .filter((g) => g.status === "Closed")
                  .map((g) => (
                    <tr key={g._id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold">{g.schoolId?.schoolName || "N/A"}</td>
                      <td className="p-3 font-bold text-amber-400">{g.grantName}</td>
                      <td className="p-3">{g.academicYear}</td>
                      <td className="p-3 text-right font-bold">₹{g.grantAmount?.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-emerald-400">₹0.00</td>
                      <td className="p-3 text-center font-mono">
                        {g.closedAt ? new Date(g.closedAt).toLocaleDateString() : "Settled"}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-400 text-[10px]">Closed</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: Remaining Balance Report */}
        {activeTab === "balance" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Grant Name</th>
                  <th className="p-3 text-right">Sanctioned Amount</th>
                  <th className="p-3 text-right">Total Spent</th>
                  <th className="p-3 text-right">Remaining Unspent Balance</th>
                  <th className="p-3 text-center">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 print:divide-gray-300 print:text-black">
                {data.grants.map((g) => (
                  <tr key={g._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold">{g.schoolId?.schoolName || "N/A"}</td>
                    <td className="p-3 font-bold text-amber-400">{g.grantName}</td>
                    <td className="p-3 text-right font-bold">₹{g.grantAmount?.toLocaleString()}</td>
                    <td className="p-3 text-right text-blue-400 font-semibold">
                      ₹{((g.materialsPurchased || 0) + (g.cashGiven || 0)).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-400">
                      ₹{(g.remainingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center font-bold text-[10px]">{g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GovReports;
