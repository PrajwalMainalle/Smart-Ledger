import React, { useState, useEffect } from "react";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaFileCsv, FaPrint, FaSpinner, FaChartBar, FaUserFriends, FaBoxes, FaPercent } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function Reports() {
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [purchaseData, setPurchaseData] = useState([]);
  const [error, setError] = useState("");
  const [salesFilter, setSalesFilter] = useState("all"); // "all" | "standard" | "manual"

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [dashRes, purchRes] = await Promise.all([
          axiosInstance.get("/dashboard/summary"),
          axiosInstance.get("/purchases")
        ]);
        setReportData(dashRes.data.reports);
        setPurchaseData(purchRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to compile reports data from the server.");
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  // Aggregate Purchase GST locally
  const getPurchaseGstSummary = () => {
    let totalTaxable = 0;
    let totalGst = 0;
    const rateMap = {};

    purchaseData.forEach(p => {
      if (!p.supplierGst || p.supplierGst.trim() === "") return;
      if (!p.items) return;
      p.items.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.qty) || 0;
        const rate = parseFloat(item.gstRate) || 0;

        const itemSubtotal = price * qty;
        const itemGst = (itemSubtotal * rate) / 100;

        totalTaxable += itemSubtotal;
        totalGst += itemGst;

        const rateKey = `${rate}%`;
        if (!rateMap[rateKey]) {
          rateMap[rateKey] = { rate: rateKey, taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0 };
        }
        rateMap[rateKey].taxableValue += itemSubtotal;
        rateMap[rateKey].cgst += itemGst / 2;
        rateMap[rateKey].sgst += itemGst / 2;
        rateMap[rateKey].totalTax += itemGst;
      });
    });

    return {
      summary: {
        totalTaxable,
        totalCgst: totalGst / 2,
        totalSgst: totalGst / 2,
        totalTax: totalGst
      },
      ratesBreakdown: Object.values(rateMap)
    };
  };

  const purchaseGstReport = getPurchaseGstSummary();

  const handleExportCAReconciliation = () => {
    const headers = ["Type", "Tax Slab", "Taxable Base Value", "CGST Amount", "SGST Amount", "Total GST Value"];
    const rows = [headers.join(",")];

    if (!reportData?.gstReport) return alert("GST report data is currently unavailable");
    rows.push('"--- OUTWARD SALES GST ---",,,,,');
    (reportData.gstReport.ratesBreakdown || []).forEach(row => {
      rows.push(`"Sales GST",${row.rate},${(row.taxableValue || 0).toFixed(2)},${(row.cgst || 0).toFixed(2)},${(row.sgst || 0).toFixed(2)},${(row.totalTax || 0).toFixed(2)}`);
    });
    const salesSum = reportData.gstReport.summary || { totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalTax: 0 };
    rows.push(`"Sales Total Sum",,${(salesSum.totalTaxable || 0).toFixed(2)},${(salesSum.totalCgst || 0).toFixed(2)},${(salesSum.totalSgst || 0).toFixed(2)},${(salesSum.totalTax || 0).toFixed(2)}`);

    rows.push('"--- INWARD PURCHASE GST (ITC) ---",,,,,');
    (purchaseGstReport.ratesBreakdown || []).forEach(row => {
      rows.push(`"Purchase GST (ITC)",${row.rate},${(row.taxableValue || 0).toFixed(2)},${(row.cgst || 0).toFixed(2)},${(row.sgst || 0).toFixed(2)},${(row.totalTax || 0).toFixed(2)}`);
    });
    const purchSum = purchaseGstReport.summary || { totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalTax: 0 };
    rows.push(`"Purchase Total Sum",,${(purchSum.totalTaxable || 0).toFixed(2)},${(purchSum.totalCgst || 0).toFixed(2)},${(purchSum.totalSgst || 0).toFixed(2)},${(purchSum.totalTax || 0).toFixed(2)}`);

    rows.push('"--- NET TAX RECONCILIATION ---",,,,,');
    const netTaxable = (salesSum.totalTaxable || 0) - (purchSum.totalTaxable || 0);
    const netCgst = (salesSum.totalCgst || 0) - (purchSum.totalCgst || 0);
    const netSgst = (salesSum.totalSgst || 0) - (purchSum.totalSgst || 0);
    const netTotal = (salesSum.totalTax || 0) - (purchSum.totalTax || 0);
    rows.push(`"Net Liability (Sales - ITC)",,${netTaxable.toFixed(2)},${netCgst.toFixed(2)},${netSgst.toFixed(2)},${netTotal.toFixed(2)}`);

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gst_ca_reconciliation_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = (data, headers, filename) => {
    if (!data || data.length === 0) return alert("No data available to export");
    
    // Construct CSV rows
    const csvRows = [headers.join(",")];
    
    data.forEach(item => {
      const values = Object.values(item).map(val => {
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      });
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingOverlay message="Compiling financial logs..." />;
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
    <div className="w-full space-y-6 text-slate-100 print:bg-white print:text-black print:border-none print:p-0 print:m-0">
      
      {/* SCREEN HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Business Reports &amp; Analytics</h2>
          <p className="text-slate-400 text-sm mt-1">Audit daily velocity, product movements, tax collections, and customer insights.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow transition-all duration-150"
          >
            <FaPrint /> Print Report
          </button>
        </div>
      </div>

      {/* REPORT SELECTOR TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-900 pb-3 mb-6 print:hidden">
        {[
          { id: "sales", label: "Sales Velocity", icon: FaChartBar },
          { id: "products", label: "Product Performance", icon: FaBoxes },
          { id: "customers", label: "Customer Rankings", icon: FaUserFriends },
          { id: "gst", label: "GST Summary Reports", icon: FaPercent },
          { id: "creditOutstanding", label: "Credit & Debtors", icon: FaUserFriends },
          { id: "collections", label: "Payments Collected", icon: FaFileCsv },
          { id: "returns", label: "Returns & Exchanges", icon: FaBoxes },
          { id: "damagedStock", label: "Damaged Stock", icon: FaBoxes },
          { id: "detailedSales", label: "Multi-Price Sales Log", icon: FaFileCsv },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-150
                ${isActive 
                  ? "bg-orange-500 text-white border-transparent shadow shadow-orange-500/10" 
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }
              `}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE TAB REPORT CONTAINER */}
      <div className="bg-slate-900/20 border border-slate-900/60 rounded-2xl p-6 space-y-6 shadow-xl print:border-none print:p-0">
        
        {/* T1: SALES REPORT */}
        {activeTab === "sales" && reportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Daily Sales log (Last 30 Days)</h3>
              <button
                onClick={() => exportToCSV(reportData.dailySales, ["Date", "Sales Total", "Invoices Count"], "daily_sales_report")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
              >
                <FaFileCsv /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Sales Date</th>
                    <th className="py-2.5 px-2 text-center">Transactions Issued</th>
                    <th className="py-2.5 px-4 text-right">Gross Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.dailySales.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-4 font-mono">{row.date}</td>
                      <td className="py-3 px-2 text-center">{row.count}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">₹{row.sales.toFixed(2)}</td>
                    </tr>
                  ))}
                  {reportData.dailySales.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-500">No daily logs compiled yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Monthly log */}
            <div className="pt-6 border-t border-slate-900/60">
              <div className="flex justify-between items-center print:hidden mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Monthly Sales aggregates</h3>
                <button
                  onClick={() => exportToCSV(reportData.monthlySales, ["Month", "Sales Total", "Invoices Count"], "monthly_sales_report")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
                >
                  <FaFileCsv /> Export to Excel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Sales Month</th>
                      <th className="py-2.5 px-2 text-center">Invoices Count</th>
                      <th className="py-2.5 px-4 text-right">Gross Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40 text-slate-350">
                    {reportData.monthlySales.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold">{row.month}</td>
                        <td className="py-3 px-2 text-center">{row.count}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-100">₹{row.sales.toFixed(2)}</td>
                      </tr>
                    ))}
                    {reportData.monthlySales.length === 0 && (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-slate-500">No monthly logs compiled yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* T2: PRODUCTS PERFORMANCE */}
        {activeTab === "products" && reportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Product Performance Audit</h3>
              <button
                onClick={() => exportToCSV(reportData.productReport, ["Product Name", "SKU", "Units Sold", "Total Revenue"], "product_performance_report")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
              >
                <FaFileCsv /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">SKU / Code</th>
                    <th className="py-2.5 px-2">Item Name</th>
                    <th className="py-2.5 px-2 text-center">Quantities Sold</th>
                    <th className="py-2.5 px-4 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.productReport.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-450">{row.sku}</td>
                      <td className="py-3 px-2 font-semibold text-slate-100 notranslate" translate="no">{row.name}</td>
                      <td className="py-3 px-2 text-center font-bold text-orange-400">{row.qty}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-100">₹{row.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {reportData.productReport.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">No product sales logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* T3: CUSTOMER RANKINGS */}
        {activeTab === "customers" && reportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Customer Rankings</h3>
              <button
                onClick={() => exportToCSV(reportData.customerReport, ["Customer Name", "Phone", "Total Purchases", "Orders Count"], "customer_ranking_report")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
              >
                <FaFileCsv /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-2">Phone Number</th>
                    <th className="py-2.5 px-2 text-center">Bills Incurred</th>
                    <th className="py-2.5 px-4 text-right">Cumulative Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.customerReport.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-100">{row.name}</td>
                      <td className="py-3 px-2 font-mono text-slate-400">{row.phone}</td>
                      <td className="py-3 px-2 text-center">{row.ordersCount}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-450">₹{row.totalSpent.toFixed(2)}</td>
                    </tr>
                  ))}
                  {reportData.customerReport.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">No client profiles generated from transactions.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* T4: GST SUMMARY & CA RECONCILIATION */}
        {activeTab === "gst" && reportData && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-900 pb-3 print:hidden">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">GST Tax Audit &amp; CA Reconciliation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Compare outward tax collections against inward tax inputs (ITC) to calculate tax liabilities.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToCSV(reportData.gstReport.ratesBreakdown, ["Tax Bracket", "Taxable Value", "CGST Amount", "SGST Amount", "Total Tax"], "gst_sales_breakdown_report")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold"
                >
                  <FaFileCsv /> Export Sales GST
                </button>
                <button
                  onClick={handleExportCAReconciliation}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-500/10"
                >
                  <FaFileCsv /> Export CA Ledger
                </button>
              </div>
            </div>

            {/* Reconciliation summary card */}
            {(() => {
              const salesTax = reportData.gstReport.summary.totalTax;
              const purchTax = purchaseGstReport.summary.totalTax;
              const netTaxDue = salesTax - purchTax;
              const isItcExcess = netTaxDue < 0;

              return (
                <div className={`p-5 rounded-2xl border text-xs md:text-sm font-mono space-y-4
                  ${isItcExcess 
                    ? "bg-emerald-500/5 border-emerald-500/25" 
                    : "bg-orange-500/5 border-orange-500/25"
                  }
                `}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className={`text-xs uppercase font-extrabold tracking-wider
                        ${isItcExcess ? "text-emerald-400" : "text-orange-400"}
                      `}>
                        GST Tax Reconciliation Status
                      </h4>
                      <p className="text-slate-400 text-[10px] mt-0.5 font-sans leading-relaxed">
                        {isItcExcess 
                          ? "Your supplier purchases (Input Tax Credit) exceed your sales tax collections. You have surplus credit to carry forward."
                          : "Your sales tax collections exceed your supplier purchase inputs. This is the estimated tax payable amount for the period."
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {isItcExcess ? "Excess ITC Carry-Forward" : "Net GST Tax Payable"}
                      </span>
                      <p className={`text-xl font-black mt-0.5
                        ${isItcExcess ? "text-emerald-400" : "text-orange-500"}
                      `}>
                        ₹{Math.abs(netTaxDue).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-900 text-center">
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase">Net Taxable Value</span>
                      <p className="text-xs font-bold text-slate-200 mt-0.5">
                        ₹{(reportData.gstReport.summary.totalTaxable - purchaseGstReport.summary.totalTaxable).toFixed(2)}
                      </p>
                    </div>
                    <div className="border-l border-slate-900">
                      <span className="text-slate-500 text-[9px] uppercase">Net CGST</span>
                      <p className="text-xs font-bold text-slate-200 mt-0.5">
                        ₹{(reportData.gstReport.summary.totalCgst - purchaseGstReport.summary.totalCgst).toFixed(2)}
                      </p>
                    </div>
                    <div className="border-l border-slate-900">
                      <span className="text-slate-500 text-[9px] uppercase">Net SGST</span>
                      <p className="text-xs font-bold text-slate-200 mt-0.5">
                        ₹{(reportData.gstReport.summary.totalSgst - purchaseGstReport.summary.totalSgst).toFixed(2)}
                      </p>
                    </div>
                    <div className="border-l border-slate-900">
                      <span className="text-slate-500 text-[9px] uppercase">Net GST Variance</span>
                      <p className={`text-xs font-bold mt-0.5 ${netTaxDue >= 0 ? "text-orange-400" : "text-emerald-400"}`}>
                        ₹{netTaxDue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Sales GST Summary vs Purchase GST Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Sales GST card */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider border-b border-slate-900 pb-2 flex justify-between">
                  <span>1. Sales Tax Collected (Outward)</span>
                  <span className="text-slate-400 font-bold font-mono">₹{reportData.gstReport.summary.totalTax.toFixed(2)}</span>
                </h4>
                
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-950/30 rounded border border-slate-900/50">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase">Taxable Sales</span>
                    <p className="font-bold text-slate-200 mt-0.5">₹{reportData.gstReport.summary.totalTaxable.toFixed(2)}</p>
                  </div>
                  <div className="border-l border-slate-900/80">
                    <span className="text-[9px] text-slate-500 uppercase">CGST Collected</span>
                    <p className="font-bold text-slate-350 mt-0.5">₹{reportData.gstReport.summary.totalCgst.toFixed(2)}</p>
                  </div>
                  <div className="border-l border-slate-900/80">
                    <span className="text-[9px] text-slate-500 uppercase">SGST Collected</span>
                    <p className="font-bold text-slate-350 mt-0.5">₹{reportData.gstReport.summary.totalSgst.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-[10px] uppercase font-bold text-slate-500">Sales Rate Breakdown</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 uppercase text-[9px] font-bold">
                          <th className="pb-1.5">Slab</th>
                          <th className="pb-1.5 text-right">Taxable</th>
                          <th className="pb-1.5 text-right">CGST</th>
                          <th className="pb-1.5 text-right">SGST</th>
                          <th className="pb-1.5 text-right">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/30 text-slate-350 font-mono">
                        {reportData.gstReport.ratesBreakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-950/10">
                            <td className="py-2 text-slate-100 font-bold">{row.rate}</td>
                            <td className="py-2 text-right">₹{row.taxableValue.toFixed(2)}</td>
                            <td className="py-2 text-right text-slate-400">₹{row.cgst.toFixed(2)}</td>
                            <td className="py-2 text-right text-slate-400">₹{row.sgst.toFixed(2)}</td>
                            <td className="py-2 text-right text-orange-400 font-bold">₹{row.totalTax.toFixed(2)}</td>
                          </tr>
                        ))}
                        {reportData.gstReport.ratesBreakdown.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-4 text-center text-slate-500 font-sans">No sales GST transactions logged.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Purchase GST card */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider border-b border-slate-900 pb-2 flex justify-between">
                  <span>2. Purchases Tax Paid (Inward ITC)</span>
                  <span className="text-slate-400 font-bold font-mono">₹{purchaseGstReport.summary.totalTax.toFixed(2)}</span>
                </h4>
                
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-950/30 rounded border border-slate-900/50">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase">Taxable Purchases</span>
                    <p className="font-bold text-slate-200 mt-0.5">₹{purchaseGstReport.summary.totalTaxable.toFixed(2)}</p>
                  </div>
                  <div className="border-l border-slate-900/80">
                    <span className="text-[9px] text-slate-500 uppercase">CGST Paid</span>
                    <p className="font-bold text-slate-350 mt-0.5">₹{purchaseGstReport.summary.totalCgst.toFixed(2)}</p>
                  </div>
                  <div className="border-l border-slate-900/80">
                    <span className="text-[9px] text-slate-500 uppercase">SGST Paid</span>
                    <p className="font-bold text-slate-350 mt-0.5">₹{purchaseGstReport.summary.totalSgst.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-[10px] uppercase font-bold text-slate-500">Purchases Rate Breakdown</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 uppercase text-[9px] font-bold">
                          <th className="pb-1.5">Slab</th>
                          <th className="pb-1.5 text-right">Taxable</th>
                          <th className="pb-1.5 text-right">CGST</th>
                          <th className="pb-1.5 text-right">SGST</th>
                          <th className="pb-1.5 text-right">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/30 text-slate-350 font-mono">
                        {purchaseGstReport.ratesBreakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-950/10">
                            <td className="py-2 text-slate-100 font-bold">{row.rate}</td>
                            <td className="py-2 text-right">₹{row.taxableValue.toFixed(2)}</td>
                            <td className="py-2 text-right text-slate-400">₹{row.cgst.toFixed(2)}</td>
                            <td className="py-2 text-right text-slate-400">₹{row.sgst.toFixed(2)}</td>
                            <td className="py-2 text-right text-emerald-450 font-bold">₹{row.totalTax.toFixed(2)}</td>
                          </tr>
                        ))}
                        {purchaseGstReport.ratesBreakdown.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-4 text-center text-slate-500 font-sans">No supplier purchase inputs logged.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* T5: DETAILED MULTI-PRICE SALES LOG */}
        {activeTab === "detailedSales" && reportData && reportData.salesDetailsReport && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Multi-Price Sales &amp; Profit Log</h3>
                <p className="text-xs text-slate-500 mt-0.5">View and export exact sales details by transaction line</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={salesFilter}
                  onChange={(e) => setSalesFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All Sales Items</option>
                  <option value="standard">Catalog Products Only</option>
                  <option value="manual">Custom/Manual Items Only</option>
                </select>
                <button
                  onClick={() => exportToCSV(
                    reportData.salesDetailsReport.filter(row => {
                      if (salesFilter === "manual") return row.isManualItem === true;
                      if (salesFilter === "standard") return !row.isManualItem;
                      return true;
                    }), 
                    ["Customer Name", "Customer Type", "Product Name", "SKU", "Price Category Used", "Selling Price Used", "Quantity", "Total Amount", "Profit", "Date"], 
                    "multiprice_sales_profit_report"
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
                >
                  <FaFileCsv /> Export to Excel
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-2">Customer Details</th>
                    <th className="py-2.5 px-2">Item Name</th>
                    <th className="py-2.5 px-2">Price Tier Used</th>
                    <th className="py-2.5 px-2 text-right">Selling Price</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-2 text-right">Subtotal</th>
                    <th className="py-2.5 px-4 text-right">Profit Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.salesDetailsReport
                    .filter(row => {
                      if (salesFilter === "manual") return row.isManualItem === true;
                      if (salesFilter === "standard") return !row.isManualItem;
                      return true;
                    })
                    .map((row, idx) => {
                      const rowDate = row.date ? new Date(row.date).toLocaleDateString("en-IN") : "N/A";
                      return (
                        <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                          <td className="py-3 px-4 font-mono">{rowDate}</td>
                          <td className="py-3 px-2">
                            <div className="font-semibold text-slate-200">{row.customerName}</div>
                            <div className="text-[10px] text-slate-500">{row.customerType}</div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="font-semibold text-slate-200 notranslate flex items-center gap-1.5" translate="no">
                              {row.productName}
                              {row.isManualItem && (
                                <span className="px-1.5 py-0.2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-[8px] font-black uppercase">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">{row.sku}</div>
                          </td>
                          <td className="py-3 px-2 capitalize">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold
                              ${row.priceCategoryUsed === "manual" 
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/10" 
                                : "bg-slate-800 text-slate-400"
                              }
                            `}>
                              {row.priceCategoryUsed}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-slate-100">₹{row.sellingPriceUsed.toFixed(2)}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-100">{row.qty}</td>
                          <td className="py-3 px-2 text-right font-mono font-semibold text-slate-200">₹{row.totalAmount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-450">
                            {row.profit >= 0 ? `₹${row.profit.toFixed(2)}` : `-₹${Math.abs(row.profit).toFixed(2)}`}
                          </td>
                        </tr>
                      );
                    })}
                  {reportData.salesDetailsReport.filter(row => {
                    if (salesFilter === "manual") return row.isManualItem === true;
                    if (salesFilter === "standard") return !row.isManualItem;
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500">No sales details found matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* T6: CREDIT & DEBTORS REPORT */}
        {activeTab === "creditOutstanding" && reportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Credit Debtors List</h3>
              <button
                onClick={() => {
                  const mapped = reportData.creditCustomers.map(c => ({ name: c.name, phone: c.phone, type: c.customerType, balance: c.outstandingBalance }));
                  exportToCSV(mapped, ["Customer Name", "Phone", "Customer Type", "Outstanding Balance"], "credit_debtors_report");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
              >
                <FaFileCsv /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-2">Phone</th>
                    <th className="py-2.5 px-2">Customer Type</th>
                    <th className="py-2.5 px-4 text-right">Outstanding Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.creditCustomers.map((cust) => (
                    <tr key={cust._id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-100">{cust.name}</td>
                      <td className="py-3 px-2 font-mono text-slate-400">{cust.phone}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                          {cust.customerType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-450 font-mono">₹{cust.outstandingBalance.toFixed(2)}</td>
                    </tr>
                  ))}
                  {reportData.creditCustomers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">No customers currently hold outstanding balances.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* T7: PAYMENTS COLLECTED REPORT */}
        {activeTab === "collections" && reportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Credit Collections Postings</h3>
              <button
                onClick={() => {
                  const mapped = reportData.paymentsCollected.map(p => ({
                    date: new Date(p.date).toLocaleDateString("en-IN"),
                    customer: p.customerId?.name || "Deleted",
                    phone: p.customerId?.phone || "N/A",
                    method: p.paymentMethod,
                    amount: p.credit,
                    notes: p.notes || ""
                  }));
                  exportToCSV(mapped, ["Date", "Customer Name", "Customer Phone", "Payment Method", "Amount Collected", "Notes"], "collections_log_report");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
              >
                <FaFileCsv /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Receipt Date</th>
                    <th className="py-2.5 px-2">Customer Details</th>
                    <th className="py-2.5 px-2">Ref Method</th>
                    <th className="py-2.5 px-2">Description / Comments</th>
                    <th className="py-2.5 px-4 text-right">Amount post</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.paymentsCollected.map((payment) => {
                    const payDate = payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : "N/A";
                    return (
                      <tr key={payment._id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-4 font-mono">{payDate}</td>
                        <td className="py-3 px-2">
                          <div className="font-semibold text-slate-200">{payment.customerId?.name || "Walk-in"}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{payment.customerId?.phone || "N/A"}</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-bold uppercase">
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div>{payment.description}</div>
                          {payment.notes && <div className="text-[10px] font-serif text-slate-500 italic mt-0.5">Note: {payment.notes}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-450 font-mono">₹{payment.credit.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {reportData.paymentsCollected.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">No payment collections recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* T8: RETURNS & EXCHANGES REPORT */}
        {activeTab === "returns" && reportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sales Returns Log</h3>
              <button
                onClick={() => {
                  const mapped = reportData.salesReturns.map(r => ({
                    date: new Date(r.date).toLocaleDateString("en-IN"),
                    invoice: r.invoiceId,
                    customer: r.customerName,
                    phone: r.customerPhone,
                    total: r.total
                  }));
                  exportToCSV(mapped, ["Return Date", "Invoice ID", "Customer Name", "Customer Phone", "Invoice Net Total"], "sales_returns_report");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
              >
                <FaFileCsv /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Return Date</th>
                    <th className="py-2.5 px-2">Invoice ID</th>
                    <th className="py-2.5 px-2">Customer Details</th>
                    <th className="py-2.5 px-2">Adjusted Items Details</th>
                    <th className="py-2.5 px-4 text-right">Net Bill Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.salesReturns.map((invoice) => {
                    const retDate = invoice.date ? new Date(invoice.date).toLocaleDateString("en-IN") : "N/A";
                    return (
                      <tr key={invoice._id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-4 font-mono">{retDate}</td>
                        <td className="py-3 px-2 font-mono font-bold text-slate-100">{invoice.invoiceId}</td>
                        <td className="py-3 px-2">
                          <div className="font-semibold text-slate-200">{invoice.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{invoice.customerPhone}</div>
                        </td>
                        <td className="py-3 px-2 space-y-1">
                          {invoice.items.filter(i => i.returnedQty > 0).map((item, idx) => (
                            <div key={idx} className="text-[10px] text-rose-300">
                              - {item.name} (Qty Returned: <span className="font-bold">{item.returnedQty}</span>)
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-100 font-mono">₹{invoice.total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {reportData.salesReturns.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">No sales return transactions logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* T9: DAMAGED STOCK REPORT */}
        {activeTab === "damagedStock" && reportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Damaged Inventory Audit</h3>
              <button
                onClick={() => {
                  const mapped = reportData.damagedStock.map(d => ({
                    date: new Date(d.date).toLocaleDateString("en-IN"),
                    sku: d.productId?.sku || "MANUAL",
                    name: d.productId?.name || d.productName || "N/A",
                    qty: d.qty,
                    reason: d.reason || ""
                  }));
                  exportToCSV(mapped, ["Logged Date", "Product SKU", "Product Name", "Damaged Quantity", "Reason"], "damaged_stock_report");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-semibold"
              >
                <FaFileCsv /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Log Date</th>
                    <th className="py-2.5 px-2">SKU / Code</th>
                    <th className="py-2.5 px-2">Product Name</th>
                    <th className="py-2.5 px-2 text-center">Defective Qty</th>
                    <th className="py-2.5 px-4">Comments / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-350">
                  {reportData.damagedStock.map((item) => {
                    const logDate = item.date ? new Date(item.date).toLocaleDateString("en-IN") : "N/A";
                    return (
                      <tr key={item._id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-4 font-mono">{logDate}</td>
                        <td className="py-3 px-2 font-mono font-semibold text-slate-100">{item.productId?.sku || "MANUAL"}</td>
                        <td className="py-3 px-2 font-medium text-slate-205">{item.productId?.name || item.productName || "N/A"}</td>
                        <td className="py-3 px-2 text-center font-bold text-rose-455 font-mono">{item.qty} units</td>
                        <td className="py-3 px-4 text-slate-400 italic">{item.reason || "Defective return exchange"}</td>
                      </tr>
                    );
                  })}
                  {reportData.damagedStock.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">No products logged in damaged stock directory.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Reports;
