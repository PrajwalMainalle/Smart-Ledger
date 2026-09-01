import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaFileCsv, FaFileExcel, FaPrint, FaSearch, FaSpinner, FaCalendarAlt, FaChevronDown, FaUndo } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";
import { exportToExcel } from "../../../utils/excelExporter";
import { MultiColorCompanyTitle, MultiColorReportTitle, triggerSafePrint } from "../../../components/MultiColorHeader";

function GstSales() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [printMode, setPrintMode] = useState("all"); // 'all' | 'gst' | 'nongst'
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);

  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      let url = `/gst/reports/sales?period=${period}`;
      if (period === "custom") {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      const res = await axiosInstance.get(url);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch GST sales summary.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
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
    fetchSalesReport();
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

  const handleExportCAExcel = () => {
    if (!data) return alert("No data to export");
    const { summary, ratesBreakdown, nonGstRatesBreakdown } = data;
    const dateRangeStr = getDateRangeLabel();
    const todayStr = new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN");

    // Sheet 1: Sales Tax Reconciliation
    const salesSheetData = [
      ["BHARATAMBE TRADERS - CA GST OUTWARD SALES TAX AUDIT REPORT"],
      ["Filter Period / Range:", dateRangeStr],
      ["Report Generated On:", todayStr],
      [],
      ["1. GST OUTWARD SALES BY TAX SLAB (TAX INVOICES WITH GST)"],
      ["GST Rate Bracket", "Taxable Base Amount (INR)", "CGST Amount (INR)", "SGST Amount (INR)", "IGST Amount (INR)", "Total Tax Collected (INR)", "Total Billable Gross Revenue (INR)"]
    ];

    let totalGstTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGstTax = 0;
    let totalGstGross = 0;

    (ratesBreakdown || []).forEach(row => {
      totalGstTaxable += row.taxableValue || 0;
      totalCgst += row.cgst || 0;
      totalSgst += row.sgst || 0;
      totalIgst += row.igst || 0;
      totalGstTax += row.totalTax || 0;
      totalGstGross += row.totalAmount || 0;

      salesSheetData.push([
        row.rate,
        row.taxableValue || 0,
        row.cgst || 0,
        row.sgst || 0,
        row.igst || 0,
        row.totalTax || 0,
        row.totalAmount || 0
      ]);
    });

    salesSheetData.push([
      "SUB-TOTAL (GST BILLS)",
      totalGstTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGstTax,
      totalGstGross
    ]);
    salesSheetData.push([]);

    salesSheetData.push(["2. NON-GST OUTWARD RETAIL SALES (WITHOUT GST NUMBER)"]);
    salesSheetData.push(["Category", "Taxable Base Amount (INR)", "CGST Amount (INR)", "SGST Amount (INR)", "IGST Amount (INR)", "Total Tax Collected (INR)", "Total Billable Gross Revenue (INR)"]);

    let totalNonGstTaxable = 0;
    (nonGstRatesBreakdown || []).forEach(row => {
      totalNonGstTaxable += row.taxableValue || 0;
    });

    salesSheetData.push(["Non-GST Retail Bills", totalNonGstTaxable, 0, 0, 0, 0, totalNonGstTaxable]);
    salesSheetData.push([]);

    salesSheetData.push(["3. MASTER GRAND TOTAL (ALL GST SLABS + NON-GST REVENUE COMBINED)"]);
    salesSheetData.push(["Category", "Taxable Base Amount (INR)", "CGST Amount (INR)", "SGST Amount (INR)", "IGST Amount (INR)", "Total Tax Collected (INR)", "Grand Total Revenue (INR)"]);

    const grandTaxable = totalGstTaxable + totalNonGstTaxable;
    const grandCgst = totalCgst;
    const grandSgst = totalSgst;
    const grandIgst = totalIgst;
    const grandTax = totalGstTax;
    const grandGross = totalGstGross + totalNonGstTaxable;

    salesSheetData.push(["MASTER GRAND TOTAL", grandTaxable, grandCgst, grandSgst, grandIgst, grandTax, grandGross]);

    // Sheet 2: Payment Method Revenue Split
    const gstPay = summary?.gstPaymentBreakdown || {};
    const nonGstPay = summary?.nonGstPaymentBreakdown || {};
    const totPay = summary?.totalPaymentBreakdown || {};

    const paymentSheetData = [
      ["BHARATAMBE TRADERS - PAYMENT METHOD REVENUE SPLIT (CASH & BANK AUDIT)"],
      ["Filter Period / Range:", dateRangeStr],
      ["Report Generated On:", todayStr],
      [],
      ["Sales Category", "Cash Revenue (INR)", "UPI / Online Revenue (INR)", "Card Revenue (INR)", "Credit Outstanding (INR)", "Total Revenue (INR)"],
      ["GST Sales Payments", gstPay.Cash || 0, gstPay.UPI || 0, gstPay.Card || 0, gstPay.Credit || 0, summary?.gstSales || 0],
      ["Non-GST Sales Payments", nonGstPay.Cash || 0, nonGstPay.UPI || 0, nonGstPay.Card || 0, nonGstPay.Credit || 0, summary?.nonGstSales || 0],
      ["OVERALL COMBINED", totPay.Cash || 0, totPay.UPI || 0, totPay.Card || 0, totPay.Credit || 0, summary?.totalSales || 0]
    ];

    exportToExcel({
      fileName: `CA_GST_Sales_Report_${period}_${new Date().toISOString().split("T")[0]}`,
      sheets: [
        { sheetName: "GST Sales Reconciliation", data: salesSheetData },
        { sheetName: "Payment Method Split", data: paymentSheetData }
      ]
    });
  };

  const triggerPrint = (mode = "all") => {
    setPrintMode(mode);
    setShowPrintDropdown(false);
    triggerSafePrint();
  };

  if (loading && !data) {
    return <LoadingOverlay message="Compiling Sales GST report..." />;
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
    if (printMode === "gst") return "GST Sales Tax Report";
    if (printMode === "nongst") return "Non-GST Sales Report";
    return "Sales GST Tax Report";
  };

  return (
    <div className="w-full space-y-6 text-slate-100 print:bg-white print:text-black print:border-none print:p-0 print:m-0">

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
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Sales GST Tax Report</h2>
          <p className="text-slate-400 text-sm mt-1">
            Audit outward tax collections and rate-wise sales groupings. Active Range: <span className="text-orange-400 font-semibold">{getDateRangeLabel()}</span>
          </p>
        </div>

        {/* Print Dropdown & Export Actions */}
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
                  <span>🏷️ Print GST Sales Only</span>
                  <span className="text-[10px] text-slate-500 font-mono">GST</span>
                </button>
                <button
                  onClick={() => triggerPrint("nongst")}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 transition flex items-center justify-between border-t border-slate-850 cursor-pointer"
                >
                  <span>📦 Print Non-GST Sales Only</span>
                  <span className="text-[10px] text-slate-500 font-mono">Non-GST</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportCAExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition duration-150 cursor-pointer"
          >
            <FaFileExcel className="text-sm" /> Export CA Excel Report
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
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1 print-card-emerald">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold print:text-emerald-900">GST Sales (With GST Number)</span>
          <p className="text-lg font-black text-emerald-400 font-mono print:text-emerald-700">₹{(summary?.gstSales || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1 print-card-cyan">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold print:text-cyan-900">Non-GST Sales (Retail)</span>
          <p className="text-lg font-black text-cyan-400 font-mono print:text-cyan-700">₹{(summary?.nonGstSales || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1 print-card-amber">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold print:text-amber-900">Total Sales Sum</span>
          <p className="text-lg font-black text-orange-400 font-mono print:text-amber-700">₹{(summary?.totalSales || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-1 print-card-rose">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold print:text-rose-900">Total GST Tax Collected</span>
          <p className="text-lg font-black text-rose-400 font-mono print:text-rose-700">₹{(summary?.totalTax || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Payment Method Breakdown Panel */}
      <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl print:bg-slate-50 print:border-slate-300 ${printMode !== "all" ? "print:hidden" : ""}`}>
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3 print:text-slate-900">
          Payment Method Breakdown ({getDateRangeLabel()})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* GST Sales Breakdown */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 print:bg-emerald-50/60 print:border-emerald-300">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-850 print:border-emerald-300">
              <span className="font-bold text-emerald-400 print:text-emerald-800">GST Sales Payment Split</span>
              <span className="font-mono text-[11px] font-bold text-slate-300 print:text-emerald-950">₹{(summary?.gstSales || 0).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-500 font-bold print:text-slate-700">Cash:</span> <span className="font-mono font-bold text-slate-200 print:text-slate-900">₹{(summary?.gstPaymentBreakdown?.Cash || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">UPI:</span> <span className="font-mono font-bold text-emerald-400 print:text-emerald-700">₹{(summary?.gstPaymentBreakdown?.UPI || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">Card:</span> <span className="font-mono font-bold text-blue-400 print:text-blue-700">₹{(summary?.gstPaymentBreakdown?.Card || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">Credit:</span> <span className="font-mono font-bold text-amber-400 print:text-amber-700">₹{(summary?.gstPaymentBreakdown?.Credit || 0).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Non-GST Sales Breakdown */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 print:bg-cyan-50/60 print:border-cyan-300">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-850 print:border-cyan-300">
              <span className="font-bold text-cyan-400 print:text-cyan-800">Non-GST Sales Payment Split</span>
              <span className="font-mono text-[11px] font-bold text-slate-300 print:text-cyan-950">₹{(summary?.nonGstSales || 0).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-500 font-bold print:text-slate-700">Cash:</span> <span className="font-mono font-bold text-slate-200 print:text-slate-900">₹{(summary?.nonGstPaymentBreakdown?.Cash || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">UPI:</span> <span className="font-mono font-bold text-emerald-400 print:text-emerald-700">₹{(summary?.nonGstPaymentBreakdown?.UPI || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">Card:</span> <span className="font-mono font-bold text-blue-400 print:text-blue-700">₹{(summary?.nonGstPaymentBreakdown?.Card || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">Credit:</span> <span className="font-mono font-bold text-amber-400 print:text-amber-700">₹{(summary?.nonGstPaymentBreakdown?.Credit || 0).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Total Combined Sales Breakdown */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 print:bg-amber-50/60 print:border-amber-300">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-850 print:border-amber-300">
              <span className="font-bold text-orange-400 print:text-amber-800">Overall Sales Payment Split</span>
              <span className="font-mono text-[11px] font-bold text-slate-300 print:text-amber-950">₹{(summary?.totalSales || 0).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-500 font-bold print:text-slate-700">Cash:</span> <span className="font-mono font-bold text-slate-200 print:text-slate-900">₹{(summary?.totalPaymentBreakdown?.Cash || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">UPI:</span> <span className="font-mono font-bold text-emerald-400 print:text-emerald-700">₹{(summary?.totalPaymentBreakdown?.UPI || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">Card:</span> <span className="font-mono font-bold text-blue-400 print:text-blue-700">₹{(summary?.totalPaymentBreakdown?.Card || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold print:text-slate-700">Credit:</span> <span className="font-mono font-bold text-amber-400 print:text-amber-700">₹{(summary?.totalPaymentBreakdown?.Credit || 0).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Details Table: GST Sales */}
      <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl ${printMode === "nongst" ? "print:hidden" : ""}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 print:text-slate-900">
            GST Sales Outward Tally (Rate-wise Breakdown)
          </h3>
          <button
            onClick={() => triggerPrint("gst")}
            className="print:hidden text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FaPrint size={10} /> Print GST Sales
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl print:border-slate-800">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="print-table-header bg-slate-900 text-white">
              <tr className="border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4 text-white">GST Rate Bracket</th>
                <th className="py-3 px-4 text-right text-white">Taxable Base Amount</th>
                <th className="py-3 px-4 text-right text-white">CGST Collected</th>
                <th className="py-3 px-4 text-right text-white">SGST Collected</th>
                <th className="py-3 px-4 text-right text-white">IGST Collected</th>
                <th className="py-3 px-4 text-right text-white">Total Tax Collected</th>
                <th className="py-3 px-4 text-right text-white">Total Billable Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono print:divide-slate-200 print:text-slate-900">
              {ratesBreakdown.map((row, idx) => {
                let badgeClass = "gst-badge-18";
                if (row.rate === "0%") badgeClass = "gst-badge-0";
                if (row.rate === "5%") badgeClass = "gst-badge-5";
                if (row.rate === "12%") badgeClass = "gst-badge-12";
                if (row.rate === "18%") badgeClass = "gst-badge-18";
                if (row.rate === "28%") badgeClass = "gst-badge-28";

                return (
                  <tr key={idx} className="hover:bg-slate-900/10 transition print:even:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold">
                      <span className={`gst-badge-pill ${badgeClass}`}>{row.rate} GST</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-200 print:text-slate-900">₹{row.taxableValue.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-400 print:text-slate-700">₹{row.cgst.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-400 print:text-slate-700">₹{row.sgst.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-400 print:text-slate-700">₹{row.igst.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-orange-400 font-bold print:text-amber-800">₹{row.totalTax.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-black print:text-emerald-800">₹{row.totalAmount.toFixed(2)}</td>
                  </tr>
                );
              })}
              {ratesBreakdown.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-sans">No sales GST transactions logged for this range.</td>
                </tr>
              )}
            </tbody>
            {ratesBreakdown.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-700 font-bold font-mono text-slate-200 bg-slate-900 text-white print-table-header">
                  <td className="py-3 px-4 font-sans uppercase text-[11px]">GST Sales Subtotal</td>
                  <td className="py-3 px-4 text-right">₹{ratesBreakdown.reduce((sum, r) => sum + r.taxableValue, 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">₹{ratesBreakdown.reduce((sum, r) => sum + r.cgst, 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">₹{ratesBreakdown.reduce((sum, r) => sum + r.sgst, 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">₹{ratesBreakdown.reduce((sum, r) => sum + r.igst, 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-amber-300">₹{ratesBreakdown.reduce((sum, r) => sum + r.totalTax, 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-emerald-300">₹{ratesBreakdown.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Breakdown Details Table: Non-GST Sales */}
      <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl mt-6 ${printMode === "gst" ? "print:hidden" : ""}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 print:text-slate-900">
            Non-GST Sales Outward Tally (Without GST Number / Retail)
          </h3>
          <button
            onClick={() => triggerPrint("nongst")}
            className="print:hidden text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FaPrint size={10} /> Print Non-GST Sales
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl print:border-slate-800">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="print-table-header bg-slate-900 text-white">
              <tr className="border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4 text-white">Sales Type</th>
                <th className="py-3 px-4 text-right text-white">Base Sale Amount</th>
                <th className="py-3 px-4 text-right text-white">CGST Collected</th>
                <th className="py-3 px-4 text-right text-white">SGST Collected</th>
                <th className="py-3 px-4 text-right text-white">IGST Collected</th>
                <th className="py-3 px-4 text-right text-white">Total Tax Collected</th>
                <th className="py-3 px-4 text-right text-white">Total Sale Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono print:divide-slate-200 print:text-slate-900">
              {nonGstRatesBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 transition print:even:bg-slate-50">
                  <td className="py-3 px-4 font-sans font-bold text-slate-200 print:text-slate-900">
                    <span className="gst-badge-pill gst-badge-0">{row.rate} Non-GST</span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold print:text-slate-900">₹{row.taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹0.00</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-bold">₹0.00</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-black print:text-cyan-800">₹{row.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {nonGstRatesBreakdown.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-sans">No Non-GST sales logged for this range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CA Audit Master Summary Box */}
      <div className={`bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-5 mt-6 shadow-2xl print:bg-emerald-50/50 print:border-emerald-300 ${printMode !== "all" ? "print:hidden" : ""}`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 mb-3 print:text-emerald-900">
          CA Master Reconciliation Grand Total ({getDateRangeLabel()})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-white print:border-slate-300">
            <span className="text-[10px] text-slate-500 block font-bold uppercase print:text-slate-700">Total Taxable Base</span>
            <span className="font-bold text-slate-200 print:text-slate-950">₹{(summary?.taxableValue || 0).toFixed(2)}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-white print:border-slate-300">
            <span className="text-[10px] text-slate-500 block font-bold uppercase print:text-slate-700">Total CGST</span>
            <span className="font-bold text-slate-300 print:text-slate-900">₹{(summary?.cgst || 0).toFixed(2)}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-white print:border-slate-300">
            <span className="text-[10px] text-slate-500 block font-bold uppercase print:text-slate-700">Total SGST</span>
            <span className="font-bold text-slate-300 print:text-slate-900">₹{(summary?.sgst || 0).toFixed(2)}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-white print:border-slate-300">
            <span className="text-[10px] text-slate-500 block font-bold uppercase print:text-slate-700">Total IGST</span>
            <span className="font-bold text-slate-300 print:text-slate-900">₹{(summary?.igst || 0).toFixed(2)}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-white print:border-rose-200">
            <span className="text-[10px] text-slate-500 block font-bold uppercase print:text-rose-800">Total GST Tax</span>
            <span className="font-bold text-rose-400 print:text-rose-700">₹{(summary?.totalTax || 0).toFixed(2)}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-white print:border-emerald-300">
            <span className="text-[10px] text-slate-500 block font-bold uppercase print:text-emerald-800">Grand Total Revenue</span>
            <span className="font-black text-emerald-400 print:text-emerald-700 text-sm">₹{(summary?.totalSales || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default GstSales;
