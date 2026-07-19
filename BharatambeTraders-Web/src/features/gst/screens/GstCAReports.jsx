import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaFileCsv, FaPrint, FaSpinner } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function GstCAReports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [type, setType] = useState("monthly");
  const [error, setError] = useState("");

  const fetchCaSummary = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/gst/reports/ca-summary?type=${type}`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch CA reconciliation reports.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaSummary();
  }, [type]);

  const handleExportCSV = () => {
    if (data.length === 0) return alert("No data to export");
    const headers = ["Period", "Sales Taxable Value", "Sales Tax Collected", "Sales Total", "Purchases Taxable Value", "Purchases Tax Paid", "Purchases Total", "Net Tax Liability"];
    const rows = [headers.join(",")];
    
    data.forEach(row => {
      const netLiability = row.salesTotalTax - row.purchasesTotalTax;
      rows.push(`"${row.period}",${row.salesTaxable.toFixed(2)},${row.salesTotalTax.toFixed(2)},${row.salesTotal.toFixed(2)},${row.purchasesTaxable.toFixed(2)},${row.purchasesTotalTax.toFixed(2)},${row.purchasesTotal.toFixed(2)},${netLiability.toFixed(2)}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gst_ca_reconciliation_${type}_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && data.length === 0) {
    return <LoadingOverlay message="Compiling CA reconciliation summaries..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rose-400 bg-slate-950 p-6">
        <div className="border border-rose-500/20 bg-rose-500/10 p-6 rounded-2xl max-w-md text-center space-y-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900 print:bg-white print:text-black print:border-none print:p-0 print:m-0">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">CA Reconciliation Console</h2>
          <p className="text-slate-400 text-sm mt-1">
            Reconcile outward GST collections with inward Input Tax Credits (ITC) for GST filing.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow transition duration-150"
          >
            Print Report
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition duration-150"
          >
            <FaFileCsv /> Export CSV for CA
          </button>
        </div>
      </div>

      {/* Grouping Filters */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl mb-6 print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {["monthly", "yearly"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border capitalize transition-all duration-150
                ${type === t 
                  ? "bg-orange-500 text-white border-transparent" 
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                }
              `}
            >
              {t === "monthly" ? "Month-wise Tally" : "Year-wise Tally"}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Reconciliation Sheet Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">GSTR Audit Reconciliation Summary</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Filing Period</th>
                <th className="py-3 px-4 text-right">Sales Taxable Base</th>
                <th className="py-3 px-4 text-right">Sales GST collected</th>
                <th className="py-3 px-4 text-right">Purchases Taxable Base</th>
                <th className="py-3 px-4 text-right">Purchases GST paid (ITC)</th>
                <th className="py-3 px-4 text-right">Net Tax Liability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-350 font-mono">
              {data.map((row, idx) => {
                const liability = row.salesTotalTax - row.purchasesTotalTax;
                return (
                  <tr key={idx} className="hover:bg-slate-900/10 transition">
                    <td className="py-3 px-4 font-sans font-bold text-slate-100">{row.period}</td>
                    <td className="py-3 px-4 text-right">₹{row.salesTaxable.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-orange-400">₹{row.salesTotalTax.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">₹{row.purchasesTaxable.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-emerald-450">₹{row.purchasesTotalTax.toFixed(2)}</td>
                    <td className={`py-3 px-4 text-right font-black
                      ${liability >= 0 ? "text-rose-450" : "text-emerald-450"}
                    `}>
                      ₹{liability.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-sans">No reconciliation logs recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default GstCAReports;
