import React from "react";
import { FaBoxes } from "react-icons/fa";

const BrandLoader = ({ message = "Loading Smart Ledger...", fullScreen = true }) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
      {/* Outer Pulse Container */}
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-2xl bg-teal-500/20 animate-ping opacity-75"></div>
        <div className="relative w-14 h-14 bg-gradient-to-br from-teal-600 to-slate-900 rounded-2xl border border-teal-500/30 flex items-center justify-center shadow-lg shadow-teal-950/40">
          <FaBoxes className="text-2xl text-teal-400 animate-pulse" />
        </div>
      </div>

      {/* Brand Title */}
      <h3 className="text-base font-bold text-slate-100 tracking-wide mb-1">
        Smart Ledger
      </h3>

      {/* Subtitle / Message */}
      <p className="text-xs text-slate-400 max-w-xs animate-pulse">
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 min-w-[240px]">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default BrandLoader;
