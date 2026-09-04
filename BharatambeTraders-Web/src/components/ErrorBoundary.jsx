import React, { Component } from "react";
import { FaExclamationTriangle, FaRedo, FaHome } from "react-icons/fa";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught a runtime rendering error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/home";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-lg">
              <FaExclamationTriangle className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Oops! Something went wrong
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                An unexpected error occurred while loading this view. You can reload the page or navigate back to the main console.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-32 divide-y divide-slate-900">
                <div className="font-bold text-rose-400 mb-1">{this.state.error.toString()}</div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FaRedo size={12} /> Reload Application
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl border border-slate-700 transition-transform active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FaHome size={12} /> Back to Dashboard
              </button>
            </div>

            <div className="pt-2 border-t border-slate-850">
              <span className="text-[10px] text-slate-500">Bharatambe Traders Safety &amp; Error Recovery System</span>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
