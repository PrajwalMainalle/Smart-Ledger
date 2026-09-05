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
  const [requestStats, setRequestStats] = useState({ pendingRequests: 0, readyRequests: 0, outOfStockProducts: 0 });
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

  const triggerDailyReminder = (stats) => {
    const reminderEnabledSetting = localStorage.getItem("enable_11am_reminder") !== "false";
    if (!reminderEnabledSetting) return;

    const now = new Date();
    if (now.getHours() < 11) return;

    const todayStr = now.toDateString();
    const lastShown = localStorage.getItem("last_shown_daily_reminder");
    if (lastShown === todayStr) return;

    if (stats.pendingRequests === 0 && stats.readyRequests === 0 && stats.outOfStockProducts === 0) return;

    if ("Notification" in window && Notification.permission === "granted") {
      const currentShopName = user?.profile?.shopName || user?.businessName || "Smart Ledger";
      new Notification(`${currentShopName}: Daily Reminder`, {
        body: `Pending Requests: ${stats.pendingRequests} | Ready for Collection: ${stats.readyRequests} | Out of Stock Items: ${stats.outOfStockProducts}`,
        icon: defaultLogo,
      });
      localStorage.setItem("last_shown_daily_reminder", todayStr);
    }
  };

  const fetchRequestStats = async () => {
    try {
      const response = await axiosInstance.get("/requests/reminders");
      setRequestStats(response.data);
      triggerDailyReminder(response.data);
    } catch (error) {
      console.error("Failed to fetch request statistics", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReminders();
      fetchRequestStats();
      // Poll every 5 minutes
      const interval = setInterval(() => {
        fetchReminders();
        fetchRequestStats();
      }, 5 * 60 * 1000);
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
    const fullPath = location.pathname;
    if (fullPath === "/" || fullPath === "/home") return "Sales Dashboard";
    if (fullPath === "/pos" || fullPath === "/billing") return "Billing Terminal (POS)";
    if (fullPath === "/invoices") return "Invoice History";
    if (fullPath === "/inventory") return "Inventory & Products";
    if (fullPath === "/gov-schools") return "Government Schools";
    if (fullPath === "/request-book") return "Request Book";
    if (fullPath === "/purchases") return "Purchases & Stock In";
    if (fullPath === "/quotations") return "Quotations & Estimates";
    if (fullPath === "/customers") return "Customer Ledger";
    if (fullPath === "/reports") return "Reports & Business Auditing";
    if (fullPath === "/settings") return "Settings & Profile";
    if (fullPath.startsWith("/gst/dashboard")) return "GST Suite - Dashboard";
    if (fullPath.startsWith("/gst/sales")) return "GST Suite - Sales Summary";
    if (fullPath.startsWith("/gst/purchases")) return "GST Suite - Purchases Summary";
    if (fullPath.startsWith("/gst/summary")) return "GST Suite - Tax Variance";
    if (fullPath.startsWith("/gst/inventory")) return "GST Suite - Stock Split";
    if (fullPath.startsWith("/gst/ca-reports")) return "GST Suite - CA Reconciliation";
    
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || "";
    return lastSegment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const shopName = user?.profile?.shopName || user?.businessName || "Smart Ledger";
  const logoSrc = user?.profile?.logo || defaultLogo;
  const ownerName = user?.ownerName || "Merchant Owner";

  return (
    <header className="flex items-center justify-between 
        bg-slate-900 border-b border-slate-800 print:hidden
        shadow-sm px-3 md:px-6 h-16 text-slate-100 z-35">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl hover:bg-slate-800/60 text-slate-100 border border-slate-700/40 transition"
        >
          <HiOutlineMenu size={22} />
        </button>
        <h1 className="text-xs md:text-base font-bold tracking-wide text-slate-100 truncate max-w-[180px] sm:max-w-none">{getPageName()}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme Cycle Button */}
        <button
          onClick={() => {
            const nextModes = { auto: "light", light: "dark", dark: "auto" };
            selectThemeMode(nextModes[themeMode]);
          }}
          className="p-2 rounded-xl hover:bg-slate-800/60 text-slate-100 border border-transparent hover:border-slate-700/40 transition flex items-center gap-1.5"
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

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded-xl hover:bg-slate-800/60 text-slate-100 border border-transparent hover:border-slate-700/40 transition flex items-center justify-center relative"
            title="Notifications & Alerts"
          >
            <FaBell className={`text-sm ${
              (reminders.length > 0 || requestStats.pendingRequests > 0 || requestStats.readyRequests > 0 || requestStats.outOfStockProducts > 0)
                ? "text-orange-400" 
                : "text-slate-400"
            }`} />
            {(reminders.length + requestStats.pendingRequests + requestStats.readyRequests + requestStats.outOfStockProducts) > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-orange-500 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-black animate-bounce shadow">
                {reminders.length + requestStats.pendingRequests + requestStats.readyRequests + requestStats.outOfStockProducts}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute -right-8 sm:right-0 mt-3 w-[calc(100vw-32px)] sm:w-80 max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">Alerts &amp; Reminders</span>
                <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-bold">
                  {reminders.length + requestStats.pendingRequests + requestStats.readyRequests + requestStats.outOfStockProducts} Active
                </span>
              </div>
              
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/40">
                {/* Request Book & Inventory Alerts */}
                {(requestStats.pendingRequests > 0 || requestStats.readyRequests > 0 || requestStats.outOfStockProducts > 0) && (
                  <div className="p-2 bg-slate-950/20 space-y-1">
                    {requestStats.pendingRequests > 0 && (
                      <div
                        onClick={() => {
                          setShowDropdown(false);
                          navigate("/request-book");
                        }}
                        className="p-2.5 hover:bg-slate-800/50 rounded-xl transition cursor-pointer flex items-center justify-between border border-slate-800/60"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <div className="text-left">
                            <div className="text-[11px] font-bold text-slate-200">Pending Request Book items</div>
                            <div className="text-[9px] text-slate-550 text-slate-400">Items requested by customers.</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold bg-amber-550/10 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                          {requestStats.pendingRequests}
                        </span>
                      </div>
                    )}

                    {requestStats.readyRequests > 0 && (
                      <div
                        onClick={() => {
                          setShowDropdown(false);
                          navigate("/request-book");
                        }}
                        className="p-2.5 hover:bg-slate-800/50 rounded-xl transition cursor-pointer flex items-center justify-between border border-slate-800/60"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <div className="text-left">
                            <div className="text-[11px] font-bold text-slate-200">Ready for Collection</div>
                            <div className="text-[9px] text-slate-400 font-medium">Stock received for requests.</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                          {requestStats.readyRequests}
                        </span>
                      </div>
                    )}

                    {requestStats.outOfStockProducts > 0 && (
                      <div
                        onClick={() => {
                          setShowDropdown(false);
                          navigate("/inventory");
                        }}
                        className="p-2.5 hover:bg-slate-800/50 rounded-xl transition cursor-pointer flex items-center justify-between border border-slate-800/60"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <div className="text-left">
                            <div className="text-[11px] font-bold text-slate-200">Out of Stock Inventory</div>
                            <div className="text-[9px] text-slate-400">Products currently at zero stock.</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded">
                          {requestStats.outOfStockProducts}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Overdue Credit Invoices */}
                {reminders.length > 0 && (
                  <div className="divide-y divide-slate-800/40">
                    <div className="px-4 py-1.5 bg-slate-900/60 text-[9px] font-black text-slate-400 tracking-wider uppercase text-left">
                      Credit Reminders ({reminders.length})
                    </div>
                    {reminders.map((rem) => (
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
                          <span className="text-[9px] bg-rose-500/10 text-rose-450 px-1.5 py-0.5 rounded font-bold">
                            {rem.daysElapsed} days overdue {rem.targetReminderDays ? `(Limit: ${rem.targetReminderDays}d)` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {reminders.length === 0 && requestStats.pendingRequests === 0 && requestStats.readyRequests === 0 && requestStats.outOfStockProducts === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <FaBell className="text-lg text-slate-700 animate-pulse" />
                    <span>No reminders or notifications.</span>
                  </div>
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center border border-slate-700/60 overflow-hidden text-white font-extrabold text-xs shadow-sm">
            {user?.profile?.logo ? (
              <img src={user.profile.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>
                {(() => {
                  const name = shopName || "SL";
                  const parts = name.trim().split(/\s+/);
                  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
                })()}
              </span>
            )}
          </div>
          <span className="font-bold text-xs text-slate-200 hidden sm:block truncate max-w-[140px]" title={shopName}>
            {shopName}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Headers;
