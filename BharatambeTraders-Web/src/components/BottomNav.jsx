import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaThLarge, FaCalculator, FaUserFriends, FaPlus } from "react-icons/fa";
import { BsBoxSeamFill } from "react-icons/bs";
import QuickActionModal from "./QuickActionModal";

const BottomNav = () => {
  const [showQuickModal, setShowQuickModal] = useState(false);

  const leftNavItems = [
    { name: "Home", path: "/home", icon: FaThLarge },
    { name: "POS Bill", path: "/pos", icon: FaCalculator },
  ];

  const rightNavItems = [
    { name: "Stock", path: "/inventory", icon: BsBoxSeamFill },
    { name: "Parties", path: "/customers", icon: FaUserFriends },
  ];

  return (
    <>
      <QuickActionModal 
        isOpen={showQuickModal} 
        onClose={() => setShowQuickModal(false)} 
      />

      <nav className="
        fixed bottom-0 left-0 right-0 z-40
        bg-slate-900/95 backdrop-blur-md border-t border-slate-800/90
        flex justify-around items-center
        h-16 px-2 md:hidden shadow-2xl
      ">
        {/* Left Items */}
        {leftNavItems.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-all
               ${isActive ? "text-orange-400 scale-105" : "text-slate-400"}
               hover:text-orange-400 active:scale-95`
            }
          >
            <Icon className="text-lg mb-1" />
            <span>{name}</span>
          </NavLink>
        ))}

        {/* Floating Quick Action Button (FAB) */}
        <div className="relative flex items-center justify-center px-2">
          <button
            onClick={() => setShowQuickModal(true)}
            aria-label="Quick Actions Menu"
            className="
              w-12 h-12 -mt-6 rounded-full
              bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400
              text-slate-950 shadow-lg shadow-orange-500/30
              flex items-center justify-center text-xl font-black
              border-4 border-slate-900
              hover:scale-110 active:scale-95 transition-transform duration-200
            "
          >
            <FaPlus />
          </button>
        </div>

        {/* Right Items */}
        {rightNavItems.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-all
               ${isActive ? "text-orange-400 scale-105" : "text-slate-400"}
               hover:text-orange-400 active:scale-95`
            }
          >
            <Icon className="text-lg mb-1" />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default BottomNav;
