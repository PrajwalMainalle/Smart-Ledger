import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import {
  FaThLarge,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaCalculator,
  FaHistory,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaUserFriends,
  FaReceipt,
  FaPercent,
  FaClipboardList,
  FaFileAlt,
  FaLandmark,
} from "react-icons/fa";
import { BsBoxSeamFill } from "react-icons/bs";

const SideBar = ({
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [gstOpen, setGstOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  // Desktop sidebar items
  const desktopNavItems = [
    { name: "Dashboard", path: "/home", icon: FaThLarge },
    { name: "POS / New Bill", path: "/pos", icon: FaCalculator },
    { name: "Invoices History", path: "/invoices", icon: FaHistory },
    { name: "Inventory", path: "/inventory", icon: BsBoxSeamFill },
    { name: "Government Schools", path: "/gov-schools", icon: FaLandmark },
    { name: "Request Book", path: "/request-book", icon: FaClipboardList },
    { name: "Purchases", path: "/purchases", icon: FaReceipt },
    { name: "Quotations", path: "/quotations", icon: FaFileAlt },
    { name: "Customers", path: "/customers", icon: FaUserFriends },
    { name: "Reports", path: "/reports", icon: FaChartBar },
    { name: "Settings", path: "/settings", icon: FaCog },
  ];

  const gstSubItems = [
    { name: "GST Dashboard", path: "/gst/dashboard" },
    { name: "Sales Summary", path: "/gst/sales" },
    { name: "Purchases Summary", path: "/gst/purchases" },
    { name: "Tax Variance", path: "/gst/summary" },
    { name: "Stock Split", path: "/gst/inventory" },
    { name: "CA Reconciliation", path: "/gst/ca-reports" },
  ];

  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  const displayName = user?.profile?.shopName || user?.businessName || "smart-ledger";

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`
          fixed md:relative top-0 left-0 h-full z-50 md:z-40 print:hidden
          bg-sidebar-bg text-sidebar-text flex flex-col
          transition-all duration-300
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Top */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          {!collapsed && (
            <h1 className="text-sm font-black tracking-wider uppercase text-orange-400 truncate max-w-[170px]" title="Smart Ledger">
              Smart Ledger
            </h1>
          )}

          <div className="flex gap-2">
            {/* Collapse - Desktop only */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-2 bg-sidebar-active rounded hover:bg-sidebar-active/80"
            >
              {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>

            {/* Close - Mobile only */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-2 bg-sidebar-active rounded hover:bg-sidebar-active/80"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-4 space-y-1 overflow-y-auto">
          {/* Desktop nav */}
          <div className="hidden md:block">
            {desktopNavItems.map(({ name, path, icon: Icon }) => {
              if (name === "Reports") {
                return (
                  <div key="gst-suite-desktop">
                    {/* GST Suite Header */}
                    <div
                      onClick={() => {
                        if (collapsed) {
                          navigate("/gst/dashboard");
                        } else {
                          setGstOpen(!gstOpen);
                        }
                      }}
                      className={`flex items-center justify-between px-4 py-3 mx-3 rounded-lg transition cursor-pointer text-sidebar-subtext hover:bg-sidebar-active hover:text-orange-400`}
                    >
                      <div className="flex items-center gap-3">
                        <FaPercent className="text-base text-orange-500" />
                        {!collapsed && <span className="font-semibold text-xs">GST Suite</span>}
                      </div>
                      {!collapsed && (
                        <span className="text-[10px] text-slate-500 transition-transform duration-200">
                          {gstOpen ? "▲" : "▼"}
                        </span>
                      )}
                    </div>

                    {/* GST Sub items */}
                    {!collapsed && gstOpen && (
                      <div className="pl-6 pr-3 py-1 space-y-1 bg-slate-950/20 rounded-lg mx-3 mb-2 border border-slate-900/40">
                        {gstSubItems.map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) =>
                              `block px-4 py-2 rounded-md text-[10px] font-bold transition
                            ${isActive
                                ? "bg-slate-900 text-orange-400"
                                : "text-slate-500 hover:text-slate-350"
                              }`
                            }
                          >
                            {sub.name}
                          </NavLink>
                        ))}
                      </div>
                    )}

                    {/* Original Reports Item */}
                    <NavLink
                      key={path}
                      to={path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 mx-3 rounded-lg transition
                      ${isActive
                          ? "bg-sidebar-active text-orange-400"
                          : "text-sidebar-subtext"
                        }
                      hover:bg-sidebar-active hover:text-orange-400`
                      }
                    >
                      <Icon className="text-base" />
                      {!collapsed && <span>{name}</span>}
                    </NavLink>
                  </div>
                );
              }
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 mx-3 rounded-lg transition
                  ${isActive
                      ? "bg-sidebar-active text-orange-400"
                      : "text-sidebar-subtext"
                    }
                  hover:bg-sidebar-active hover:text-orange-400`
                  }
                >
                  <Icon className="text-base" />
                  {!collapsed && <span>{name}</span>}
                </NavLink>
              );
            })}
          </div>

          {/* Mobile nav */}
          <div className="md:hidden">
            {desktopNavItems.map(({ name, path, icon: Icon }) => {
              if (name === "Reports") {
                return (
                  <div key="gst-suite-mobile">
                    {/* GST Suite Header */}
                    <div
                      onClick={() => setGstOpen(!gstOpen)}
                      className="flex items-center justify-between px-4 py-3 mx-3 rounded-lg transition cursor-pointer text-sidebar-subtext hover:bg-sidebar-active hover:text-orange-400"
                    >
                      <div className="flex items-center gap-3">
                        <FaPercent className="text-base text-orange-500" />
                        <span className="font-semibold text-xs">GST Suite</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {gstOpen ? "▲" : "▼"}
                      </span>
                    </div>

                    {/* GST Sub items */}
                    {gstOpen && (
                      <div className="pl-6 pr-3 py-1 space-y-1 bg-slate-950/20 rounded-lg mx-3 mb-2 border border-slate-900/40">
                        {gstSubItems.map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              `block px-4 py-2 rounded-md text-[10px] font-bold transition
                            ${isActive
                                ? "bg-slate-900 text-orange-400"
                                : "text-slate-500 hover:text-slate-350"
                              }`
                            }
                          >
                            {sub.name}
                          </NavLink>
                        ))}
                      </div>
                    )}

                    {/* Original Reports Item */}
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 mx-3 rounded-lg transition
                      ${isActive
                          ? "bg-sidebar-active text-orange-400"
                          : "text-sidebar-subtext"
                        }
                      hover:bg-sidebar-active hover:text-orange-400`
                      }
                    >
                      <Icon className="text-base" />
                      <span>{name}</span>
                    </NavLink>
                  </div>
                );
              }
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 mx-3 rounded-lg transition
                  ${isActive
                      ? "bg-sidebar-active text-orange-400"
                      : "text-sidebar-subtext"
                    }
                  hover:bg-sidebar-active hover:text-orange-400`
                  }
                >
                  <Icon className="text-base" />
                  <span>{name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Logout Trigger */}
        <div className="px-3 py-2 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sidebar-subtext hover:bg-sidebar-active hover:text-red-400 transition text-left"
          >
            <FaSignOutAlt className="text-base text-red-500" />
            {!collapsed && <span className="font-semibold text-xs text-red-400">Log Out</span>}
          </button>
        </div>

        {/* Bottom  */}
        <div className="p-4 border-t border-sidebar-border text-center">
          {!collapsed && (
            <p className="text-[10px] text-sidebar-subtext/70">
              &copy; {getCurrentYear()} SMART LEDGER
            </p>
          )}
        </div>
      </aside>
    </>
  );
};

export default SideBar;
