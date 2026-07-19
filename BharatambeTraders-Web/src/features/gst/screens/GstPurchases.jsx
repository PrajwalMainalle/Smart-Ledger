import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaFileCsv, FaPrint, FaSearch, FaSpinner } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function GstPurchases() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const fetchPurchasesReport = async () => {
    try {
      setLoading(true);
      let url = `/gst/reports/purchases?period=${period}`;
      if (period === "custom") {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      const res = await axiosInstance.get(url);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch GST purchases summary.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchasesReport();
  }, [period]);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    fetchPurchasesReport();
  };

  const handleExportCSV = () => {
    if (!data) return alert("No data to export");
    const rows = [];
    
    // Section 1: GST Purchases
    rows.push("GST PURCHASES REPORT (WITH GSTIN)");
    rows.push("GST Slab,Taxable Value,CGST Amount,SGST Amount,IGST Amount,Total ITC Claimable,Total Gross Value");
    (ratesBreakdown || []).forEach(row => {
      rows.push(`"${row.rate}",${row.taxableValue.toFixed(2)},${row.cgst.toFixed(2)},${row.sgst.toFixed(2)},${row.igst.toFixed(2)},${row.totalTax.toFixed(2)},${row.totalAmount.toFixed(2)}`);
    });
    
    rows.push(""); // spacer
    
    // Section 2: Non-GST Purchases
    rows.push("NON-GST PURCHASES REPORT (WITHOUT GSTIN)");
    rows.push("GST Slab,Taxable Value,CGST Amount,SGST Amount,IGST Amount,Total ITC Claimable,Total Gross Value");
    (nonGstRatesBreakdown || []).forEach(row => {
      rows.push(`"${row.rate}",${row.taxableValue.toFixed(2)},0.00,0.00,0.00,0.00,${row.taxableValue.toFixed(2)}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gst_purchases_report_${period}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return <LoadingOverlay message="Compiling Purchases GST report..." />;
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

  const { summary, ratesBreakdown, nonGstRatesBreakdown } = data || { summary: {}, ratesBreakdown: [], nonGstRatesBreakdown: [] };

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900 print:bg-white print:text-black print:border-none print:p-0 print:m-0">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Purchases GST Tax Report</h2>
          <p className="text-slate-400 text-sm mt-1">Audit inward input credits (ITC) and purchase tax brackets.</p>
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
            <FaFileCsv /> Export CSV
          </button>
        </div>
      </div>

      {/* Date Filter & Range Selector */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl mb-6 print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {["daily", "weekly", "monthly", "yearly", "custom"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border capitalize transition-all duration-150
                ${period === p 
                  ? "bg-orange-500 text-white border-transparent" 
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                }
              `}
            >
              {p}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <form onSubmit={handleCustomSearch} className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <span className="text-slate-500 text-xs">to</span>
            <div className="space-y-1">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <button 
              type="submit"
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition shadow-md shadow-orange-500/10 flex items-center gap-1.5"
            >
              <FaSearch size={10} /> Filter
            </button>
          </form>
        )}
      </div>

      {/* Summary KPI Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">GST Purchases</span>
          <p className="text-lg font-black text-white font-mono">₹{(summary?.gstPurchases || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Non-GST Purchases</span>
          <p className="text-lg font-black text-white font-mono">₹{(summary?.nonGstPurchases || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Purchases</span>
          <p className="text-lg font-black text-emerald-450 font-mono">₹{(summary?.totalPurchases || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total ITC Paid</span>
          <p className="text-lg font-black text-emerald-450 font-mono">₹{(summary?.totalTax || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Breakdown Details Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">GST Purchases Inward ITC Tally (With GST Number)</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">GST Bracket</th>
                <th className="py-3 px-4 text-right">Taxable Base Amount</th>
                <th className="py-3 px-4 text-right">CGST Claimable</th>
                <th className="py-3 px-4 text-right">SGST Claimable</th>
                <th className="py-3 px-4 text-right">IGST Claimable</th>
                <th className="py-3 px-4 text-right">Total ITC Claimable</th>
                <th className="py-3 px-4 text-right">Total Gross Purchases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-350 font-mono">
              {ratesBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 transition">
                  <td className="py-3 px-4 font-sans font-bold text-slate-100">{row.rate}</td>
                  <td className="py-3 px-4 text-right">₹{row.taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-400">₹{row.cgst.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-400">₹{row.sgst.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-400">₹{row.igst.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-emerald-450 font-bold">₹{row.totalTax.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-white font-black">₹{row.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {ratesBreakdown.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-sans">No purchase GST transactions logged for this range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Non-GST Breakdown Details Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Non-GST Purchases Inward Tally (Without GST Number)</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">GST Bracket</th>
                <th className="py-3 px-4 text-right">Base Purchase Amount</th>
                <th className="py-3 px-4 text-right">CGST Claimable</th>
                <th className="py-3 px-4 text-right">SGST Claimable</th>
                <th className="py-3 px-4 text-right">IGST Claimable</th>
                <th className="py-3 px-4 text-right">Total ITC Claimable</th>
                <th className="py-3 px-4 text-right">Total Purchase Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-350 font-mono">
              {nonGstRatesBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 transition">
                  <td className="py-3 px-4 font-sans font-bold text-slate-100">{row.rate}</td>
                  <td className="py-3 px-4 text-right">₹{row.taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-bold">₹0.00</td>
                  <td className="py-3 px-4 text-right text-white font-black">₹{row.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {nonGstRatesBreakdown.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-sans">No Non-GST purchases logged for this range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default GstPurchases;
