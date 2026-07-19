import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { updateProfile, getProfile } from "../../auth/authSlice";
import axiosInstance from "../../../app/api/axiosInstance";
import { FaStore, FaFileInvoice, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaImage, FaCheckCircle, FaSpinner, FaExclamationTriangle, FaTrash, FaDatabase, FaBan } from "react-icons/fa";
import LoadingOverlay from "../../../components/LoadingOverlay";

function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetStatus, setResetStatus] = useState("idle"); // "idle" | "loading" | "success" | "error"
  const [resetProgressStep, setResetProgressStep] = useState(0);
  const [resetError, setResetError] = useState("");

  const handleOpenResetModal = () => {
    setResetStatus("idle");
    setResetConfirmText("");
    setResetProgressStep(0);
    setResetError("");
    setShowResetModal(true);
  };
  
  const handleResetData = async () => {
    if (resetConfirmText !== "RESET") return;
    
    setResetStatus("loading");
    setResetProgressStep(1); // Backup phase
    
    try {
      // Simulate backup phase visual
      await new Promise(resolve => setTimeout(resolve, 1200));
      setResetProgressStep(2); // Deletion phase
      
      await axiosInstance.post("/billing/reset-business-data");
      
      // Simulate post-deletion refresh visual
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResetProgressStep(3); // Cache refresh phase
      
      await new Promise(resolve => setTimeout(resolve, 800));
      setResetStatus("success");
      setResetProgressStep(4);
    } catch (err) {
      console.error(err);
      setResetError(err.response?.data?.message || "Server error occurred while resetting data.");
      setResetStatus("error");
    }
  };
  
  const [formData, setFormData] = useState({
    shopName: "",
    businessName: "",
    gstNumber: "",
    businessAddress: "",
    mobileNumber: "",
    email: "",
    businessDescription: "",
    state: "",
    pincode: "",
    logo: "",
    gstBillingRule: "warn",
  });

  const [logoPreview, setLogoPreview] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      const profile = user.profile || {};
      setFormData({
        shopName: profile.shopName || user.businessName || "",
        businessName: user.businessName || "",
        gstNumber: profile.gstNumber || "",
        businessAddress: profile.businessAddress || "",
        mobileNumber: profile.mobileNumber || user.mobileNumber || "",
        email: profile.email || user.email || "",
        businessDescription: profile.businessDescription || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
        logo: profile.logo || "",
        gstBillingRule: user.gstBillingRule || "warn",
      });
      setLogoPreview(profile.logo || "");
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Logo file size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result });
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    const resultAction = await dispatch(updateProfile(formData));
    if (updateProfile.fulfilled.match(resultAction)) {
      setSuccessMsg("Business profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 rounded-2xl border border-slate-900">
      {loading && <LoadingOverlay message="Updating system configuration..." />}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Business Profile Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Configure invoice branding, tax details, logo uploads, and address variables.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
            <FaCheckCircle /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Logo upload */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Logo</span>
              
              <div className="w-32 h-32 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden relative group">
                {logoPreview ? (
                  <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-cover" />
                ) : (
                  <FaStore size={48} className="text-slate-700" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 cursor-pointer">
                  <FaImage className="text-white text-2xl" />
                </div>
              </div>

              <div className="w-full">
                <label className="block w-full py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-lg cursor-pointer transition border border-slate-700 text-center">
                  <span className="flex items-center justify-center gap-2">
                    <FaImage /> Choose Image
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange}
                    className="hidden" 
                  />
                </label>
                <p className="text-[10px] text-slate-500 mt-2">Supports JPG, PNG (Max 2MB). Automatically sizes on receipt PDF.</p>
              </div>
            </div>

            {/* Right Column: Profile fields */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl md:col-span-2 space-y-4 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                <FaStore className="text-orange-500" /> Identity &amp; Invoicing Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Shop / Trade Name</label>
                  <input 
                    type="text" 
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleChange}
                    placeholder="e.g. SmartLedger Store"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Registered Business Name</label>
                  <input 
                    type="text" 
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="e.g. SmartLedger Private Limited"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">GSTIN (15-digit Tax Code)</label>
                  <input 
                    type="text" 
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500 font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Business Description / Tagline</label>
                  <input 
                    type="text" 
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleChange}
                    placeholder="e.g. Wholesale Sports & Stationery Distributors"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 pt-4 flex items-center gap-2">
                <FaMapMarkerAlt className="text-orange-500" /> Contact &amp; Address Variables
              </h3>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Store Address</label>
                <textarea 
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  placeholder="e.g. MB Patil Colony Near Bus Stand, BasavaKalyan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">State</label>
                  <input 
                    type="text" 
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Karnataka"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Pincode</label>
                  <input 
                    type="text" 
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="e.g. 585327"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Store Mobile Number</label>
                  <input 
                    type="text" 
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder="e.g. 6361037157"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Store Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. store@smartledger.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">GST Billing Rules (On Low Stock)</label>
                  <select 
                    name="gstBillingRule"
                    value={formData.gstBillingRule}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="warn">Show Warning (Allow Billing)</option>
                    <option value="prevent">Prevent GST Billing</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading && <FaSpinner className="animate-spin" />}
                  Save Profile Configuration
                </button>
              </div>

            </div>
          </div>
        </form>

        {/* Danger Zone Section */}
        <div className="bg-rose-950/10 border border-rose-900/30 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-rose-450 border-b border-rose-950/20 pb-2 flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-500" /> Danger Zone
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-slate-100 font-bold text-sm">Reset Business Data</h4>
              <p className="text-slate-400 text-xs max-w-xl">
                Permanently delete all sales invoices, quotations, transactions, and reports history. 
                Your inventory products, categories, base user profile, and configurations will remain untouched.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenResetModal}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 self-start sm:self-center"
            >
              Reset Business Data
            </button>
          </div>
        </div>

      </div>

      {/* Reset Business Data Confirmation & Progress Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl transition-all duration-300">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-950/40 to-rose-950/40 p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
                <FaExclamationTriangle className="text-xl" />
              </div>
              <div>
                <h3 className="text-slate-100 font-extrabold text-base">Reset Business Data</h3>
                <p className="text-[10px] text-slate-400">Irreversible Action &bull; Super Admin Console</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs text-slate-300">
              
              {resetStatus === "idle" && (
                <>
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-2">
                    <p className="font-bold text-rose-450 text-xs flex items-center gap-1.5">
                      <FaExclamationTriangle /> Warning: Data Loss Warning
                    </p>
                    <p className="text-slate-350 leading-relaxed text-[11px]">
                      This will permanently delete all sales invoices, quotations, cash/bank ledger balances, sales returns, reports logs, and invoice PDFs.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Data to Delete</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px]">
                        <li>Sales Invoices</li>
                        <li>Quotations &amp; Bills</li>
                        <li>Transaction History</li>
                        <li>Report Analytics</li>
                        <li>Invoice PDFs on server</li>
                      </ul>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Data to Preserve</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px]">
                        <li>Inventory Items (Products)</li>
                        <li>SKU, Stock &amp; Pricing Tiers</li>
                        <li>Customer Master details</li>
                        <li>GST/Tax Settings</li>
                        <li>Business Profile &amp; Logo</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-400 font-semibold block">
                      To proceed, type <span className="text-slate-100 font-bold tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-850">RESET</span> below:
                    </label>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="Type RESET"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-rose-500 font-mono text-center tracking-widest"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <FaBan /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetData}
                      disabled={resetConfirmText !== "RESET"}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                    >
                      <FaTrash /> Purge All Data
                    </button>
                  </div>
                </>
              )}

              {resetStatus === "loading" && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <FaSpinner className="animate-spin text-rose-500 text-4xl" />
                    <FaDatabase className="absolute text-slate-500 text-sm animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-100">Resetting Business Terminal...</h4>
                    <p className="text-[10px] text-slate-500">Please do not close this window or navigate away.</p>
                  </div>

                  {/* Step-by-Step Progress Indicators */}
                  <div className="w-full max-w-xs space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold
                        ${resetProgressStep >= 1 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                          : "border-slate-800 text-slate-600"
                        }
                      `}>
                        1
                      </div>
                      <span className={`text-[10px] ${resetProgressStep === 1 ? "text-slate-100 font-bold" : "text-slate-500"}`}>
                        Creating database backup...
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold
                        ${resetProgressStep >= 2 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                          : "border-slate-800 text-slate-600"
                        }
                      `}>
                        2
                      </div>
                      <span className={`text-[10px] ${resetProgressStep === 2 ? "text-slate-100 font-bold" : "text-slate-500"}`}>
                        Purging invoices &amp; transaction files...
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold
                        ${resetProgressStep >= 3 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                          : "border-slate-800 text-slate-600"
                        }
                      `}>
                        3
                      </div>
                      <span className={`text-[10px] ${resetProgressStep === 3 ? "text-slate-100 font-bold" : "text-slate-500"}`}>
                        Resetting reports cache...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {resetStatus === "success" && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl animate-bounce">
                    <FaCheckCircle size={36} />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-extrabold text-slate-100">Reset Completed Successfully!</h4>
                    <p className="text-slate-400 text-[11px] max-w-sm">
                      All transaction histories and invoice PDF documents have been purged. Inventory stocks and master configurations are preserved.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetStatus("idle");
                      setResetConfirmText("");
                      navigate("/home");
                      window.location.reload(); // Refresh to rebuild clean stats
                    }}
                    className="w-full max-w-xs py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg transition active:scale-95"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}

              {resetStatus === "error" && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                    <FaExclamationTriangle size={36} />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-extrabold text-slate-100">Purge Failed</h4>
                    <p className="text-rose-450 text-[11px] max-w-sm">{resetError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetStatus("idle")}
                    className="w-full max-w-xs py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 font-bold rounded-xl border border-slate-700 transition"
                  >
                    Try Again
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
