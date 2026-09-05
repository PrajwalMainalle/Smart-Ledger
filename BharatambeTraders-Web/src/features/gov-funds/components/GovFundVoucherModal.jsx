import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { FaPrint, FaTimes, FaLandmark, FaCheckCircle, FaMoneyBillWave, FaBoxes, FaDownload } from "react-icons/fa";

const GovFundVoucherModal = ({ voucher, onClose, merchantInfo }) => {
  const printRef = useRef(null);

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    let token = localStorage.getItem("bt_token") || localStorage.getItem("token") || "";
    if (!token) {
      try {
        const userStr = localStorage.getItem("bt_user") || localStorage.getItem("user");
        if (userStr) token = JSON.parse(userStr)?.token || "";
      } catch (e) {}
    }

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const pdfUrl = `${baseUrl}/gov-funds/vouchers/${voucher._id}/pdf?token=${encodeURIComponent(token)}&t=${Date.now()}`;
    window.open(pdfUrl, "_blank");
  };

  const formattedDate = voucher.date ? new Date(voucher.date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }) : new Date().toLocaleString("en-IN");

  const materialItems = voucher.materialItems || [];
  const materialAmount = voucher.materialAmount || 0;
  const cashAmount = voucher.cashWithdrawnAmount || voucher.cashAmount || 0;
  const totalAmount = voucher.amount || (materialAmount + cashAmount);
  const teacher = voucher.teacherDetails || {};

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 printable-voucher-modal-overlay">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto printable-voucher-modal-container">
        
        {/* Action Header - Always Sticky at Top */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <FaCheckCircle /> Government Fund Utilization Voucher
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <FaDownload /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <FaPrint /> Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-base"
              title="Close Voucher"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper - Scrollable Content Container */}
        <div className="overflow-y-auto flex-1 p-6 md:p-8 bg-white text-[#0f172a] font-sans print:p-0 print:m-0 print:bg-white print:text-black">
          <div ref={printRef} className="printable-voucher">
            {/* Header */}
            <div className="text-center border-b-2 border-[#0f172a] pb-3 mb-4 print:pb-2 print:mb-3">
              <h1 className="text-2xl font-black tracking-tight text-[#0f172a] uppercase print:text-xl">
                {merchantInfo?.firmName || merchantInfo?.shopName || "Smart Ledger"}
              </h1>
              <p className="text-xs text-[#475569] font-medium print:text-[10px]">
                {merchantInfo?.address ? `${merchantInfo.address} | ` : ""}Mobile: {merchantInfo?.mobileNumber || "N/A"}
              </p>
              {merchantInfo?.gstNumber && (
                <p className="text-xs font-bold text-[#334155] mt-0.5 print:text-[10px]">GSTIN: {merchantInfo.gstNumber}</p>
              )}
              
              <div className="mt-2 inline-block bg-[#0f172a] text-white font-bold text-xs px-4 py-1 rounded-full uppercase tracking-wider print:text-[9.5px] print:py-0.5">
                Government Fund Utilization Voucher
              </div>
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4 bg-[#f8fafc] p-3 rounded-xl border border-[#cbd5e1] print:mb-3 print:p-2.5 print:text-[11px]">
              <div>
                <p><span className="font-bold text-[#334155]">Voucher No:</span> <strong className="text-[#0f172a]">{voucher.voucherNumber}</strong></p>
                <p><span className="font-bold text-[#334155]">Fund Account No:</span> <span className="text-[#0f172a]">{voucher.fundNumber || voucher.grantId?.fundNumber || "N/A"}</span></p>
                <p><span className="font-bold text-[#334155]">Ref Govt Invoice:</span> <span className="text-[#0f172a]">{voucher.invoiceNumber || voucher.grantId?.invoiceNumber || "N/A"}</span></p>
                <p><span className="font-bold text-[#334155]">Date & Time:</span> <span className="text-[#0f172a]">{formattedDate}</span></p>
              </div>
              <div>
                <p><span className="font-bold text-[#334155]">School Name:</span> <span className="text-[#0f172a]">{voucher.schoolId?.schoolName || "Government School"}</span></p>
                <p><span className="font-bold text-[#334155]">Teacher / Receiver:</span> <span className="text-[#0f172a]">{teacher.name || "Headmaster"}</span></p>
                <p><span className="font-bold text-[#334155]">Mobile / Designation:</span> <span className="text-[#0f172a]">{teacher.mobile ? `${teacher.mobile} (${teacher.designation || "Teacher"})` : (teacher.designation || "N/A")}</span></p>
                <p><span className="font-bold text-[#334155]">Transaction Type:</span> <span className="font-bold text-[#b45309]">{voucher.type}</span></p>
              </div>
            </div>

            {/* Material Items Table (if any) */}
            {materialItems.length > 0 && (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5 flex items-center gap-1.5 print:text-[10px]">
                  <FaBoxes className="text-[#64748b]" /> Materials Issued Items List
                </h3>
                <table className="w-full text-xs text-left border-collapse border border-[#cbd5e1] print:text-[10px]">
                  <thead>
                    <tr className="bg-[#f1f5f9] text-[#0f172a] font-bold border-b border-[#cbd5e1]">
                      <th className="p-1.5 border-r border-[#cbd5e1]">#</th>
                      <th className="p-1.5 border-r border-[#cbd5e1]">Item Name</th>
                      <th className="p-1.5 border-r border-[#cbd5e1] text-right">Rate (₹)</th>
                      <th className="p-1.5 border-r border-[#cbd5e1] text-center">Qty</th>
                      <th className="p-1.5 text-right">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-[#e2e8f0] text-[#0f172a]">
                        <td className="p-1.5 border-r border-[#e2e8f0]">{idx + 1}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] font-medium">{item.name}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-right">₹{item.price?.toFixed(2)}</td>
                        <td className="p-1.5 border-r border-[#e2e8f0] text-center font-bold">{item.qty}</td>
                        <td className="p-1.5 text-right font-bold">₹{(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f8fafc] font-bold text-[#0f172a]">
                      <td colSpan={4} className="p-1.5 border-r border-[#cbd5e1] text-right">Subtotal Material Issued:</td>
                      <td className="p-1.5 text-right text-[#0f172a]">₹{materialAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Cash Withdrawal Section (if any) */}
            {cashAmount > 0 && (
              <div className="mb-4 bg-[#fffbeb] border border-[#fde68a] p-2.5 rounded-xl flex items-center justify-between text-xs print:mb-3 print:p-2">
                <div className="flex items-center gap-2 text-[#78350f] font-bold">
                  <FaMoneyBillWave className="text-[#d97706] text-base" /> Cash Withdrawal Amount:
                </div>
                <div className="text-sm font-black text-[#78350f]">
                  ₹{cashAmount.toFixed(2)}
                </div>
              </div>
            )}

            {/* Balance Breakdown Summary */}
            <div className="bg-[#0f172a] text-white p-3 rounded-xl text-xs mb-4 grid grid-cols-3 gap-2 text-center print:bg-[#0f172a] print:text-white print:p-2.5 print:mb-3">
              <div>
                <p className="text-[#94a3b8] font-medium text-[10px]">Balance Before</p>
                <p className="text-sm font-bold text-slate-200 print:text-xs">₹{(voucher.balanceBefore || 0).toFixed(2)}</p>
              </div>
              <div className="border-x border-[#334155]">
                <p className="text-[#94a3b8] font-medium text-[10px]">Voucher Total Deducted</p>
                <p className="text-sm font-black text-[#fbbf24] print:text-xs">₹{totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[#94a3b8] font-medium text-[10px]">Remaining Fund Balance</p>
                <p className="text-sm font-bold text-[#34d399] print:text-xs">₹{(voucher.balanceAfter || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Remarks */}
            {voucher.remarks && (
              <p className="text-xs text-[#475569] italic mb-4 print:mb-2 print:text-[10px]">
                <strong className="text-[#1e293b]">Remarks:</strong> {voucher.remarks}
              </p>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-[#cbd5e1] text-center text-xs mt-6 print:mt-4 print:pt-3">
              <div>
                <div className="h-8 print:h-6"></div>
                <p className="border-t border-[#64748b] pt-1 font-bold text-[#0f172a] print:text-[10px]">Receiver / Teacher Signature</p>
                <p className="text-[10px] text-[#475569] print:text-[9px]">({teacher.name || "Headmaster / Authorized Teacher"})</p>
              </div>
              <div>
                <div className="h-8 print:h-6"></div>
                <p className="border-t border-[#64748b] pt-1 font-bold text-[#0f172a] print:text-[10px]">Authorized Store Signatory</p>
                <p className="text-[10px] text-[#475569] print:text-[9px]">({merchantInfo?.firmName || merchantInfo?.shopName || "Smart Ledger"})</p>
              </div>
            </div>

            <p className="text-[9px] text-[#64748b] text-center mt-4 uppercase tracking-wider print:mt-2 print:text-[8px]">
              This is a Government Fund Utilization Receipt. Revenue & Tax Invoice was recorded upon initial Government Invoice issuance.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GovFundVoucherModal;
