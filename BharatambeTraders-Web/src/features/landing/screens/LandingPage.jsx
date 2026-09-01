import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { registerTenant, loginTenant, clearError } from "../../auth/authSlice";
import { 
  FaCalculator, 
  FaChartBar, 
  FaBoxes, 
  FaHistory, 
  FaUser, 
  FaPhoneAlt, 
  FaLock, 
  FaEnvelope, 
  FaStore, 
  FaSpinner,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";
import logo from "../../../assets/SLLogo.png";

function LandingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  // Form toggle state: "login" or "register"
  const [formMode, setFormMode] = useState("login");

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Registration states
  const [registerData, setRegisterData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    mobileNumber: "",
    password: "",
  });

  // Login states
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // If authenticated, go to dashboard
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Clear any leftover auth errors when switching forms
    dispatch(clearError());
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
  }, [formMode, dispatch]);

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    dispatch(registerTenant(registerData));
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    dispatch(loginTenant(loginData));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center p-1">
            <img src={logo} alt="SmartLedger Logo" className="w-8 h-8 rounded-lg" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider bg-gradient-to-r from-orange-400 to-amber-250 bg-clip-text text-transparent uppercase">
              SmartLedger
            </h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold">POS &amp; Billing SaaS</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setFormMode(formMode === "login" ? "register" : "login")}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 border border-orange-500/20 px-3 py-1.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 transition"
          >
            {formMode === "login" ? "Create Account" : "Access Tenant Portal"}
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: SaaS Marketing Pitch */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <span className="px-3 py-1 text-xs font-semibold tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full uppercase">
              Next-Gen Multi-Tenant Platform
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mt-4 tracking-tight leading-tight">
              Power Your Retail Store with <br />
              <span className="bg-gradient-to-r from-orange-500 via-amber-405 to-yellow-300 bg-clip-text text-transparent">
                SmartLedger Cloud
              </span>
            </h2>
            <p className="text-slate-400 mt-4 text-base md:text-lg max-w-xl">
              An all-in-one commercial terminal designed for businesses to manage sales, generate professional GST invoices, and track live stock inventories securely.
            </p>
          </div>

          {/* Features bullet points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {[
              { title: "High-Speed Billing POS", desc: "Scan SKU codes, add items to cart, deduct stock and checkout in seconds.", icon: FaCalculator, color: "text-orange-500" },
              { title: "Live Inventory Alerts", desc: "Automate stock quantity logging and track low-stock items with direct warnings.", icon: FaBoxes, color: "text-emerald-405" },
              { title: "Financial & Tax Reports", desc: "Compile daily, weekly, and monthly sales graphs and collect GST class logs.", icon: FaChartBar, color: "text-blue-400" },
              { title: "PDF Invoices on Server", desc: "Generate professional commercial receipts automatically and save for download.", icon: FaHistory, color: "text-purple-400" },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="bg-slate-900/30 border border-slate-900/80 p-4 rounded-xl flex gap-3">
                  <div className={`h-8 w-8 rounded-lg bg-slate-950 flex items-center justify-center ${feature.color} shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{feature.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Form (Login/Register) */}
        <div className="lg:col-span-5 w-full flex justify-center">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent rounded-3xl pointer-events-none"></div>

            {/* Error notifications */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4 text-center">
                {error}
              </div>
            )}

            {formMode === "login" ? (
              // LOGIN FORM
              <form onSubmit={handleLoginSubmit} className="space-y-5 text-xs relative z-10">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Tenant Login</h3>
                  <p className="text-[10px] text-slate-500">Access your SmartLedger dashboard terminal</p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={loginData.email}
                      onChange={handleLoginChange}
                      placeholder="owner@business.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500"
                    />
                    <FaEnvelope size={14} className="absolute left-3.5 top-3.5 text-slate-655" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-400 font-semibold">Secret Password</label>
                    <Link 
                      to="/forgot-password" 
                      className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input 
                      type={showLoginPassword ? "text" : "password"}
                      name="password"
                      required
                      value={loginData.password}
                      onChange={handleLoginChange}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500"
                    />
                    <FaLock size={14} className="absolute left-3.5 top-3.5 text-slate-655" />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                    >
                      {showLoginPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-orange-500/10"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : "Verify and Enter Terminal &rarr;"}
                </button>

                <div className="text-center pt-4 border-t border-slate-900">
                  <p className="text-[10px] text-slate-500">
                    New business?{" "}
                    <button 
                      type="button" 
                      onClick={() => setFormMode("register")}
                      className="text-orange-400 font-bold hover:underline"
                    >
                      Register Now
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              // REGISTRATION FORM
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs relative z-10">
                <div className="text-center space-y-1 mb-2">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Tenant Registration</h3>
                  <p className="text-[10px] text-slate-500">Configure your trade store account instantly</p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Business / Trade Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="businessName"
                      required
                      value={registerData.businessName}
                      onChange={handleRegisterChange}
                      placeholder="e.g. SmartLedger Store"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500"
                    />
                    <FaStore size={14} className="absolute left-3.5 top-3 text-slate-655" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Owner's Full Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="ownerName"
                      required
                      value={registerData.ownerName}
                      onChange={handleRegisterChange}
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500"
                    />
                    <FaUser size={14} className="absolute left-3.5 top-3 text-slate-655" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      placeholder="owner@business.com"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500"
                    />
                    <FaEnvelope size={14} className="absolute left-3.5 top-3 text-slate-655" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Mobile Number</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="mobileNumber"
                      required
                      value={registerData.mobileNumber}
                      onChange={handleRegisterChange}
                      placeholder="e.g. 9000000000"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500"
                    />
                    <FaPhoneAlt size={14} className="absolute left-3.5 top-3 text-slate-655" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Set Secure Password</label>
                  <div className="relative">
                    <input 
                      type={showRegisterPassword ? "text" : "password"}
                      name="password"
                      required
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500"
                    />
                    <FaLock size={14} className="absolute left-3.5 top-3 text-slate-655" />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none"
                    >
                      {showRegisterPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-orange-500/10"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : "Register & Create Tenant"}
                </button>

                <div className="text-center pt-3 border-t border-slate-900">
                  <p className="text-[10px] text-slate-500">
                    Already registered?{" "}
                    <button 
                      type="button" 
                      onClick={() => setFormMode("login")}
                      className="text-orange-400 font-bold hover:underline"
                    >
                      Login Here
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-655 border-t border-slate-900 mt-auto">
        &copy; {new Date().getFullYear()} SmartLedger. POS &amp; Inventory SaaS. Dedicated Multi-Tenant Isolated Portals.
      </footer>

    </div>
  );
}

export default LandingPage;
