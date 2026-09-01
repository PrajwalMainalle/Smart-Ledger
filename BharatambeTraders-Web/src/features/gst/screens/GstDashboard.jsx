import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaPercent, FaCoins, FaShoppingCart, FaChartLine, FaArrowDown, FaCalendarAlt, FaFileInvoice, FaSpinner, FaSearch, FaUndo } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function GstDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const fetchDashboardMetrics = async (p = period, start = startDate, end = endDate) => {
    try {
      setLoading(true);
      let url = `/gst/dashboard?period=${p}`;
      if (p === "custom") {
        if (start) url += `&startDate=${start}`;
        if (end) url += `&endDate=${end}`;
      }
      const res = await axiosInstance.get(url);
      setMetrics(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch GST dashboard metrics.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics(period, startDate, endDate);
  }, [period]);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    setPeriod("custom");
    fetchDashboardMetrics("custom", startDate, endDate);
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

  if (loading && !metrics) {
    return <LoadingOverlay message="Compiling GST Dashboard analytics..." />;
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

  const {
    todayGstSales,
    todayNonGstSales,
    monthlyGstSales,
    monthlyNonGstSales,
    todayGstPaymentBreakdown,
    todayNonGstPaymentBreakdown,
    monthlyGstPaymentBreakdown,
    monthlyNonGstPaymentBreakdown,
    periodGstSales,
    periodNonGstSales,
    periodGstPurchases,
    periodNonGstPurchases,
    periodGstPaymentBreakdown,
    periodNonGstPaymentBreakdown,
    periodPaymentBreakdown,
    gstPurchases,
    nonGstPurchases,
    profit,
    gstPayable,
    netSales,
    netPurchases,
    monthlySalesGst,
    monthlyPurchasesGst
  } = metrics || {};

  return (
    <div className="w-full space-y-6 text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl text-white">
              <FaPercent size={20} />
            </span>
            GST Control Dashboard
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time tax compliance summaries, gross margins, input tax credits (ITC), and overall tax liabilities.
          </p>
        </div>
      </div>

      {/* Date Filter & Range Selector Toolbar */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        {/* Preset Period Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-xs font-bold mr-1 flex items-center gap-1">
            <FaCalendarAlt className="text-orange-500" /> Filter Date:
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
              {p === "daily" ? "Daily (Today)" : p === "custom" ? "Custom Date Range" : p}
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
            <FaSearch size={10} /> Fetch Data
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Today's Sales Card */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Sales</span>
              <h3 className="text-2xl font-black text-white font-mono">₹{((todayGstSales || 0) + (todayNonGstSales || 0)).toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl">
              <FaCalendarAlt size={16} />
            </div>
          </div>
          <div className="flex justify-between text-[11px] border-t border-slate-900 pt-2 font-mono">
            <span className="text-slate-400">GST: <b className="text-slate-200">₹{(todayGstSales || 0).toFixed(2)}</b></span>
            <span className="text-slate-400">Non-GST: <b className="text-slate-200">₹{(todayNonGstSales || 0).toFixed(2)}</b></span>
          </div>
        </div>

        {/* Monthly Sales Card */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monthly Sales</span>
              <h3 className="text-2xl font-black text-white font-mono">₹{((monthlyGstSales || 0) + (monthlyNonGstSales || 0)).toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <FaFileInvoice size={16} />
            </div>
          </div>
          <div className="flex justify-between text-[11px] border-t border-slate-900 pt-2 font-mono">
            <span className="text-slate-400">GST: <b className="text-slate-200">₹{(monthlyGstSales || 0).toFixed(2)}</b></span>
            <span className="text-slate-400">Non-GST: <b className="text-slate-200">₹{(monthlyNonGstSales || 0).toFixed(2)}</b></span>
          </div>
        </div>

        {/* Monthly Purchases Card */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monthly Purchases</span>
              <h3 className="text-2xl font-black text-white font-mono">₹{((gstPurchases || 0) + (nonGstPurchases || 0)).toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <FaShoppingCart size={16} />
            </div>
          </div>
          <div className="flex justify-between text-[11px] border-t border-slate-900 pt-2 font-mono">
            <span className="text-slate-400">GST: <b className="text-slate-200">₹{(gstPurchases || 0).toFixed(2)}</b></span>
            <span className="text-slate-400">Non-GST: <b className="text-slate-200">₹{(nonGstPurchases || 0).toFixed(2)}</b></span>
          </div>
        </div>

        {/* GST Payable Card */}
        <div className={`p-5 rounded-2xl border space-y-3 relative overflow-hidden shadow-xl
          ${(gstPayable || 0) >= 0 
            ? "bg-rose-500/5 border-rose-500/20" 
            : "bg-emerald-500/5 border-emerald-500/20"
          }
        `}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {(gstPayable || 0) >= 0 ? "GST Liability" : "Excess ITC Balance"}
              </span>
              <h3 className={`text-2xl font-black font-mono
                ${(gstPayable || 0) >= 0 ? "text-rose-450" : "text-emerald-450"}
              `}>
                ₹{Math.abs(gstPayable || 0).toFixed(2)}
              </h3>
            </div>
            <div className={`p-3 rounded-xl
              ${(gstPayable || 0) >= 0 ? "bg-rose-500/10 text-rose-450" : "bg-emerald-500/10 text-emerald-450"}
            `}>
              <FaCoins size={16} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-none">
            {(gstPayable || 0) >= 0 
              ? "Estimated net tax payable for the current calendar month."
              : "Excess input credits to be carried forward next month."
            }
          </p>
        </div>
      </div>

      {/* Selected Filter Period Overview Card */}
      <div className="bg-slate-900/60 border border-orange-500/30 p-5 rounded-2xl mb-8 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Date-Filtered Revenue Overview</span>
            <h3 className="text-xl font-extrabold text-white">Active Range: <span className="text-amber-400">{getDateRangeLabel()}</span></h3>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Range Total Sales</span>
            <p className="text-2xl font-black text-emerald-400 font-mono">₹{((periodGstSales || 0) + (periodNonGstSales || 0)).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* GST Sales Period Breakdown */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
            <div className="flex justify-between font-bold border-b border-slate-850 pb-1.5">
              <span className="text-emerald-400">GST Sales ({getDateRangeLabel()})</span>
              <span className="font-mono text-slate-200">₹{(periodGstSales || 0).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div><span className="text-slate-500 font-bold text-[10px] block">Cash</span><span className="font-mono font-bold text-slate-200">₹{(periodGstPaymentBreakdown?.Cash || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold text-[10px] block">UPI</span><span className="font-mono font-bold text-emerald-400">₹{(periodGstPaymentBreakdown?.UPI || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold text-[10px] block">Card</span><span className="font-mono font-bold text-blue-400">₹{(periodGstPaymentBreakdown?.Card || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold text-[10px] block">Credit</span><span className="font-mono font-bold text-amber-400">₹{(periodGstPaymentBreakdown?.Credit || 0).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Non-GST Sales Period Breakdown */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
            <div className="flex justify-between font-bold border-b border-slate-850 pb-1.5">
              <span className="text-cyan-400">Non-GST Sales ({getDateRangeLabel()})</span>
              <span className="font-mono text-slate-200">₹{(periodNonGstSales || 0).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div><span className="text-slate-500 font-bold text-[10px] block">Cash</span><span className="font-mono font-bold text-slate-200">₹{(periodNonGstPaymentBreakdown?.Cash || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold text-[10px] block">UPI</span><span className="font-mono font-bold text-emerald-400">₹{(periodNonGstPaymentBreakdown?.UPI || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold text-[10px] block">Card</span><span className="font-mono font-bold text-blue-400">₹{(periodNonGstPaymentBreakdown?.Card || 0).toFixed(2)}</span></div>
              <div><span className="text-slate-500 font-bold text-[10px] block">Credit</span><span className="font-mono font-bold text-amber-400">₹{(periodNonGstPaymentBreakdown?.Credit || 0).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Revenue Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's Payment Breakdown */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-orange-400">
              Today's Sales Payment Breakdown
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Total: ₹{((todayGstSales || 0) + (todayNonGstSales || 0)).toFixed(2)}</span>
          </div>
          
          <div className="space-y-3">
            {/* GST Sales Payment Breakdown */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1 flex justify-between">
                <span>GST Sales (₹{(todayGstSales || 0).toFixed(2)})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Cash</span>
                  <span className="font-mono font-bold text-slate-200">₹{(todayGstPaymentBreakdown?.Cash || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">UPI</span>
                  <span className="font-mono font-bold text-emerald-400">₹{(todayGstPaymentBreakdown?.UPI || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Card</span>
                  <span className="font-mono font-bold text-blue-400">₹{(todayGstPaymentBreakdown?.Card || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Credit</span>
                  <span className="font-mono font-bold text-amber-400">₹{(todayGstPaymentBreakdown?.Credit || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Non-GST Sales Payment Breakdown */}
            <div className="pt-2 border-t border-slate-850">
              <div className="text-[11px] font-bold text-slate-400 mb-1 flex justify-between">
                <span>Non-GST Sales (₹{(todayNonGstSales || 0).toFixed(2)})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Cash</span>
                  <span className="font-mono font-bold text-slate-200">₹{(todayNonGstPaymentBreakdown?.Cash || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">UPI</span>
                  <span className="font-mono font-bold text-emerald-400">₹{(todayNonGstPaymentBreakdown?.UPI || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Card</span>
                  <span className="font-mono font-bold text-blue-400">₹{(todayNonGstPaymentBreakdown?.Card || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Credit</span>
                  <span className="font-mono font-bold text-amber-400">₹{(todayNonGstPaymentBreakdown?.Credit || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Payment Breakdown */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
              Monthly Sales Payment Breakdown
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Total: ₹{((monthlyGstSales || 0) + (monthlyNonGstSales || 0)).toFixed(2)}</span>
          </div>
          
          <div className="space-y-3">
            {/* Monthly GST Sales Payment Breakdown */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1 flex justify-between">
                <span>GST Sales (₹{(monthlyGstSales || 0).toFixed(2)})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Cash</span>
                  <span className="font-mono font-bold text-slate-200">₹{(monthlyGstPaymentBreakdown?.Cash || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">UPI</span>
                  <span className="font-mono font-bold text-emerald-400">₹{(monthlyGstPaymentBreakdown?.UPI || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Card</span>
                  <span className="font-mono font-bold text-blue-400">₹{(monthlyGstPaymentBreakdown?.Card || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Credit</span>
                  <span className="font-mono font-bold text-amber-400">₹{(monthlyGstPaymentBreakdown?.Credit || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Monthly Non-GST Sales Payment Breakdown */}
            <div className="pt-2 border-t border-slate-850">
              <div className="text-[11px] font-bold text-slate-400 mb-1 flex justify-between">
                <span>Non-GST Sales (₹{(monthlyNonGstSales || 0).toFixed(2)})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Cash</span>
                  <span className="font-mono font-bold text-slate-200">₹{(monthlyNonGstPaymentBreakdown?.Cash || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">UPI</span>
                  <span className="font-mono font-bold text-emerald-400">₹{(monthlyNonGstPaymentBreakdown?.UPI || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Card</span>
                  <span className="font-mono font-bold text-blue-400">₹{(monthlyNonGstPaymentBreakdown?.Card || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Credit</span>
                  <span className="font-mono font-bold text-amber-400">₹{(monthlyNonGstPaymentBreakdown?.Credit || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid for detailed summaries & margins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profit Performance Box */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-900 pb-3 flex items-center gap-2">
            <FaChartLine className="text-orange-500" /> Margin &amp; Earnings Velocity
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950 rounded-xl space-y-1.5 border border-slate-900 text-center font-mono">
              <span className="text-[9px] uppercase font-bold text-slate-500">Taxable Sales</span>
              <p className="text-sm font-bold text-slate-100">₹{(profit?.taxableSales || 0).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl space-y-1.5 border border-slate-900 text-center font-mono">
              <span className="text-[9px] uppercase font-bold text-slate-500">Cost of Goods (COGS)</span>
              <p className="text-sm font-bold text-slate-100">₹{(profit?.cogs || 0).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl space-y-1.5 border border-slate-900 text-center font-mono">
              <span className="text-[9px] uppercase font-bold text-slate-500">Gross profit</span>
              <p className="text-sm font-bold text-emerald-450">₹{(profit?.grossProfit || 0).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl space-y-1.5 border border-slate-900 text-center font-mono">
              <span className="text-[9px] uppercase font-bold text-slate-500">Net Profit</span>
              <p className="text-sm font-bold text-emerald-450">₹{(profit?.netProfit || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl leading-relaxed text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">Accounting Policy Notes:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] font-sans">
              <li>Gross Profit is calculated as <b>Taxable Sales Base (excluding GST tax collection) minus Cost price of items sold (COGS)</b>.</li>
              <li>Net Profit accounts for deductions of freight and transport costs recorded in purchases.</li>
              <li>Profit calculations include all GST and Non-GST transacted invoice logs per accounting guidelines.</li>
            </ul>
          </div>
        </div>

        {/* Cumulative Flow Summary */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-900 pb-3 flex items-center gap-2">
            <FaArrowDown className="text-orange-500" /> Cumulative Net Flows
          </h3>
          
          <div className="space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span className="text-slate-400">Total Net Sales</span>
              <span className="text-slate-100 font-bold">₹{(netSales || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span className="text-slate-400">Total Net Purchases</span>
              <span className="text-slate-100 font-bold">₹{(netPurchases || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span className="text-slate-400">Current Month's Collected GST</span>
              <span className="text-slate-100 font-bold">₹{(monthlySalesGst || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
              <span className="text-slate-400">Current Month's Input GST (ITC)</span>
              <span className="text-slate-100 font-bold">₹{(monthlyPurchasesGst || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default GstDashboard;
