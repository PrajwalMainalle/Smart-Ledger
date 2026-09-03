import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaCalculator, 
  FaUserPlus, 
  FaBox, 
  FaFileInvoiceDollar, 
  FaClipboardList, 
  FaPercent, 
  FaTimes 
} from "react-icons/fa";

const QuickActionModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const actions = [
    {
      title: "New POS Bill",
      subtitle: "Instant cash / credit sale bill",
      icon: FaCalculator,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
      path: "/pos",
    },
    {
      title: "Add Customer",
      subtitle: "Register buyer / party details",
      icon: FaUserPlus,
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
      path: "/customers?action=add",
    },
    {
      title: "Add Inventory Stock",
      subtitle: "Add product prices & stock",
      icon: FaBox,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
      path: "/inventory",
    },
    {
      title: "New Quotation",
      subtitle: "Generate price estimate",
      icon: FaFileInvoiceDollar,
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
      path: "/quotations",
    },
    {
      title: "Request Book",
      subtitle: "Record customer demand",
      icon: FaClipboardList,
      color: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
      path: "/request-book",
    },
    {
      title: "GST Suite",
      subtitle: "Tax variance & CA summary",
      icon: FaPercent,
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
      path: "/gst/dashboard",
    },
  ];

  const handleActionClick = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click area */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 overflow-hidden z-10 animate-in slide-in-from-bottom duration-250">
        
        {/* Top Handle bar for mobile drag feeling */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden opacity-60" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">Quick Actions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select an operation to start immediately</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          {actions.map((act, index) => {
            const Icon = act.icon;
            return (
              <button
                key={index}
                onClick={() => handleActionClick(act.path)}
                className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all text-left group ${act.color}`}
              >
                <div className="p-2.5 rounded-xl bg-slate-900/80 mb-2.5 group-hover:scale-110 transition-transform">
                  <Icon size={20} />
                </div>
                <span className="text-xs font-bold text-slate-100">{act.title}</span>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{act.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500">Bharatambe Traders Mobile Quick Suite</p>
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;
