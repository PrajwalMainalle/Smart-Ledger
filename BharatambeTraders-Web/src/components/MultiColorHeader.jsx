import React from "react";
import { useSelector } from "react-redux";
import { getShopName } from "../utils/tenantConfig";

/**
 * MultiColorCompanyTitle
 * Renders bold, elegant corporate shop title for print & web reports dynamically based on tenant config.
 */
export const MultiColorCompanyTitle = ({
  user: userProp,
  titleText,
  className = "text-2xl font-black tracking-tight text-[#0f172a] print:text-[#0f172a]"
}) => {
  const reduxUser = useSelector((state) => state.auth?.user);
  const user = userProp || reduxUser;
  const name = titleText || getShopName(user);
  const words = name.split(" ");
  const firstPart = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const secondPart = words.slice(Math.ceil(words.length / 2)).join(" ");

  return (
    <h1 className={className}>
      <span className="text-[#0f172a] font-black">{firstPart} </span>
      {secondPart && <span className="text-[#034b54] font-black">{secondPart}</span>}
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
