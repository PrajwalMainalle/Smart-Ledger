import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShield,
  FiBriefcase,
  FiUsers,
  FiFileText,
  FiPackage,
  FiActivity,
  FiLogIn,
  FiLogOut,
  FiRefreshCw,
  FiSearch,
  FiExternalLink,
  FiClock,
  FiLock,
  FiEdit,
  FiTrash2,
} from "react-icons/fi";

const API_BASE = "http://localhost:5000/api/superadmin";

const SuperadminPortal = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("superadminToken") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [organizations, setOrganizations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("organizations");
  const [searchTerm, setSearchTerm] = useState("");

  // Edit Org Modal state
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [editPlan, setEditPlan] = useState("free");
  const [editStatus, setEditStatus] = useState("active");
  const [updating, setUpdating] = useState(false);

  // Manage Users Modal state
  const [manageUsersOrg, setManageUsersOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (token) {
      fetchOrganizations();
      fetchAuditLogs();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid superadmin credentials");

      localStorage.setItem("superadminToken", data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("superadminToken");
    setToken("");
    setOrganizations([]);
  };

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch organizations");
      setOrganizations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setAuditLogs(data);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  const handleUpdateOrg = async () => {
    if (!selectedOrg) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${selectedOrg._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: editPlan, status: editStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update organization");

      setSelectedOrg(null);
      fetchOrganizations();
      fetchAuditLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleImpersonate = async (org) => {
    if (!window.confirm(`Start a 15-minute support impersonation session for "${org.name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/organizations/${org._id}/impersonate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to launch impersonation session");

      // Save user session & impersonation details
      localStorage.setItem("superadminBackupToken", token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      sessionStorage.setItem(
        "impersonationSession",
        JSON.stringify({
          isImpersonating: true,
          orgName: data.orgName,
          expiresAt: Date.now() + (data.expiresInSeconds || 900) * 1000,
        })
      );

      navigate("/home");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFetchUsers = async (org) => {
    setManageUsersOrg(org);
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/${org._id}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch users");
      setOrgUsers(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userItem.email || userItem.ownerName}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/users/${userItem._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete user");

      alert(data.message);
      if (manageUsersOrg) {
        handleFetchUsers(manageUsersOrg);
      }
      fetchOrganizations();
      fetchAuditLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteOrg = async (org) => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to delete Organization "${org.name}" and ALL its user accounts? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE}/organizations/${org._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete organization");

      alert(data.message);
      fetchOrganizations();
      fetchAuditLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.email && o.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.phone && o.phone.includes(searchTerm))
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-center w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-xl mx-auto border border-indigo-500/20">
            <FiLock className="w-7 h-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-slate-100">Smart Ledger Superadmin</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Multi-Tenant Backoffice & Control Panel
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Superadmin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prajwalmainalle82@gmail.com"
                className="w-full bg-slate-850 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-850 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {loading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiLogIn className="w-4 h-4" />}
              Sign In to Superadmin Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-lg shadow-md">
            SL
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 leading-tight">Smart Ledger Backoffice</h1>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Platform Admin Panel</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrganizations}
            className="p-2 text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            title="Refresh Data"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-850 hover:bg-red-500/20 text-slate-200 hover:text-red-400 px-3.5 py-2 rounded-lg border border-slate-800 text-xs font-bold transition-colors"
          >
            <FiLogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("organizations")}
              className={`px-4 py-2 rounded-md text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === "organizations"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-slate-100 hover:bg-slate-850"
              }`}
            >
              <FiBriefcase className="w-4 h-4" />
              Organizations ({organizations.length})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 rounded-md text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === "audit"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-slate-100 hover:bg-slate-850"
              }`}
            >
              <FiActivity className="w-4 h-4" />
              Audit Logs ({auditLogs.length})
            </button>
          </div>

          {activeTab === "organizations" && (
            <div className="relative w-full sm:w-80">
              <FiSearch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search business name, phone, email..."
                className="w-full bg-slate-850 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 font-semibold placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Organizations List Table */}
        {activeTab === "organizations" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-100">
                <thead className="bg-slate-850 text-slate-300 uppercase font-black tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Business / Organization</th>
                    <th className="px-4 py-3.5">Owner Contact</th>
                    <th className="px-4 py-3.5">Plan</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Usage Metrics</th>
                    <th className="px-4 py-3.5">Signup Date</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-400 font-semibold">
                        No organizations found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => (
                      <tr key={org._id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-black text-sm text-slate-100">{org.name}</div>
                          <div className="text-slate-400 font-mono text-[11px] font-semibold">{org.slug}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-100">{org.ownerName || "—"}</div>
                          <div className="text-slate-400 font-medium text-[11px]">{org.email || org.phone || "—"}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {org.plan || "free"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border ${
                              org.status === "active"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {org.status || "active"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3 text-[11px] font-extrabold text-slate-200">
                            <button
                              onClick={() => handleFetchUsers(org)}
                              className="flex items-center gap-1.5 bg-indigo-500/15 hover:bg-indigo-500/30 px-2.5 py-1 rounded border border-indigo-500/30 text-indigo-300 transition-all"
                              title="Click to view & manage users"
                            >
                              <FiUsers className="w-3.5 h-3.5 text-indigo-400" /> {org.metrics?.usersCount || 0} Users
                            </button>
                            <span title="Invoices" className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 text-emerald-300">
                              <FiFileText className="w-3.5 h-3.5 text-emerald-400" /> {org.metrics?.invoicesCount || 0}
                            </span>
                            <span title="Products" className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-amber-300">
                              <FiPackage className="w-3.5 h-3.5 text-amber-400" /> {org.metrics?.productsCount || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-300 font-bold text-[11px]">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleFetchUsers(org)}
                              className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="Manage users of this business"
                            >
                              <FiUsers className="w-3.5 h-3.5" />
                              Users
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrg(org);
                                setEditPlan(org.plan || "free");
                                setEditStatus(org.status || "active");
                              }}
                              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <FiEdit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleImpersonate(org)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                            >
                              <FiExternalLink className="w-3.5 h-3.5" />
                              Support Login
                            </button>
                            <button
                              onClick={() => handleDeleteOrg(org)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs transition-colors"
                              title="Delete Business & All Associated Users"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Audit Logs Table */}
        {activeTab === "audit" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-100">
                <thead className="bg-slate-850 text-slate-300 uppercase font-black tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">Superadmin</th>
                    <th className="px-4 py-3.5">Action</th>
                    <th className="px-4 py-3.5">Target Organization</th>
                    <th className="px-4 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-400 font-semibold">
                        No superadmin audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-slate-300 font-bold text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-100">{log.superadminEmail}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-black font-mono uppercase ${
                              log.action.includes("IMPERSONATION")
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-100">{log.targetOrgId?.name || "—"}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-300 text-[11px] font-medium">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Edit Organization Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-100">
            <h3 className="text-lg font-black text-slate-100">Manage Subscription & Status</h3>
            <p className="text-xs text-slate-400 font-medium">
              Update plan and account status for <strong className="text-slate-100">{selectedOrg.name}</strong>
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  Subscription Plan
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="free">Free (Full Unrestricted Access)</option>
                  <option value="trial">Trial</option>
                  <option value="basic">Basic (₹999/mo)</option>
                  <option value="pro">Pro (₹1,999/mo)</option>
                  <option value="enterprise">Enterprise (₹3,999/mo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedOrg(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrg}
                disabled={updating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {updating && <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Users Modal */}
      {manageUsersOrg && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <FiUsers className="text-indigo-400" />
                  User Accounts — {manageUsersOrg.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  View and manage users registered under this organization
                </p>
              </div>
              <button
                onClick={() => setManageUsersOrg(null)}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>

            {loadingUsers ? (
              <div className="py-12 text-center text-slate-400 font-semibold flex items-center justify-center gap-2">
                <FiRefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                Loading organization users...
              </div>
            ) : orgUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-semibold">
                No users found for this organization.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs text-slate-100">
                  <thead className="bg-slate-850 text-slate-300 uppercase font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Owner / User</th>
                      <th className="px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5">Mobile</th>
                      <th className="px-3 py-2.5">Role</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900">
                    {orgUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-slate-100">{u.ownerName || u.businessName || "—"}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-300">{u.email}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-400">{u.mobileNumber || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {u.role || "admin"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto"
                            title="Delete User Account"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            Delete User
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminPortal;
