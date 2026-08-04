import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaScaleBalanced } from "react-icons/fa6";
import { FaFileCsv, FaFileExcel, FaPrint, FaSearch, FaSpinner } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";
import { exportToExcel } from "../../../utils/excelExporter";
import { MultiColorCompanyTitle, MultiColorReportTitle, triggerSafePrint } from "../../../components/MultiColorHeader";

function GstSummary() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const fetchGstSummary = async () => {
    try {
      setLoading(true);
      let url = `/gst/reports/profit?period=${period}`;
      if (period === "custom") {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      const res = await axiosInstance.get(url);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch GST comparative summary.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGstSummary();
  }, [period]);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    fetchGstSummary();
  };

  const handleExportExcel = () => {
    if (!data) return alert("No data to export");

    const sheetData = [
      ["BHARATAMBE TRADERS - GST TAX VARIANCE & COMPARATIVE SUMMARY"],
      ["Period / Filter Range:", period.toUpperCase()],
      ["Generated On:", new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN")],
      [],
      ["Metric Type", "Taxable Value (INR)", "Tax Amount (INR)", "Total Value (INR)"],
      ["Sales (Outward)", data.gstSalesTaxable, data.gstSalesTax, data.totalSales],
      ["Purchases (Inward)", data.gstPurchasesTaxable, data.gstPurchasesTax, data.totalPurchases],
      [
        "Net Variance / Liability",
        data.gstSalesTaxable - data.gstPurchasesTaxable,
        data.gstSalesTax - data.gstPurchasesTax,
        data.totalSales - data.totalPurchases
      ]
    ];

    exportToExcel({
      fileName: `GST_Tax_Variance_Summary_${period}_${new Date().toISOString().split("T")[0]}`,
      sheets: [{ sheetName: "Tax Variance Summary", data: sheetData }]
    });
  };

  const handlePrint = () => {
    triggerSafePrint();
  };

  if (loading && !data) {
    return <LoadingOverlay message="Compiling GST Tax Variance summaries..." />;
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

  const netTaxable = data.gstSalesTaxable - data.gstPurchasesTaxable;
  const netTax = data.gstSalesTax - data.gstPurchasesTax;
  const netTotal = data.totalSales - data.totalPurchases;

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900 print:bg-white print:text-black print:border-none print:p-0 print:m-0">
      
      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <MultiColorCompanyTitle className="text-2xl font-black tracking-tight" />
            <MultiColorReportTitle title="GST Tax Variance & Profit Summary" className="text-lg font-bold mt-1" />
            <p className="text-xs text-slate-600 mt-0.5">Filter Period: <span className="font-semibold">{period}</span></p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Generated on: {new Date().toLocaleDateString("en-IN")} {new Date().toLocaleTimeString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <FaScaleBalanced className="text-orange-500" /> Tax Variance &amp; Profit Summary
          </h2>
          <p className="text-slate-400 text-sm mt-1">Audit net tax liability and outward sales vs inward ITC credit variances.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow transition duration-150 cursor-pointer"
          >
            Print Report
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition duration-150 cursor-pointer"
          >
            <FaFileExcel className="text-sm" /> Export Excel Report
          </button>
        </div>
      </div>

      {/* Filter Options */}
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
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
            />
            <button 
              type="submit"
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition shadow"
            >
              Filter
            </button>
          </form>
        )}
      </div>

      {/* Variance Alert Box */}
      <div className={`p-5 rounded-2xl border mb-6 text-xs md:text-sm font-mono flex items-center gap-4
        ${netTax >= 0 
          ? "bg-rose-500/5 border-rose-500/20 text-rose-450" 
          : "bg-emerald-500/5 border-emerald-500/20 text-emerald-450"
        }
      `}>
        <div className="hidden sm:block p-3.5 rounded-xl bg-slate-900 border border-slate-850 text-orange-400">
          <FaScaleBalanced size={24} />
        </div>
        <div className="flex-1 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">GST Reconciliation Variance (Sales Tax - Purchase ITC)</span>
          <p className="text-slate-350 text-[11px] leading-relaxed font-sans">
            {netTax >= 0 
              ? `You have a net GST tax liability of ₹${netTax.toFixed(2)} to pay. Your outward tax collections are higher than inward credits.`
              : `You have surplus Input Tax Credit (ITC) of ₹${Math.abs(netTax).toFixed(2)}. This amount can be offset against future tax liabilities.`
            }
          </p>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase font-bold text-slate-500">Net Tax Variance</span>
          <h3 className="text-xl font-black font-mono mt-0.5">₹{netTax.toFixed(2)}</h3>
        </div>
      </div>

      {/* Tally Sheet Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">GST Outward vs Inward Tally Sheet</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Ledger Type</th>
                <th className="py-3 px-4 text-right">Taxable Amount</th>
                <th className="py-3 px-4 text-right">GST Tax Amount</th>
                <th className="py-3 px-4 text-right">Gross Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 text-slate-350 font-mono">
              <tr className="hover:bg-slate-900/10 transition">
                <td className="py-3.5 px-4 font-sans font-bold text-slate-100">Sales GST Collections (Outward)</td>
                <td className="py-3.5 px-4 text-right">₹{(data?.gstSalesTaxable || 0).toFixed(2)}</td>
                <td className="py-3.5 px-4 text-right text-orange-400">₹{(data?.gstSalesTax || 0).toFixed(2)}</td>
                <td className="py-3.5 px-4 text-right text-white">₹{(data?.totalSales || 0).toFixed(2)}</td>
              </tr>
              <tr className="hover:bg-slate-900/10 transition">
                <td className="py-3.5 px-4 font-sans font-bold text-slate-100">Purchases GST ITC (Inward)</td>
                <td className="py-3.5 px-4 text-right">₹{(data?.gstPurchasesTaxable || 0).toFixed(2)}</td>
                <td className="py-3.5 px-4 text-right text-emerald-450">₹{(data?.gstPurchasesTax || 0).toFixed(2)}</td>
                <td className="py-3.5 px-4 text-right text-white">₹{(data?.totalPurchases || 0).toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-950/40 font-bold border-t border-slate-800">
                <td className="py-3.5 px-4 font-sans font-black text-slate-200">Net Tax Reconciliation</td>
                <td className={`py-3.5 px-4 text-right ${(netTaxable || 0) >= 0 ? "text-slate-100" : "text-emerald-450"}`}>
                  ₹{(netTaxable || 0).toFixed(2)}
                </td>
                <td className={`py-3.5 px-4 text-right ${(netTax || 0) >= 0 ? "text-rose-450" : "text-emerald-450"}`}>
                  ₹{(netTax || 0).toFixed(2)}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-100">
                  ₹{(netTotal || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default GstSummary;
