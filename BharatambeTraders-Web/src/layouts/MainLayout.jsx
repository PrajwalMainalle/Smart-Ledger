import { useState } from "react";
import { Outlet } from "react-router-dom";
import Headers from "../components/Header";
import Sidebar from "../components/SideBar";
import BottomNav from "../components/BottomNav";

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-[100dvh] min-h-screen overflow-hidden bg-layout-bg print:h-auto print:overflow-visible print:bg-white">
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

        {/* Page content - pb-28 on mobile prevents content from being covered by BottomNav */}
        <main className="flex-1 overflow-y-auto p-3 pb-28 sm:p-4 md:p-6 md:pb-6 print:p-0 print:m-0 print:overflow-visible print:w-full">
          <Outlet />
        </main>

        {/* Bottom Navigation - Mobile only */}
        <div className="md:hidden print:hidden"><BottomNav /></div>
      </div>
      
    </div>
  );
};

export default MainLayout;
