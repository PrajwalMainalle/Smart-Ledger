import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGovGrants, closeGovGrant } from "../govFundSlice";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaLandmark,
  FaLock,
  FaHistory,
  FaTimes,
  FaMoneyBillWave,
  FaShoppingBag,
} from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

const GovSettlement = () => {
  const dispatch = useDispatch();
  const { grants, loading } = useSelector((state) => state.govFunds);

  const [selectedGrant, setSelectedGrant] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [settlementError, setSettlementError] = useState("");

  useEffect(() => {
    dispatch(fetchGovGrants());
  }, [dispatch]);

  const activeGrants = grants.filter((g) => g.status === "Active");
  const closedGrants = grants.filter((g) => g.status === "Closed");

  const handleInitiateClose = (grant) => {
    setSelectedGrant(grant);
    setSettlementError("");
    const rem = grant.remainingBalance ?? grant.grantAmount;

    if (Math.abs(rem) > 0.01) {
      setSettlementError(
        `Cannot close grant! Remaining balance must be exactly ₹0.00. Current remaining balance is ₹${rem.toFixed(2)}.`
      );
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmClose = async () => {
    if (!selectedGrant) return;
    const res = await dispatch(closeGovGrant(selectedGrant._id));
    if (closeGovGrant.rejected.match(res)) {
      setSettlementError(res.payload || "Failed to close grant.");
      setShowConfirmModal(false);
    } else {
      alert(`Grant "${selectedGrant.grantName}" has been successfully settled and closed!`);
      setShowConfirmModal(false);
      setSelectedGrant(null);
      dispatch(fetchGovGrants());
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-slate-100 min-h-screen">
      {loading && <LoadingOverlay message="Checking Grant Settlement balances..." />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-emerald-400 flex items-center gap-2">
            <FaCheckCircle /> Grant Settlement Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforce full grant settlement rules. Grants can only be closed when unspent balance reaches exactly ₹0.00.
          </p>
        </div>
      </div>

      {/* Settlement Warning Banner if error */}
      {settlementError && (
        <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-xl flex items-center justify-between text-red-300 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-red-400 text-xl shrink-0" />
            <div>
              <h4 className="font-bold text-red-300">Settlement Validation Error</h4>
              <p className="text-slate-300 mt-0.5">{settlementError}</p>
            </div>
          </div>
          <button onClick={() => setSettlementError("")} className="text-slate-400 hover:text-white">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Active Grants Settlement Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <FaLandmark /> Active Grants Pending Settlement ({activeGrants.length})
        </h2>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Grant Name & AY</th>
                  <th className="p-3 text-right">Sanctioned Amount</th>
                  <th className="p-3 text-right">Material Purchases</th>
                  <th className="p-3 text-right">Cash Given</th>
                  <th className="p-3 text-right">Remaining Balance</th>
                  <th className="p-3 text-center">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {activeGrants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-500">
                      All government grants have been fully settled and closed!
                    </td>
                  </tr>
                ) : (
                  activeGrants.map((g) => {
                    const rem = g.remainingBalance ?? g.grantAmount;
                    const canClose = Math.abs(rem) <= 0.01;

                    return (
                      <tr key={g._id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-100">{g.schoolId?.schoolName || "N/A"}</td>
                        <td className="p-3">
                          <div className="font-bold text-amber-400">{g.grantName}</div>
                          <div className="text-[10px] text-slate-400">AY {g.academicYear}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-100">
                          ₹{g.grantAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-blue-400 font-semibold">
                          ₹{(g.materialsPurchased || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-purple-400 font-semibold">
                          ₹{(g.cashGiven || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-400">
                          ₹{rem?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleInitiateClose(g)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                              canClose
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                                : "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                            }`}
                          >
                            {canClose ? <FaCheckCircle /> : <FaLock />}
                            Close Grant
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Closed Grants History */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <FaLock className="text-slate-500" /> Settled & Closed Grants Archive ({closedGrants.length})
        </h2>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Grant Name</th>
                  <th className="p-3 text-right">Sanctioned Amount</th>
                  <th className="p-3 text-right">Final Remaining Balance</th>
                  <th className="p-3 text-center">Closing Date</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-400">
                {closedGrants.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-500">
                      No closed grants archived yet.
                    </td>
                  </tr>
                ) : (
                  closedGrants.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-800/20">
                      <td className="p-3 font-semibold text-slate-300">{g.schoolId?.schoolName || "N/A"}</td>
                      <td className="p-3 font-medium text-slate-300">{g.grantName}</td>
                      <td className="p-3 text-right font-mono">₹{g.grantAmount?.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-400">₹0.00</td>
                      <td className="p-3 text-center font-mono">
                        {g.closedAt ? new Date(g.closedAt).toLocaleDateString() : "Settled"}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                          Closed & Locked
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Confirm Close Grant */}
      {showConfirmModal && selectedGrant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <FaCheckCircle /> Confirm Grant Settlement & Closure
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Are you sure you want to close and lock <strong>{selectedGrant.grantName}</strong> ({selectedGrant.schoolId?.schoolName})?
              </p>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span>Sanction Amount:</span>
                  <span className="font-bold">₹{selectedGrant.grantAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Remaining Balance:</span>
                  <span className="font-black">₹0.00</span>
                </div>
              </div>
              <p className="text-[11px] text-amber-400">
                Warning: Once closed, no further invoice purchases or cash payments can be charged to this grant.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow"
              >
                Confirm Settlement & Lock Grant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovSettlement;
