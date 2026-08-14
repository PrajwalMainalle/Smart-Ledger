import React, { useRef } from "react";
import { FaPrint, FaTimes, FaLandmark, FaCheckCircle, FaMoneyBillWave, FaBoxes } from "react-icons/fa";

const GovFundVoucherModal = ({ voucher, onClose, merchantInfo }) => {
  const printRef = useRef(null);

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col my-6">
        
        {/* Action Header */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <FaCheckCircle /> Government Fund Utilization Voucher
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <FaPrint /> Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div ref={printRef} className="p-8 bg-white text-slate-900 font-sans print:p-0 print:bg-white print:text-black">
          
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {merchantInfo?.firmName || "BHARATAMBE TRADERS"}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {merchantInfo?.address || "Main Market Road"} | Mobile: {merchantInfo?.mobileNumber || "9741166742"}
            </p>
            {merchantInfo?.gstNumber && (
              <p className="text-xs font-bold text-slate-700 mt-0.5">GSTIN: {merchantInfo.gstNumber}</p>
            )}
            
            <div className="mt-3 inline-block bg-slate-900 text-white font-bold text-xs px-4 py-1 rounded-full uppercase tracking-wider">
              Government Fund Utilization Voucher
            </div>
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p><span className="font-bold text-slate-700">Voucher No:</span> <strong className="text-slate-900">{voucher.voucherNumber}</strong></p>
              <p><span className="font-bold text-slate-700">Fund Account No:</span> {voucher.fundNumber || voucher.grantId?.fundNumber || "N/A"}</p>
              <p><span className="font-bold text-slate-700">Ref Govt Invoice:</span> {voucher.invoiceNumber || voucher.grantId?.invoiceNumber || "N/A"}</p>
              <p><span className="font-bold text-slate-700">Date & Time:</span> {formattedDate}</p>
            </div>
            <div>
              <p><span className="font-bold text-slate-700">School Name:</span> {voucher.schoolId?.schoolName || "Government School"}</p>
              <p><span className="font-bold text-slate-700">Teacher / Receiver:</span> {teacher.name || "Headmaster"}</p>
              <p><span className="font-bold text-slate-700">Mobile / Designation:</span> {teacher.mobile ? `${teacher.mobile} (${teacher.designation || "Teacher"})` : (teacher.designation || "N/A")}</p>
              <p><span className="font-bold text-slate-700">Transaction Type:</span> <span className="font-bold text-amber-700">{voucher.type}</span></p>
            </div>
          </div>

          {/* Material Items Table (if any) */}
          {materialItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <FaBoxes className="text-slate-500" /> Materials Issued Items List
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300">Item Name</th>
                    <th className="p-2 border-r border-slate-300 text-right">Rate (₹)</th>
                    <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                    <th className="p-2 text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {materialItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-medium">{item.name}</td>
                      <td className="p-2 border-r border-slate-200 text-right">₹{item.price?.toFixed(2)}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">{item.qty}</td>
                      <td className="p-2 text-right font-bold">₹{(item.price * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="p-2 border-r border-slate-300 text-right">Subtotal Material Issued:</td>
                    <td className="p-2 text-right text-slate-900">₹{materialAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Cash Withdrawal Section (if any) */}
          {cashAmount > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <FaMoneyBillWave className="text-amber-600 text-base" /> Cash Withdrawal Amount:
              </div>
              <div className="text-sm font-black text-amber-900">
                ₹{cashAmount.toFixed(2)}
              </div>
            </div>
          )}

          {/* Balance Breakdown Summary */}
          <div className="bg-slate-900 text-white p-4 rounded-xl text-xs mb-6 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-slate-400 font-medium text-[11px]">Balance Before</p>
              <p className="text-sm font-bold text-slate-200">₹{(voucher.balanceBefore || 0).toFixed(2)}</p>
            </div>
            <div className="border-x border-slate-800">
              <p className="text-slate-400 font-medium text-[11px]">Voucher Total Deducted</p>
              <p className="text-sm font-black text-amber-400">₹{totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium text-[11px]">Remaining Fund Balance</p>
              <p className="text-sm font-bold text-emerald-400">₹{(voucher.balanceAfter || 0).toFixed(2)}</p>
            </div>
          </div>

          {/* Remarks */}
          {voucher.remarks && (
            <p className="text-xs text-slate-600 italic mb-8">
              <strong>Remarks:</strong> {voucher.remarks}
            </p>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs mt-12">
            <div>
              <div className="h-10"></div>
              <p className="border-t border-slate-400 pt-1 font-bold text-slate-800">Receiver / Teacher Signature</p>
              <p className="text-[10px] text-slate-500">({teacher.name || "Headmaster / Authorized Teacher"})</p>
            </div>
            <div>
              <div className="h-10"></div>
              <p className="border-t border-slate-400 pt-1 font-bold text-slate-800">Authorized Store Signatory</p>
              <p className="text-[10px] text-slate-500">({merchantInfo?.firmName || "Bharatambe Traders"})</p>
            </div>
          </div>

          <p className="text-[9.5px] text-slate-400 text-center mt-6 uppercase tracking-wider">
            This is a Government Fund Utilization Receipt. Revenue & Tax Invoice was recorded upon initial Government Invoice issuance.
          </p>

        </div>
      </div>
    </div>
  );
};

export default GovFundVoucherModal;
