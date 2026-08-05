import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGovDashboard } from "../govFundSlice";
import {
  FaLandmark,
  FaShoppingBag,
  FaMoneyBillWave,
  FaWallet,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaPlusCircle,
  FaFileAlt,
  FaHistory,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovDashboard = () => {
  const dispatch = useDispatch();
  const { dashboard, loading } = useSelector((state) => state.govFunds);

  useEffect(() => {
    dispatch(fetchGovDashboard());
  }, [dispatch]);

  const cards = dashboard?.cards || {
    totalGrantAmount: 0,
    totalMaterialPurchases: 0,
    totalCashGiven: 0,
    remainingBalance: 0,
    activeGrantsCount: 0,
    completedGrantsCount: 0,
    pendingOrders: 0,
  };

  const alerts = dashboard?.alerts || {
    lowBalance: [],
    pendingSettlement: [],
    inactiveGrants: [],
  };

  const recentTxs = dashboard?.recentTransactions || [];

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Loading Government Funds Dashboard..." />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <FaLandmark className="text-amber-500" />
            Government School Fund Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of grants received into bank account, teacher material purchases, cash withdrawals, and settlement ledgers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/gov-funds/grants"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
          >
            <FaPlusCircle /> Add New Grant
          </Link>
          <Link
            to="/gov-funds/cash-payments"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow"
          >
            <FaMoneyBillWave /> Record Cash Payment
          </Link>
          <Link
            to="/gov-funds/settlement"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
          >
            <FaCheckCircle /> Grant Settlement
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Grant Sanctioned */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Grant Amount</span>
            <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <FaLandmark className="text-lg" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 mt-3">
            ₹{cards.totalGrantAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <span>{cards.activeGrantsCount} Active Grants</span> • <span>{cards.completedGrantsCount} Closed</span>
          </div>
        </div>

        {/* Card 2: Material Purchases */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Material Purchases</span>
            <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <FaShoppingBag className="text-lg" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-400 mt-3">
            ₹{cards.totalMaterialPurchases?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">Total spent via POS Invoices</p>
        </div>

        {/* Card 3: Cash Given to Teachers */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Cash Given</span>
            <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
              <FaMoneyBillWave className="text-lg" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-400 mt-3">
            ₹{cards.totalCashGiven?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">Direct cash withdrawals by teachers</p>
        </div>

        {/* Card 4: Remaining Balance */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Balance</span>
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <FaWallet className="text-lg" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-3">
            ₹{cards.remainingBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-[11px] text-emerald-400 font-semibold">Available for settlement & purchases</p>
        </div>
      </div>

      {/* Notifications & Actionable Alerts Section */}
      {(alerts.lowBalance.length > 0 || alerts.pendingSettlement.length > 0 || alerts.inactiveGrants.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <FaExclamationTriangle className="text-amber-500" />
            Active Notifications & Fund Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Low Balance Alert */}
            {alerts.lowBalance.map((item, idx) => (
              <div key={idx} className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-lg flex items-start gap-3">
                <FaExclamationTriangle className="text-amber-400 text-lg mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Grant Balance Running Low</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    <strong>{item.grantName}</strong> ({item.schoolName}) has only ₹{item.remainingBalance?.toFixed(2)} remaining.
                  </p>
                </div>
              </div>
            ))}

            {/* Inactive Grant Alert */}
            {alerts.inactiveGrants.map((item, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-700 p-3 rounded-lg flex items-start gap-3">
                <FaClock className="text-blue-400 text-lg mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Inactive Grant Alert</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <strong>{item.grantName}</strong> ({item.schoolName}) has no purchase activity over the last 30 days.
                  </p>
                </div>
              </div>
            ))}

            {/* Pending Settlement Alert */}
            {alerts.pendingSettlement.map((item, idx) => (
              <div key={idx} className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-lg flex items-start gap-3">
                <FaCheckCircle className="text-emerald-400 text-lg mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">Pending Settlement</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    <strong>{item.grantName}</strong> ({item.schoolName}) balance: ₹{item.unspentBalance?.toFixed(2)}. Prepare for settlement.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grant Breakdowns & Recent Bank Statement Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Grants Overview */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FaLandmark className="text-amber-400" /> Active Grants Summary
            </h3>
            <Link to="/gov-funds/grants" className="text-xs text-amber-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {dashboard?.grantsDetail?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No active government grants found.</p>
            ) : (
              dashboard?.grantsDetail?.map((g) => {
                const total = g.totalGrantAmount || 1;
                const spent = (g.materialsPurchased || 0) + (g.cashGiven || 0);
                const pct = Math.min(100, Math.round((spent / total) * 100));

                return (
                  <div key={g._id} className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{g.grantName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          g.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{g.schoolId?.schoolName || "N/A"} • AY {g.academicYear}</p>
                    
                    {/* Utilization Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Spent: ₹{spent.toLocaleString()}</span>
                        <span>Bal: ₹{(g.remainingBalance || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bank-Statement Recent Transactions */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FaHistory className="text-amber-400" /> Recent Bank Ledger Transactions
            </h3>
            <Link to="/gov-funds/transactions" className="text-xs text-amber-400 hover:underline">
              View Full Statement
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">School & Grant</th>
                  <th className="p-2.5">Teacher</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentTxs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-500">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentTxs.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === "Grant Received"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : tx.type === "Material Purchase"
                              ? "bg-blue-500/20 text-blue-400"
                              : tx.type === "Cash Given"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-200">{tx.schoolId?.schoolName || "N/A"}</div>
                        <div className="text-[10px] text-slate-400">{tx.grantId?.grantName || "N/A"}</div>
                      </td>
                      <td className="p-2.5">{tx.teacherId?.teacherName || "—"}</td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          tx.type === "Grant Received" || tx.type === "Refund"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {tx.type === "Grant Received" || tx.type === "Refund" ? "+" : "-"}₹
                        {tx.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovDashboard;
