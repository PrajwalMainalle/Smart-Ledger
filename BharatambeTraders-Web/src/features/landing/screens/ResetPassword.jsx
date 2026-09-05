import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { FaLock, FaSpinner, FaArrowLeft, FaCheckCircle, FaExclamationCircle, FaEye, FaEyeSlash } from "react-icons/fa";
import axiosInstance from "../../../app/api/axiosInstance";
import logo from "../../../assets/SLLogo.png";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Prefill fields from URL query params
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");
    if (emailParam) setEmail(emailParam);
    if (tokenParam) {
      setToken(tokenParam);
      // If a hex token is present, we will submit the token instead of OTP
    }
  }, [searchParams]);

  // Password rules validation
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);
  const isMatch = password && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (!isPasswordValid) {
      setError("Please ensure password satisfies all security criteria.");
      setLoading(false);
      return;
    }

    if (!isMatch) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email,
        password,
        confirmPassword,
        otp: otp || undefined,
        token: token || undefined,
      };

      const response = await axiosInstance.post("/auth/reset-password", payload);
      setMessage(response.data.message);
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent rounded-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-5">
            
            <div className="flex items-center gap-2">
              <Link to="/forgot-password" className="text-slate-550 hover:text-orange-400 transition">
                <FaArrowLeft size={14} />
              </Link>
              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Forgot Password Request</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-100 uppercase tracking-wider">Reset Password</h3>
              <p className="text-[11px] text-slate-500">Provide reset details and choose a secure new password</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <FaExclamationCircle className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs flex flex-col items-center text-center gap-3">
                <FaCheckCircle size={28} className="text-emerald-500 animate-bounce" />
                <span className="font-semibold">{message}</span>
                <Link to="/" className="text-orange-400 font-bold hover:underline text-[11px]">
                  Click here if you are not redirected automatically
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Email (Readonly if from param, editable otherwise) */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@business.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>

                {/* Token or OTP */}
                {token ? (
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Reset Token</label>
                    <input 
                      type="text" 
                      readOnly
                      value={token}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-850 text-slate-500 font-mono text-xs select-none"
                    />
                    <p className="text-[9px] text-orange-400/80">Reset link token loaded successfully from URL.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Verification OTP Code (6 Digits)</label>
                    <input 
                      type="text" 
                      required
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500 font-mono tracking-widest text-center text-sm"
                    />
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">New Secure Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-350 focus:outline-none"
                    >
                      {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                    </button>
                  </div>
                </div>

                {/* Password Checker List */}
                <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-3 space-y-1.5 text-[10px]">
                  <p className="font-bold text-slate-400 mb-1">Security Checklist:</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${checks.length ? "bg-emerald-500" : "bg-red-500"}`}></span>
                      <span className={checks.length ? "text-emerald-450" : "text-slate-500"}>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${checks.uppercase ? "bg-emerald-500" : "bg-red-500"}`}></span>
                      <span className={checks.uppercase ? "text-emerald-450" : "text-slate-500"}>1 Uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${checks.lowercase ? "bg-emerald-500" : "bg-red-500"}`}></span>
                      <span className={checks.lowercase ? "text-emerald-450" : "text-slate-500"}>1 Lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${checks.number ? "bg-emerald-500" : "bg-red-500"}`}></span>
                      <span className={checks.number ? "text-emerald-450" : "text-slate-500"}>1 Numeric digit</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${checks.special ? "bg-emerald-500" : "bg-red-500"}`}></span>
                      <span className={checks.special ? "text-emerald-450" : "text-slate-500"}>1 Special character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-orange-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-350 focus:outline-none"
                    >
                      {showConfirmPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                    </button>
                  </div>
                  {password && confirmPassword && (
                    <p className={`text-[10px] mt-1 ${isMatch ? "text-emerald-400" : "text-red-400"}`}>
                      {isMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button 
                  type="submit" 
                  disabled={loading || !isPasswordValid || !isMatch}
                  className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs shadow-lg
                    ${(!isPasswordValid || !isMatch) 
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                      : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/10"
                    }
                  `}
                >
                  {loading ? <FaSpinner className="animate-spin" /> : "Verify & Update Password"}
                </button>
              </form>
            )}

            <div className="text-center pt-3 border-t border-slate-900">
              <Link to="/" className="text-orange-400 font-bold hover:underline text-[10px]">
                Cancel &amp; Return to Login Page
              </Link>
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

export default ResetPassword;
