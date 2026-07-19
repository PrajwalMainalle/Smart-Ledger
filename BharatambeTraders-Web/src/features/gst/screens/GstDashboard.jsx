import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaPercent, FaCoins, FaShoppingCart, FaChartLine, FaArrowDown, FaCalendarAlt, FaFileInvoice, FaSpinner } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function GstDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/gst/dashboard");
        setMetrics(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch GST dashboard metrics.");
        setLoading(false);
      }
    };
    fetchDashboardMetrics();
  }, []);

  if (loading) {
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
    gstPurchases,
    nonGstPurchases,
    profit,
    gstPayable,
    netSales,
    netPurchases,
    monthlySalesGst,
    monthlyPurchasesGst
  } = metrics;

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900">
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
          <span className="p-2 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl text-white">
            <FaPercent size={20} />
          </span>
          GST Control Dashboard
        </h2>
        <p className="text-slate-400 text-sm mt-2">
          Real-time tax compliance summaries, gross margins, input tax credits (ITC), and overall tax liabilities.
        </p>
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
