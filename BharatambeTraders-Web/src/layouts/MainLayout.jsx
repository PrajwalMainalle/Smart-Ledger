import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Headers from "../components/Header";
import Sidebar from "../components/SideBar";
import BottomNav from "../components/BottomNav";
import { FiShield, FiLogOut, FiClock } from "react-icons/fi";

const MainLayout = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [impersonation, setImpersonation] = useState(() => {
    try {
      const raw = sessionStorage.getItem("impersonationSession");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [timeLeftStr, setTimeLeftStr] = useState("");

  useEffect(() => {
    if (!impersonation || !impersonation.expiresAt) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((impersonation.expiresAt - Date.now()) / 1000));
      if (diff <= 0) {
        handleExitImpersonation();
      } else {
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        setTimeLeftStr(`${m}m ${s < 10 ? "0" : ""}${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [impersonation]);

  const handleExitImpersonation = () => {
    sessionStorage.removeItem("impersonationSession");
    const superadminToken = localStorage.getItem("superadminBackupToken");
    if (superadminToken) {
      localStorage.setItem("superadminToken", superadminToken);
      localStorage.removeItem("superadminBackupToken");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/superadmin";
    } else {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] min-h-screen overflow-hidden bg-layout-bg print:h-auto print:overflow-visible print:bg-white">
      {/* Persistent Support Impersonation Banner */}
      {impersonation && (
        <div className="bg-amber-600 text-white font-medium px-4 py-2 flex items-center justify-between text-xs sm:text-sm shadow-lg z-50 animate-pulse border-b border-amber-700">
          <div className="flex items-center gap-2">
            <FiShield className="w-4 h-4 text-amber-200" />
            <span>
              Viewing as <strong>{impersonation.orgName || "Client Business"}</strong> — Support Session
            </span>
            {timeLeftStr && (
              <span className="bg-amber-800/80 text-amber-100 px-2 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1">
                <FiClock className="w-3 h-3" /> Ends in {timeLeftStr}
              </span>
            )}
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-white text-amber-950 hover:bg-amber-100 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 shadow-sm"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            Exit Support Session
          </button>
        </div>
      )}

      <div className="flex flex-1 min-w-0 h-full overflow-hidden print:block print:w-full">
        {/* Sidebar */}
        <Sidebar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Right section */}
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden print:block print:w-full">
          {/* Header */}
          <Headers onMenuClick={() => setMobileOpen(true)} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-3 pb-28 sm:p-4 md:p-6 md:pb-6 print:p-0 print:m-0 print:overflow-visible print:w-full">
            <Outlet />
          </main>

          {/* Bottom Navigation - Mobile only */}
          <div className="md:hidden print:hidden">
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
