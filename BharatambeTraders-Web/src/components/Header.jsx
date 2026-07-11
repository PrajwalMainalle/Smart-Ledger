import { useState, useEffect, useRef } from "react";
import { HiOutlineMenu } from "react-icons/hi";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import defaultLogo from "../assets/SLLogo.png";
import { useTheme } from "./ThemeContext";
import { FaSun, FaMoon, FaClock, FaBell } from "react-icons/fa";
import axiosInstance from "../app/api/axiosInstance";

const Headers = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { themeMode, theme, selectThemeMode } = useTheme();

  const [reminders, setReminders] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchReminders = async () => {
    try {
      const response = await axiosInstance.get("/billing/credit-reminders");
      setReminders(response.data);
    } catch (error) {
      console.error("Failed to fetch credit reminders", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReminders();
      // Poll every 5 minutes
      const interval = setInterval(fetchReminders, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageName = () => {
    const path = location.pathname.split("/").filter(Boolean);
    if (path.length === 0) return "Billing Portal";
    const segment = path[path.length - 1];
    if (segment === "home") return "Sales Dashboard";
    if (segment === "pos") return "Billing Terminal (POS)";
    if (segment === "invoices") return "Invoice History";
    if (segment === "inventory") return "Inventory & Products";
    if (segment === "reports") return "Reports & Business Auditing";
    if (segment === "settings") return "Settings & Profile";
    return segment.replace(/^\w/, (c) => c.toUpperCase());
  };

  const shopName = user?.profile?.shopName || user?.businessName || "SmartLedger";
  const logoSrc = user?.profile?.logo || defaultLogo;
  const ownerName = user?.ownerName || "Merchant Owner";

  return (
    <header className="flex items-center justify-between 
        bg-slate-900 border-b border-slate-800
        shadow px-6 h-16 text-slate-100 z-35">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded hover:bg-slate-800 text-slate-100"
        >
          <HiOutlineMenu size={22} />
        </button>
        <h1 className="text-sm md:text-base font-semibold tracking-wide text-slate-100">{getPageName()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Cycle Button */}
        <button
          onClick={() => {
            const nextModes = { auto: "light", light: "dark", dark: "auto" };
            selectThemeMode(nextModes[themeMode]);
          }}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/50 hover:border-slate-600 transition flex items-center gap-1.5 shadow-sm"
          title={`Theme: ${themeMode === "auto" ? "Auto (Time-based)" : themeMode.toUpperCase()}`}
        >
          {themeMode === "auto" && (
            <>
              <FaClock className="text-orange-400 text-sm animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 hidden md:inline">AUTO</span>
            </>
          )}
          {themeMode === "light" && (
            <>
              <FaSun className="text-amber-500 text-sm" />
              <span className="text-[10px] font-bold text-slate-400 hidden md:inline">LIGHT</span>
            </>
          )}
          {themeMode === "dark" && (
            <>
              <FaMoon className="text-indigo-400 text-sm" />
              <span className="text-[10px] font-bold text-slate-400 hidden md:inline">DARK</span>
            </>
          )}
        </button>

        {/* Notifications (Overdue Credits) Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/50 hover:border-slate-600 transition flex items-center justify-center shadow-sm relative"
            title="Notifications"
          >
            <FaBell className={`text-sm ${reminders.length > 0 ? "text-orange-400" : "text-slate-400"}`} />
            {reminders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black animate-bounce shadow">
                {reminders.length}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">Credit Reminders</span>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                  {reminders.length} Overdue
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/40">
                {reminders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <FaBell className="text-lg text-slate-700" />
                    <span>No overdue credit reminders (20+ days).</span>
                  </div>
                ) : (
                  reminders.map((rem) => (
                    <div
                      key={rem._id}
                      className="p-3 hover:bg-slate-850/50 transition cursor-pointer"
                      onClick={() => {
                        setShowDropdown(false);
                        navigate("/invoices", { state: { searchInvoiceId: rem.invoiceId } });
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-100 hover:text-orange-400 transition">{rem.customerName}</span>
                        <span className="text-xs font-black text-rose-450">
                          ₹{rem.outstandingAmount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Phone: {rem.customerPhone}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] bg-slate-800 text-slate-350 px-1.5 py-0.5 rounded font-mono border border-slate-700/50">
                          {rem.invoiceId}
                        </span>
                        <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded font-bold">
                          {rem.daysElapsed} days overdue
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div
                className="px-4 py-2.5 bg-slate-850 border-t border-slate-800 text-center text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/invoices");
                }}
              >
                View All Invoices
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex flex-col text-right">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Merchant Portal</span>
          <span className="text-xs font-semibold text-orange-400">{ownerName}</span>
        </div>
        <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-850 flex items-center justify-center border border-slate-800 overflow-hidden">
            <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-xs text-slate-200 hidden sm:block truncate max-w-[120px]" title={shopName}>
            {shopName}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Headers;
