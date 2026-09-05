import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaSpinner, FaArrowLeft, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import axiosInstance from "../../../app/api/axiosInstance";
import logo from "../../../assets/SLLogo.png";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [devToken, setDevToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    setDevOtp("");
    setDevToken("");

    try {
      const response = await axiosInstance.post("/auth/forgot-password", { email });
      setMessage(response.data.message);
      
      // If in development/test, we can display the details for easy testing
      if (response.data.otp) {
        setDevOtp(response.data.otp);
        setDevToken(response.data.token);
        console.log(`[PASSWORD RESET DEV ASSIST] OTP: ${response.data.otp}, Token: ${response.data.token}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process forgot password request.");
    } finally {
      setLoading(false);
    }
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
      </header>

      {/* Main Grid Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent rounded-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            
            <div className="flex items-center gap-2">
              <Link to="/" className="text-slate-550 hover:text-orange-400 transition">
                <FaArrowLeft size={14} />
              </Link>
              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Back to Login</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-100 uppercase tracking-wider">Forgot Password</h3>
              <p className="text-[11px] text-slate-500">Enter your registered email address to recover your account</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <FaExclamationCircle className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-start gap-2">
                  <FaCheckCircle className="shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">Received OTP or Reset Link?</p>
                  
                  {devOtp && (
                    <div className="my-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3.5 rounded-xl text-left font-mono space-y-1">
                      <p className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-wider text-center">Dev Mode Assist</p>
                      <p className="text-[11px] text-center">OTP Code: <span className="font-extrabold text-slate-100 text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{devOtp}</span></p>
                      <div className="h-px bg-slate-800/60 my-2"></div>
                      <p className="text-[9px] text-slate-500 leading-normal text-center">
                        <Link 
                          to={`/reset-password?token=${devToken}&email=${encodeURIComponent(email)}`}
                          className="text-orange-400 underline font-sans font-semibold hover:text-orange-300"
                        >
                          Use Secure Reset Link →
                        </Link>
                      </p>
                    </div>
                  )}

                  <Link 
                    to={`/reset-password?email=${encodeURIComponent(email)}`}
                    className="mt-3 block w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold transition text-center text-xs shadow-lg shadow-orange-500/10"
                  >
                    Enter OTP & Reset Password →
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Registered Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@business.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500 text-xs"
                    />
                    <FaEnvelope size={14} className="absolute left-3.5 top-3.5 text-slate-655" />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-orange-500/10"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : "Send Reset Code & Link →"}
                </button>
              </form>
            )}

            <div className="text-center pt-4 border-t border-slate-900 text-[10px] text-slate-500">
              Need assistance? Contact store administration support.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-655 border-t border-slate-900 mt-auto">
        &copy; {new Date().getFullYear()} SmartLedger. POS &amp; Inventory SaaS.
      </footer>

    </div>
  );
}

export default ForgotPassword;
