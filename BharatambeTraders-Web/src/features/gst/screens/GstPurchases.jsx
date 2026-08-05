import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaFileCsv, FaFileExcel, FaPrint, FaSearch, FaSpinner, FaCalendarAlt, FaChevronDown, FaUndo } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";
import { exportToExcel } from "../../../utils/excelExporter";
import { MultiColorCompanyTitle, MultiColorReportTitle, triggerSafePrint } from "../../../components/MultiColorHeader";

function GstPurchases() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [printMode, setPrintMode] = useState("all");
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);

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

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintMode("all");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    setPeriod("custom");
    fetchPurchasesReport();
  };

  const handleResetDates = () => {
    setStartDate("");
    setEndDate("");
    setPeriod("monthly");
  };

  const getDateRangeLabel = () => {
    if (period === "custom" && (startDate || endDate)) {
      return `${startDate || "Beginning"} to ${endDate || "Today"}`;
    }
    return period.toUpperCase();
  };

  const handleExportExcel = () => {
    if (!data) return alert("No data to export");
    const { ratesBreakdown, nonGstRatesBreakdown } = data;
    const dateRangeStr = getDateRangeLabel();
    const todayStr = new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN");

    const sheetData = [
      ["BHARATAMBE TRADERS - CA GST INWARD PURCHASES & ITC REPORT"],
      ["Filter Period / Range:", dateRangeStr],
      ["Report Generated On:", todayStr],
      [],
      ["1. GST INWARD PURCHASES BY TAX SLAB (WITH GSTIN)"],
      ["GST Rate Bracket", "Taxable Base Amount (INR)", "CGST Paid (INR)", "SGST Paid (INR)", "IGST Paid (INR)", "Total ITC Claimable (INR)", "Total Gross Purchase Value (INR)"]
    ];

    let totTaxable = 0;
    let totCgst = 0;
    let totSgst = 0;
    let totIgst = 0;
    let totGstTax = 0;
    let totGross = 0;

    (ratesBreakdown || []).forEach(row => {
      totTaxable += row.taxableValue || 0;
      totCgst += row.cgst || 0;
      totSgst += row.sgst || 0;
      totIgst += row.igst || 0;
      totGstTax += row.totalTax || 0;
      totGross += row.totalAmount || 0;

      sheetData.push([
        row.rate,
        row.taxableValue || 0,
        row.cgst || 0,
        row.sgst || 0,
        row.igst || 0,
        row.totalTax || 0,
        row.totalAmount || 0
      ]);
    });

    sheetData.push(["SUB-TOTAL (GST PURCHASES)", totTaxable, totCgst, totSgst, totIgst, totGstTax, totGross]);
    sheetData.push([]);

    sheetData.push(["2. NON-GST INWARD PURCHASES (WITHOUT GSTIN)"]);
    sheetData.push(["Category", "Taxable Base Amount (INR)", "CGST Paid (INR)", "SGST Paid (INR)", "IGST Paid (INR)", "Total Tax Paid (INR)", "Total Gross Purchase Value (INR)"]);

    let totNonGstTaxable = 0;
    (nonGstRatesBreakdown || []).forEach(row => {
      totNonGstTaxable += row.taxableValue || 0;
    });

    sheetData.push(["Non-GST Purchases", totNonGstTaxable, 0, 0, 0, 0, totNonGstTaxable]);
    sheetData.push([]);

    sheetData.push(["3. MASTER GRAND TOTAL PURCHASES"]);
    sheetData.push(["Category", "Taxable Base Amount (INR)", "CGST Paid (INR)", "SGST Paid (INR)", "IGST Paid (INR)", "Total Tax Paid (INR)", "Grand Total Purchase Value (INR)"]);

    sheetData.push(["MASTER GRAND TOTAL", totTaxable + totNonGstTaxable, totCgst, totSgst, totIgst, totGstTax, totGross + totNonGstTaxable]);

    exportToExcel({
      fileName: `GST_Purchases_Report_${period}_${new Date().toISOString().split("T")[0]}`,
      sheets: [{ sheetName: "Purchases ITC Summary", data: sheetData }]
    });
  };

  const triggerPrint = (mode = "all") => {
    setPrintMode(mode);
    setShowPrintDropdown(false);
    triggerSafePrint();
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

  const getReportTitle = () => {
    if (printMode === "gst") return "GST Purchases Report";
    if (printMode === "nongst") return "Non-GST Purchases Report";
    return "Purchases GST Tax Report";
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900 print:bg-white print:text-black print:border-none print:p-0 print:m-0">
      
      {/* Printable Formal Document Header (Visible ONLY when printing) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <MultiColorCompanyTitle className="text-2xl font-black tracking-tight" />
            <MultiColorReportTitle title={getReportTitle()} className="text-lg font-bold mt-1" />
            <p className="text-xs text-slate-700 mt-0.5">Filter Range: <span className="font-bold">{getDateRangeLabel()}</span></p>
          </div>
          <div className="text-right text-xs text-slate-700 font-mono">
            <p>Generated on: {new Date().toLocaleDateString("en-IN")} {new Date().toLocaleTimeString("en-IN")}</p>
            <p className="mt-1 font-sans font-bold text-slate-900">CA Audit Copy</p>
          </div>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Purchases GST Tax Report</h2>
          <p className="text-slate-400 text-sm mt-1">
            Audit inward input credits (ITC) and purchase tax brackets. Active Range: <span className="text-orange-400 font-semibold">{getDateRangeLabel()}</span>
          </p>
        </div>

        {/* Print Dropdown & Export CSV Actions */}
        <div className="flex flex-wrap gap-3">
          {/* Print Dropdown Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowPrintDropdown(!showPrintDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow transition duration-150 cursor-pointer"
            >
              <FaPrint className="text-orange-400" />
              <span>Print Report</span>
              <FaChevronDown size={10} className="text-slate-400" />
            </button>

            {showPrintDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                <button
                  onClick={() => triggerPrint("all")}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center justify-between cursor-pointer"
                >
                  <span>🖨️ Print Full Report</span>
                  <span className="text-[10px] text-slate-500 font-mono">Both</span>
                </button>
                <button
                  onClick={() => triggerPrint("gst")}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition flex items-center justify-between border-t border-slate-850 cursor-pointer"
                >
                  <span>🏷️ Print GST Purchases Only</span>
                  <span className="text-[10px] text-slate-500 font-mono">GST</span>
                </button>
                <button
                  onClick={() => triggerPrint("nongst")}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 transition flex items-center justify-between border-t border-slate-850 cursor-pointer"
                >
                  <span>📦 Print Non-GST Purchases Only</span>
                  <span className="text-[10px] text-slate-500 font-mono">Non-GST</span>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition duration-150 cursor-pointer"
          >
            <FaFileExcel className="text-sm" /> Export Excel Report
          </button>
        </div>
      </div>

      {/* Date Filter & Range Selector Toolbar */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl mb-6 print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Preset Period Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-xs font-bold mr-1 flex items-center gap-1">
            <FaCalendarAlt className="text-orange-500" /> Filter:
          </span>
          {["daily", "weekly", "monthly", "yearly", "custom"].map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border capitalize transition-all duration-150 cursor-pointer
                ${period === p 
                  ? "bg-orange-500 text-white border-transparent shadow-md shadow-orange-500/20" 
                  : "bg-slate-955 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }
              `}
            >
              {p === "custom" ? "Custom Range" : p}
            </button>
          ))}
        </div>

        {/* Date Inputs (From Date to To Date) */}
        <form onSubmit={handleCustomSearch} className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-[11px] font-bold">From:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod("custom");
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            />
          </div>
          <span className="text-slate-500 text-xs font-bold">to</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-[11px] font-bold">To:</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod("custom");
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            />
          </div>
          
          <button 
            type="submit"
            className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <FaSearch size={10} /> Apply
          </button>

          {(startDate || endDate || period === "custom") && (
            <button 
              type="button"
              onClick={handleResetDates}
              title="Reset date filters"
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition cursor-pointer"
            >
              <FaUndo size={10} />
            </button>
          )}
        </form>
      </div>

      {/* Summary KPI Panel */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ${printMode !== "all" ? "print:hidden" : ""}`}>
        <div className={`p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1 ${printMode === "nongst" ? "print:hidden" : ""}`}>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">GST Purchases (With GSTIN)</span>
          <p className="text-lg font-black text-emerald-400 font-mono print:text-black">₹{(summary?.gstPurchases || 0).toFixed(2)}</p>
        </div>
        <div className={`p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1 ${printMode === "gst" ? "print:hidden" : ""}`}>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Non-GST Purchases</span>
          <p className="text-lg font-black text-cyan-400 font-mono print:text-black">₹{(summary?.nonGstPurchases || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Purchases</span>
          <p className="text-lg font-black text-teal-400 font-mono print:text-black">₹{(summary?.totalPurchases || 0).toFixed(2)}</p>
        </div>
        <div className={`p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1 ${printMode === "nongst" ? "print:hidden" : ""}`}>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total ITC Paid</span>
          <p className="text-lg font-black text-emerald-400 font-mono print:text-black">₹{(summary?.totalTax || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Breakdown Details Table: GST Purchases */}
      <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl ${printMode === "nongst" ? "print:hidden" : ""}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 print:text-slate-900">
            GST Purchases Inward ITC Tally (With GST Number)
          </h3>
          <button
            onClick={() => triggerPrint("gst")}
            className="print:hidden text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FaPrint size={10} /> Print GST Purchases
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm print:text-black">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[10px] font-bold print:border-slate-300 print:text-slate-700">
                <th className="py-3 px-4">GST Bracket</th>
                <th className="py-3 px-4 text-right">Taxable Base Amount</th>
                <th className="py-3 px-4 text-right">CGST Claimable</th>
                <th className="py-3 px-4 text-right">SGST Claimable</th>
                <th className="py-3 px-4 text-right">IGST Claimable</th>
                <th className="py-3 px-4 text-right">Total ITC Claimable</th>
                <th className="py-3 px-4 text-right">Total Gross Purchases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-350 font-mono print:divide-slate-200 print:text-slate-900">
              {ratesBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 transition">
                  <td className="py-3 px-4 font-sans font-bold text-slate-200 print:text-black">{row.rate}</td>
                  <td className="py-3 px-4 text-right">₹{row.taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-400 print:text-slate-700">₹{row.cgst.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-400 print:text-slate-700">₹{row.sgst.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-400 print:text-slate-700">₹{row.igst.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-bold print:text-black">₹{row.totalTax.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-teal-400 font-black print:text-black">₹{row.totalAmount.toFixed(2)}</td>
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

      {/* Breakdown Details Table: Non-GST Purchases */}
      <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl mt-6 ${printMode === "gst" ? "print:hidden" : ""}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 print:text-slate-900">
            Non-GST Purchases Inward Tally (Without GST Number)
          </h3>
          <button
            onClick={() => triggerPrint("nongst")}
            className="print:hidden text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FaPrint size={10} /> Print Non-GST Purchases
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm print:text-black">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[10px] font-bold print:border-slate-300 print:text-slate-700">
                <th className="py-3 px-4">GST Bracket</th>
                <th className="py-3 px-4 text-right">Base Purchase Amount</th>
                <th className="py-3 px-4 text-right">CGST Claimable</th>
                <th className="py-3 px-4 text-right">SGST Claimable</th>
                <th className="py-3 px-4 text-right">IGST Claimable</th>
                <th className="py-3 px-4 text-right">Total ITC Claimable</th>
                <th className="py-3 px-4 text-right">Total Purchase Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-350 font-mono print:divide-slate-200 print:text-slate-900">
              {nonGstRatesBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 transition">
                  <td className="py-3 px-4 font-sans font-bold text-slate-200 print:text-black">{row.rate}</td>
                  <td className="py-3 px-4 text-right">₹{row.taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-bold">₹0.00</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-black print:text-black">₹{row.totalAmount.toFixed(2)}</td>
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
