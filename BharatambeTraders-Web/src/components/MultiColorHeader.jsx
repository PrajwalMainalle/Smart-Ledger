import React from "react";

/**
 * MultiColorCompanyTitle
 * Renders bold, elegant BHARATAMBE TRADERS header for print & web reports.
 */
export const MultiColorCompanyTitle = ({ className = "text-2xl font-black tracking-tight text-[#0f172a] print:text-[#0f172a]" }) => {
  return (
    <h1 className={className}>
      <span className="text-[#0f172a] font-black">BHARATAMBE </span>
      <span className="text-[#034b54] font-black">TRADERS</span>
    </h1>
  );
};

/**
 * MultiColorReportTitle
 * Renders report title strings in clear, bold dark colored typography.
 */
export const MultiColorReportTitle = ({ title, className = "text-lg font-bold mt-1 text-[#034b54] print:text-[#034b54]" }) => {
  if (!title) return null;
  return (
    <h2 className={className}>
      {title}
    </h2>
  );
};

/**
 * Safe print helper that temporarily clears document title so browser headers remain clean
 */
export const triggerSafePrint = (callback) => {
  const originalTitle = document.title;
  document.title = "";
  if (callback && typeof callback === "function") {
    callback();
  }
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }, 100);
};

export default MultiColorCompanyTitle;
