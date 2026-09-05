import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosInstance from "../../../app/api/axiosInstance";
import { 
  FaFileInvoiceDollar, 
  FaBoxes, 
  FaArrowUp, 
  FaShoppingCart, 
  FaExclamationTriangle, 
  FaPlus,
  FaFileInvoice,
  FaSpinner,
  FaCalendarAlt,
  FaChartLine,
  FaFilter
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const [graphFilter, setGraphFilter] = useState("7days"); // "7days" | "30days" | "lastMonth" | "thisYear" | "lastYear" | "custom"
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/dashboard/summary");
        setData(response.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard metrics from server.");
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingOverlay message="Loading merchant console..." />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rose-400 bg-slate-950 p-6">
        <div className="border border-rose-500/20 bg-rose-500/10 p-6 rounded-2xl max-w-md text-center space-y-4">
          <p>{error || "No data available."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { 
    kpis = { totalSales: 0, todaySales: 0, totalInvoices: 0, inventoryCount: 0, lowStockCount: 0, monthlySales: 0 }, 
    recentInvoices = [], 
    lowStockProducts = [], 
    paymentBreakdown = {}, 
    topSellingProducts = [] 
  } = data || {};

  // Generate filtered chart points based on selected period
  const getFilteredChartData = () => {
    if (!data?.reports) return { pointsData: [], totalPeriodSales: 0, periodTitle: "Sales Trend" };

    const rawDaily = data.reports.dailySales || [];
    const rawMonthly = data.reports.monthlySales || [];

    const dailyMap = {};
    rawDaily.forEach((d) => { dailyMap[d.date] = d.sales; });

    const monthlyMap = {};
    rawMonthly.forEach((m) => { monthlyMap[m.month] = m.sales; });

    const now = new Date();
    let pointsData = [];
    let periodTitle = "";

    if (graphFilter === "7days") {
      periodTitle = "Last 7 Days";
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
        pointsData.push({
          label,
          fullDate: dateStr,
          sales: dailyMap[dateStr] || 0,
        });
      }
    } else if (graphFilter === "30days") {
      periodTitle = "Last 30 Days";
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        pointsData.push({
          label,
          fullDate: dateStr,
          sales: dailyMap[dateStr] || 0,
        });
      }
    } else if (graphFilter === "lastMonth") {
      periodTitle = "Last Month";
      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const totalDays = lastDayPrevMonth.getDate();

      for (let day = 1; day <= totalDays; day++) {
        const d = new Date(firstDayPrevMonth.getFullYear(), firstDayPrevMonth.getMonth(), day);
        const dateStr = d.toISOString().split("T")[0];
        const label = `${day} ${d.toLocaleString("default", { month: "short" })}`;
        pointsData.push({
          label,
          fullDate: dateStr,
          sales: dailyMap[dateStr] || 0,
        });
      }
    } else if (graphFilter === "thisYear") {
      periodTitle = `This Year (${now.getFullYear()})`;
      const currentYear = now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let m = 0; m < 12; m++) {
        const monthStr = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
        pointsData.push({
          label: monthNames[m],
          fullDate: monthStr,
          sales: monthlyMap[monthStr] || 0,
        });
      }
    } else if (graphFilter === "lastYear") {
      const lastYr = now.getFullYear() - 1;
      periodTitle = `Last Year (${lastYr})`;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let m = 0; m < 12; m++) {
        const monthStr = `${lastYr}-${String(m + 1).padStart(2, "0")}`;
        pointsData.push({
          label: monthNames[m],
          fullDate: monthStr,
          sales: monthlyMap[monthStr] || 0,
        });
      }
    } else if (graphFilter === "custom") {
      periodTitle = customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : "Custom Date Range";
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        if (start <= end) {
          const curr = new Date(start);
          let count = 0;
          while (curr <= end && count < 366) {
            const dateStr = curr.toISOString().split("T")[0];
            const label = `${curr.getDate()}/${curr.getMonth() + 1}`;
            pointsData.push({
              label,
              fullDate: dateStr,
              sales: dailyMap[dateStr] || 0,
            });
            curr.setDate(curr.getDate() + 1);
            count++;
          }
        }
      }
    }

    const totalPeriodSales = pointsData.reduce((acc, curr) => acc + curr.sales, 0);

    return { pointsData, totalPeriodSales, periodTitle };
  };

  const { pointsData, totalPeriodSales, periodTitle } = getFilteredChartData();
  const maxTotal = Math.max(...pointsData.map((d) => d.sales), 1000);
  const svgWidth = 600;
  const svgHeight = 200;
  const padding = 35;

  const points = pointsData.map((day, idx) => {
    const x = padding + (idx * (svgWidth - padding * 2)) / Math.max(pointsData.length - 1, 1);
    const y = svgHeight - padding - (day.sales * (svgHeight - padding * 2)) / maxTotal;
    return { ...day, x, y };
  });

  const svgLinePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const svgAreaPath = points.length > 0 
    ? `${svgLinePath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z` 
    : "";

  const labelStride = Math.max(1, Math.ceil(pointsData.length / 10));

  return (
    <div className="w-full space-y-8 text-slate-100 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Sales &amp; Analytics Dashboard</h2>
            <p className="text-slate-400 text-sm mt-1">Real-time indicators, revenue reports, and stock management overview.</p>
          </div>
          <button 
            onClick={() => navigate("/pos")}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-95"
          >
            <FaPlus /> New Billing Terminal
          </button>
        </div>

        {/* Overdue Credit Warning Banner */}
        {(() => {
          const defaultReminderDays = data.creditReminderDays || user?.creditReminderDays || 20;
          const overdueCredits = data.reports?.pendingCreditInvoices?.filter(inv => {
            const daysElapsed = Math.floor((Date.now() - new Date(inv.date)) / (1000 * 60 * 60 * 24));
            const threshold = inv.targetReminderDays || defaultReminderDays;
            return daysElapsed >= threshold;
          }) || [];

          if (overdueCredits.length === 0) return null;

          return (
            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-500/20 text-rose-450 rounded-xl mt-0.5 animate-pulse">
                  <FaExclamationTriangle className="text-xl" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm md:text-base">Pending Credit Payments Attention Required!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    There {overdueCredits.length === 1 ? "is 1 customer credit invoice" : `are ${overdueCredits.length} customer credit invoices`} that {overdueCredits.length === 1 ? "has" : "have"} exceeded their credit reminder payment terms.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/invoices", { state: { searchInvoiceId: overdueCredits[0].invoiceId } })}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap self-stretch md:self-auto text-center"
              >
                Review &amp; Settle Credit
              </button>
            </div>
          );
        })()}

        {/* Top Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Revenue */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group hover:border-slate-800 transition-colors">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gross Sales Revenue</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-100">
                ₹{kpis.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-emerald-450 text-[10px] flex items-center gap-1 font-medium">
                Today: <strong className="text-slate-100">₹{kpis.todaySales.toFixed(2)}</strong>
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <FaFileInvoiceDollar className="text-2xl" />
            </div>
          </div>

          {/* Card 2: Invoices count */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group hover:border-slate-800 transition-colors">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Invoices Issued</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-100">{kpis.totalInvoices}</h3>
              <p className="text-slate-550 text-[10px] font-medium">This month: {kpis.totalInvoices} bills</p>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <FaFileInvoice className="text-2xl" />
            </div>
          </div>

          {/* Card 3: Items catalogued */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group hover:border-slate-800 transition-colors">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Catalog Items</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-100">{kpis.inventoryCount} Products</h3>
              <p className="text-slate-550 text-[10px] font-medium">Active list in database</p>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl">
              <FaShoppingCart className="text-2xl" />
            </div>
          </div>

          {/* Card 4: Low stock count */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group hover:border-slate-800 transition-colors">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
              <h3 className={`text-xl md:text-2xl font-black ${kpis.lowStockCount > 0 ? "text-rose-500 animate-pulse" : "text-slate-100"}`}>
                {kpis.lowStockCount} Alerts
              </h3>
              <p className="text-slate-550 text-[10px] font-medium">Items with &le; 5 units left</p>
            </div>
            <div className={`p-3 rounded-xl border ${kpis.lowStockCount > 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-slate-800 text-slate-400"}`}>
              <FaBoxes className="text-2xl" />
            </div>
          </div>

        </div>

        {/* Visual Charts & Payment breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Revenue Curve Chart */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl lg:col-span-2 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                    <FaChartLine className="text-orange-500" /> Sales Trend Analytics
                  </h4>
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live Stream
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Sales velocity &amp; revenue trend for <strong className="text-slate-300 font-semibold">{periodTitle}</strong>
                </p>
              </div>

              {/* Date Filter Selector */}
              <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={graphFilter}
                    onChange={(e) => setGraphFilter(e.target.value)}
                    className="w-full sm:w-auto bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 shadow-sm cursor-pointer hover:bg-slate-900 transition"
                  >
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="thisYear">This Year (Monthly)</option>
                    <option value="lastYear">Last Year (Monthly)</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                {graphFilter === "custom" && (
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <input 
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-transparent text-slate-200 text-xs font-mono px-2 py-1 focus:outline-none"
                    />
                    <span className="text-slate-600 text-xs font-bold">to</span>
                    <input 
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-transparent text-slate-200 text-xs font-mono px-2 py-1 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>



            {pointsData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="min-w-[500px] py-2">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} className="stroke-slate-800" strokeDasharray="3" />
                    <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} className="stroke-slate-800" strokeDasharray="3" />
                    <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} className="stroke-slate-700" strokeWidth="1.5" />

                    {/* Area fill */}
                    {svgAreaPath && <path d={svgAreaPath} fill="url(#chartGradient)" />}

                    {/* Plot Line */}
                    {svgLinePath && <path d={svgLinePath} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                    {/* Points and Tooltips */}
                    {points.map((p, idx) => {
                      const showLabel = idx === 0 || idx === points.length - 1 || idx % labelStride === 0;
                      const isHovered = hoveredPoint?.fullDate === p.fullDate;
                      return (
                        <g key={idx} className="group">
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={isHovered ? "6.5" : "4.5"} 
                            stroke="#f97316" 
                            strokeWidth={isHovered ? "3.5" : "2.5"} 
                            className="fill-slate-900 transition-all cursor-pointer" 
                            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          
                          {/* Tooltip value */}
                          {(points.length <= 10 || isHovered) && p.sales > 0 && (
                            <text 
                              x={p.x} 
                              y={p.y - 12} 
                              fontSize={isHovered ? "11" : "10"} 
                              textAnchor="middle" 
                              fontWeight="800"
                              className={isHovered ? "fill-orange-500 font-black" : "fill-slate-100 font-extrabold"}
                            >
                              ₹{Math.round(p.sales)}
                            </text>
                          )}
                          
                          {/* Bottom labels */}
                          {showLabel && (
                            <text 
                              x={p.x} 
                              y={svgHeight - 10} 
                              fontSize="9.5" 
                              textAnchor="middle"
                              className="fill-slate-400 font-bold"
                            >
                              {p.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <FaCalendarAlt className="text-2xl text-slate-700" />
                <p className="text-slate-500 text-sm">Select dates or add invoices to visualize sales trends.</p>
              </div>
            )}
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between space-y-6">
            <div>
              <h4 className="text-lg font-bold text-slate-100">Payment Share</h4>
              <p className="text-xs text-slate-500">Breakdown of earnings by payment channel</p>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {Object.keys(paymentBreakdown).map((method) => {
                const amount = paymentBreakdown[method];
                const percentage = kpis.totalSales > 0 ? (amount / kpis.totalSales) * 100 : 0;
                
                let colorBar = "bg-orange-500";
                let textClass = "text-orange-400";
                if (method === "UPI") { colorBar = "bg-emerald-500"; textClass = "text-emerald-400"; }
                if (method === "Card") { colorBar = "bg-blue-500"; textClass = "text-blue-400"; }
                if (method === "Cheque") { colorBar = "bg-amber-500"; textClass = "text-amber-400"; }
                if (method === "Credit") { colorBar = "bg-purple-500"; textClass = "text-purple-400"; }

                return (
                  <div key={method} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{method}</span>
                      <span className={textClass}>
                        ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                      <div className={`h-full ${colorBar} rounded-full`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-900/60 text-center text-xs">
              <p className="text-slate-500">Monthly gross velocity: <strong className="text-slate-350">₹{kpis.monthlySales.toFixed(2)}</strong></p>
            </div>
          </div>

        </div>

        {/* Bottom tables: Recent Sales & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Sales table */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-bold text-slate-100">Recent Transactions</h4>
                <p className="text-xs text-slate-500">Latest sales orders processed at Terminal</p>
              </div>
              <button 
                onClick={() => navigate("/invoices")} 
                className="text-xs text-orange-500 hover:text-orange-400 font-semibold hover:underline"
              >
                View History &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="py-2.5">Invoice</th>
                    <th>Customer</th>
                    <th>Payment</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40">
                  {recentInvoices.map((inv) => (
                    <tr key={inv._id} className="text-slate-305 hover:bg-slate-900/20 transition-colors">
                      <td className="py-3 font-semibold text-slate-400">{inv.invoiceId}</td>
                      <td>
                        <div className="font-semibold text-slate-200">{inv.customerName}</div>
                        <div className="text-[10px] text-slate-500">{inv.customerPhone}</div>
                      </td>
                      <td>
                        {inv.isQuotation || inv.status === "Quotation" || inv.paymentMethod === "N/A" ? (
                          <span className="text-slate-500 font-mono text-xs font-semibold">-</span>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border 
                            ${inv.paymentMethod === "UPI" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : ""}
                            ${inv.paymentMethod === "Cash" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : ""}
                            ${inv.paymentMethod === "Card" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : ""}
                            ${inv.paymentMethod === "Cheque" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : ""}
                            ${inv.paymentMethod === "Credit" ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : ""}
                          `}>
                            {inv.paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className="text-right font-bold text-slate-100">₹{inv.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500 text-sm">No transactions logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Products list */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-bold text-slate-100">Top Selling Products</h4>
                <p className="text-xs text-slate-500">Highest grossing items in inventory</p>
              </div>
              <button 
                onClick={() => navigate("/inventory")} 
                className="text-xs text-orange-555 hover:text-orange-400 font-semibold hover:underline"
              >
                Go to Inventory &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="py-2.5">SKU</th>
                    <th>Product Name</th>
                    <th className="text-center">Qty Sold</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40">
                  {topSellingProducts.map((prod, index) => (
                    <tr key={index} className="text-slate-300 hover:bg-slate-900/20 transition-colors">
                      <td className="py-3 text-slate-400 font-mono">{prod.sku}</td>
                      <td className="font-semibold text-slate-200 notranslate" translate="no">{prod.name}</td>
                      <td className="text-center font-bold text-orange-400">{prod.qty} units</td>
                      <td className="text-right font-bold text-slate-100">₹{prod.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {topSellingProducts.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500 text-sm font-medium">
                        No product statistics compiled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Dashboard;
