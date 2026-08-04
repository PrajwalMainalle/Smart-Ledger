import { useState } from "react";
import { Outlet } from "react-router-dom";
import Headers from "../components/Header";
import Sidebar from "../components/SideBar";
import BottomNav from "../components/BottomNav";

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-layout-bg print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Right section */}
      <div className="flex flex-col flex-1 print:block print:w-full">
        {/* Header */}
        <Headers onMenuClick={() => setMobileOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 print:p-0 print:m-0 print:overflow-visible print:w-full">
          <Outlet />
        </main>

        {/* Bottom Navigation - Mobile only */}
      <div className="mt-12 md:hidden print:hidden"><BottomNav /></div>
      </div>
      
    </div>
  );
};

export default MainLayout;
