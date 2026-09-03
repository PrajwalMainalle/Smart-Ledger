import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { IoSearch } from "react-icons/io5";
import { FaUserFriends, FaPlus, FaTimes, FaEdit, FaTrashAlt, FaSpinner, FaHistory, FaPrint, FaPhoneAlt, FaWhatsapp } from "react-icons/fa";
import { fetchCustomers, addCustomer, updateCustomer, deleteCustomer, fetchCustomerLedger, collectPayment, clearActiveLedger } from "../customerSlice";
import LoadingOverlay from "../../../components/LoadingOverlay";

function CustomerList() {
  const dispatch = useDispatch();
  const { customers, loading, error } = useSelector((state) => state.customers);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    customerType: "Retail",
    priceCategory: "retail",
    creditReminderDays: "",
  });

  // Outstanding Ledger & Collection payment states
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const { activeLedger, ledgerLoading } = useSelector((state) => state.customers);

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  // Statistics calculations
  const totalCustomers = customers.length;
  const retailCount = customers.filter(c => c.customerType === "Retail").length;
  const schoolCount = customers.filter(c => c.customerType === "School").length;
  const wholesaleCount = customers.filter(c => c.customerType === "Wholesale" || c.customerType === "Dealer").length;

  // Filtered customer list
  const filteredCustomers = customers.filter((cust) => {
    if (!cust) return false;
    const matchesType = typeFilter === "All" || cust.customerType === typeFilter;
    const name = cust.name || "";
    const phone = cust.phone || "";
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);
    
    return matchesType && matchesSearch;
  });

  // Handle Add Customer Submit
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Please fill all required fields.");
      return;
    }

    const newCust = {
      name: formData.name,
      phone: formData.phone,
      customerType: formData.customerType,
      priceCategory: formData.priceCategory,
      creditReminderDays: formData.creditReminderDays,
    };

    dispatch(addCustomer(newCust)).then((res) => {
      if (!res.error) {
        setShowAddModal(false);
        resetForm();
      } else {
        alert(res.payload || "Failed to create customer");
      }
    });
  };

  // Trigger Edit Modal
  const openEditModal = (cust) => {
    setCurrentCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      customerType: cust.customerType,
      priceCategory: cust.priceCategory,
      creditReminderDays: cust.creditReminderDays !== undefined && cust.creditReminderDays !== null ? cust.creditReminderDays : "",
    });
    setShowEditModal(true);
  };

  // Handle Edit Customer Submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Please fill all required fields.");
      return;
    }

    const updatedCust = {
      _id: currentCustomer._id || currentCustomer.id,
      name: formData.name,
      phone: formData.phone,
      customerType: formData.customerType,
      priceCategory: formData.priceCategory,
      creditReminderDays: formData.creditReminderDays,
    };

    dispatch(updateCustomer(updatedCust)).then((res) => {
      if (!res.error) {
        setShowEditModal(false);
        resetForm();
      } else {
        alert(res.payload || "Failed to update customer");
      }
    });
  };

  // Handle Delete Customer
  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete customer '${name}'?`)) {
      dispatch(deleteCustomer(id)).then((res) => {
        if (res.error) {
          alert(res.payload || "Failed to delete customer");
        }
      });
    }
  };

  // Automatically update priceCategory when customerType changes (as default helper)
  const handleTypeChange = (typeVal) => {
    let categoryVal = "retail";
    switch (typeVal) {
      case "Retail":
        categoryVal = "retail";
        break;
      case "Shop":
        categoryVal = "shop";
        break;
      case "School":
        categoryVal = "school";
        break;
      case "Wholesale":
        categoryVal = "wholesale";
        break;
      case "Dealer":
        categoryVal = "dealer";
        break;
      case "Distributor":
        categoryVal = "distributor";
        break;
      default:
        categoryVal = "retail";
    }
    setFormData({ ...formData, customerType: typeVal, priceCategory: categoryVal });
  };

  const handleOpenLedger = (cust) => {
    setSelectedCustomerForLedger(cust);
    setShowLedgerModal(true);
    dispatch(fetchCustomerLedger(cust._id || cust.id));
  };

  const handleSendWhatsAppReminder = (cust) => {
    const cleanPhone = (cust.phone || "").replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const balance = cust.outstandingBalance || 0;
    const text = encodeURIComponent(`Namaste ${cust.name} ji,\nThis is a friendly reminder from Bharatambe Traders regarding your outstanding balance of ₹${balance.toFixed(2)}.\nKindly make payment at your convenience.\nThank you!`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
  };

  const handleCollectSubmit = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    const payload = {
      customerPhone: selectedCustomerForLedger.phone,
      amountPaid: parseFloat(paymentAmount),
      paymentMethod: collectMethod,
      notes: paymentNotes,
    };
    dispatch(collectPayment(payload)).then((res) => {
      if (!res.error) {
        alert("Payment collected successfully!");
        setPaymentAmount("");
        setPaymentNotes("");
        dispatch(fetchCustomers());
      } else {
        alert(res.payload || "Failed to record collection");
      }
    });
  };

  // Reset helper
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      customerType: "Retail",
      priceCategory: "retail",
      creditReminderDays: "",
    });
    setCurrentCustomer(null);
  };

  return (
    <div className="w-full space-y-6 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Customer Management</h2>
            <p className="text-slate-400 text-sm mt-1">Configure customer types, assign selling price categories, and view buyer contact lists.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-95 text-xs"
          >
            <FaPlus /> Add New Customer
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Statistical KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Total Registered</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{totalCustomers} Customers</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Retail Buyers</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{retailCount} Accounts</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">School Clients</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{schoolCount} Clients</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Wholesale / Dealers</span>
            <p className="text-xl font-bold text-slate-100 mt-1">{wholesaleCount} Traders</p>
          </div>
        </div>

        {/* Search and Filters toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/20 p-4 rounded-xl border border-slate-900/60">
          <div className="relative w-full max-w-md">
            <input 
              type="text" 
              placeholder="Search by customer name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            <IoSearch className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Customer Type:</span>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-855 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="All">All Types</option>
              <option value="Retail">Retail</option>
              <option value="Shop">Shop</option>
              <option value="School">School</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Dealer">Dealer</option>
              <option value="Distributor">Distributor</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Mobile View Customer Cards */}
        <div className="md:hidden space-y-3">
          {loading && <LoadingOverlay message="Fetching customer records..." />}
          {filteredCustomers.map((cust) => {
            const custId = cust._id || cust.id;
            const balance = cust.outstandingBalance || 0;

            return (
              <div key={custId} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{cust.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {cust.customerType}
                      </span>
                      <span className="text-[10px] text-orange-400 font-bold capitalize">
                        {cust.priceCategory} Price
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Balance</span>
                    <span className={`font-mono text-sm font-black ${balance > 0 ? "text-rose-450" : "text-emerald-450"}`}>
                      ₹{balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <a 
                    href={`tel:${cust.phone}`}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white font-mono bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60"
                  >
                    <FaPhoneAlt size={11} className="text-emerald-400" />
                    <span>{cust.phone}</span>
                  </a>

                  {balance > 0 && (
                    <button
                      onClick={() => handleSendWhatsAppReminder(cust)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition"
                    >
                      <FaWhatsapp size={13} className="text-emerald-400" />
                      <span>Remind</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => handleOpenLedger(cust)}
                    className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FaHistory size={12} /> Ledger & Payment
                  </button>
                  <button
                    onClick={() => openEditModal(cust)}
                    className="p-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:text-white"
                    title="Edit customer"
                  >
                    <FaEdit size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(custId, cust.name)}
                    className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 hover:text-white"
                    title="Delete customer"
                  >
                    <FaTrashAlt size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && !loading && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No customers match query filters.
            </div>
          )}
        </div>

        {/* Desktop Customer list Table */}
        <div className="hidden md:block bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden shadow-lg relative">
          {loading && <LoadingOverlay message="Fetching customer records..." />}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-2">Phone Number</th>
                  <th className="py-3 px-2">Customer Type</th>
                  <th className="py-3 px-2">Assigned Pricing Category</th>
                  <th className="py-3 px-2">Credit Term Limit</th>
                  <th className="py-3 px-2 text-right">Outstanding Balance</th>
                  <th className="py-3 px-2">Date Added</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-300">
                {filteredCustomers.map((cust) => {
                  const custId = cust._id || cust.id;
                  const dateStr = cust.createdAt ? new Date(cust.createdAt).toLocaleDateString("en-IN") : "N/A";

                  return (
                    <tr key={custId} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-100">{cust.name}</td>
                      <td className="py-4 px-2 font-mono text-slate-400">{cust.phone}</td>
                      <td className="py-4 px-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {cust.customerType}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-orange-400 font-bold capitalize">{cust.priceCategory} Price</td>
                      <td className="py-4 px-2 font-mono text-xs">
                        {cust.creditReminderDays && cust.creditReminderDays > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold">
                            {cust.creditReminderDays} Days
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-sans italic">Store Default</span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={`font-bold font-mono text-xs ${cust.outstandingBalance > 0 ? "text-rose-450 font-extrabold" : "text-emerald-450"}`}>
                          ₹{(cust.outstandingBalance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-slate-500 font-mono">{dateStr}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenLedger(cust)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-orange-400 hover:text-orange-300 rounded border border-slate-700 transition"
                            title="View customer transaction ledger & collect payment"
                          >
                            <FaHistory size={12} />
                          </button>
                          <button 
                            onClick={() => openEditModal(cust)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded border border-slate-700 transition"
                            title="Edit customer details"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button 
                            onClick={() => handleDelete(custId, cust.name)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded border border-rose-500/20 transition"
                            title="Delete customer"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500 text-sm">No customers match active query filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FaUserFriends className="text-orange-500" /> Add New Customer Profile
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Customer Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Phone Number (Unique) *</label>
                <input 
                  type="text" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9000000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Customer Type</label>
                  <select 
                    value={formData.customerType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Shop">Shop</option>
                    <option value="School">School</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Dealer">Dealer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Price Category Category</label>
                  <select 
                    value={formData.priceCategory}
                    onChange={(e) => setFormData({ ...formData, priceCategory: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 capitalize"
                  >
                    <option value="retail">retail price</option>
                    <option value="shop">shop price</option>
                    <option value="school">school price</option>
                    <option value="wholesale">wholesale price</option>
                    <option value="dealer">dealer price</option>
                    <option value="distributor">distributor price</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Credit Reminder Alert (Days)</label>
                <input 
                  type="number" 
                  min="1"
                  max="365"
                  value={formData.creditReminderDays}
                  onChange={(e) => setFormData({ ...formData, creditReminderDays: e.target.value })}
                  placeholder="e.g. 15 (Leave empty to use store default)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                />
                <p className="text-[10px] text-slate-500">Custom overdue limit for this customer. Overrides global store setting if set.</p>
              </div>

              {formData.customerType === "Other" && (
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-900 text-[10px] text-slate-400">
                  <p>💡 Setting the Customer Type to <strong>Other</strong> allows selecting any standard price category. You can custom categorize them inside reports.</p>
                </div>
              )}

              <div className="pt-4 flex gap-3 border-t border-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-855 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold"
                >
                  Save Customer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-900">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FaEdit className="text-orange-500" /> Edit Customer Profile
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-200">
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Customer Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Phone Number *</label>
                <input 
                  type="text" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Customer Type</label>
                  <select 
                    value={formData.customerType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Shop">Shop</option>
                    <option value="School">School</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Dealer">Dealer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Price Category</label>
                  <select 
                    value={formData.priceCategory}
                    onChange={(e) => setFormData({ ...formData, priceCategory: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2.5 bg-slate-950 text-slate-100 focus:outline-none focus:border-orange-500 capitalize"
                  >
                    <option value="retail">retail price</option>
                    <option value="shop">shop price</option>
                    <option value="school">school price</option>
                    <option value="wholesale">wholesale price</option>
                    <option value="dealer">dealer price</option>
                    <option value="distributor">distributor price</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Credit Reminder Alert (Days)</label>
                <input 
                  type="number" 
                  min="1"
                  max="365"
                  value={formData.creditReminderDays}
                  onChange={(e) => setFormData({ ...formData, creditReminderDays: e.target.value })}
                  placeholder="e.g. 15 (Leave empty to use store default)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                />
                <p className="text-[10px] text-slate-500">Custom overdue limit for this customer. Overrides global store setting if set.</p>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-900">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-855 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold"
                >
                  Update Customer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER LEDGER & CREDIT COLLECTION MODAL */}
      {showLedgerModal && selectedCustomerForLedger && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-5 py-3.5 flex items-center justify-between border-b border-slate-900 print:hidden">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                📄 Customer Ledger &amp; Collections ({selectedCustomerForLedger.name})
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-bold flex items-center gap-1.5 hover:text-white transition text-xs"
                >
                  <FaPrint /> Print Ledger
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowLedgerModal(false);
                    setSelectedCustomerForLedger(null);
                    dispatch(clearActiveLedger());
                  }} 
                  className="text-slate-400 hover:text-slate-200"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {/* Print Only Header (Visible only when printing) */}
            <div className="hidden print:block p-6 text-slate-950 bg-white">
              <h1 className="text-xl font-bold uppercase text-center border-b-2 border-slate-955 pb-2">CUSTOMER LEDGER STATEMENT</h1>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p><strong>Customer Name:</strong> {selectedCustomerForLedger.name}</p>
                  <p><strong>Mobile Number:</strong> {selectedCustomerForLedger.phone}</p>
                  <p><strong>Pricing Tier:</strong> {selectedCustomerForLedger.customerType} ({selectedCustomerForLedger.priceCategory})</p>
                </div>
                <div className="text-right">
                  <p><strong>Statement Date:</strong> {new Date().toLocaleDateString("en-IN")}</p>
                  <p className="text-base font-bold text-red-700"><strong>Outstanding Balance:</strong> ₹{(selectedCustomerForLedger.outstandingBalance || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs print:p-0 print:overflow-visible">
              
              {/* Row 1: Left (Record Payment) vs Right (Quick summary) - print hidden */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 print:hidden">
                
                {/* Collect Payment Form */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 space-y-4 lg:col-span-2">
                  <h4 className="font-bold text-slate-200 text-xs border-b border-slate-900 pb-2 uppercase tracking-wider">Record Payment Collection</h4>
                  <form onSubmit={handleCollectSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold">Amount Received (₹) *</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="e.g. 1500"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-105 focus:outline-none focus:border-orange-500 text-xs font-mono font-bold bg-slate-950"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-semibold">Payment Mode</label>
                      <select 
                        value={collectMethod}
                        onChange={(e) => setCollectMethod(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 bg-slate-955 text-slate-105 focus:outline-none focus:border-orange-500 text-xs bg-slate-950"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <button 
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 text-xs flex items-center justify-center gap-1.5"
                      >
                        Record Collection
                      </button>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-slate-400 font-semibold">Reference Notes / Comments</label>
                      <input 
                        type="text"
                        placeholder="e.g. Cleared invoice INV-004 partial balance"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-slate-105 focus:outline-none focus:border-orange-500 text-xs bg-slate-950"
                      />
                    </div>
                  </form>
                </div>

                {/* Balance Card */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Current Balance Status</span>
                    <h4 className="text-2xl font-black text-rose-450 font-mono mt-1">
                      ₹{(selectedCustomerForLedger.outstandingBalance || 0).toFixed(2)}
                    </h4>
                    <p className="text-slate-450 text-[10px] mt-1">This amount represents the customer's total unpaid credit balance across all transactions.</p>
                  </div>
                  <div className="pt-3 border-t border-slate-900/80 text-[10px] text-slate-500">
                    <div>Phone: <span className="font-mono font-bold text-slate-350">{selectedCustomerForLedger.phone}</span></div>
                    <div className="mt-1">Pricing category: <span className="font-bold text-orange-400 uppercase">{selectedCustomerForLedger.priceCategory}</span></div>
                  </div>
                </div>

              </div>

              {/* Ledger Entries Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-xs border-b border-slate-900 pb-2 uppercase tracking-wider flex justify-between print:hidden">
                  <span>Ledger Transaction History</span>
                  <span className="text-slate-500 font-normal">({activeLedger?.ledger?.length || 0} entries found)</span>
                </h4>

                <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20 print:border-slate-950">
                  <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-slate-450 border-b border-slate-850 uppercase text-[9px] font-bold print:bg-slate-200 print:text-slate-950 print:border-b-2 print:border-slate-950">
                        <th className="p-3">Date</th>
                        <th className="p-3">Ref ID</th>
                        <th className="p-3">Particulars / Description</th>
                        <th className="p-3 text-right">Debit (Purchases)</th>
                        <th className="p-3 text-right">Credit (Payments)</th>
                        <th className="p-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 text-slate-350 print:divide-slate-955 print:text-slate-950">
                      {ledgerLoading && (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-500"><FaSpinner className="animate-spin inline mr-2" /> Loading ledger records...</td>
                        </tr>
                      )}
                      {activeLedger?.ledger?.map((entry, idx) => {
                        const dateStr = entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "N/A";
                        const refIdStr = entry.invoiceId || entry._id?.substring(18) || "N/A";
                        return (
                          <tr key={entry._id || idx} className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-3 font-mono">{dateStr}</td>
                            <td className="p-3 font-mono font-semibold">{refIdStr}</td>
                            <td className="p-3">
                              <div>{entry.description}</div>
                              {entry.notes && <div className="text-[10px] text-slate-500 mt-0.5 print:text-slate-600 font-serif">Note: {entry.notes}</div>}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-455 print:text-rose-900">
                              {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-450 print:text-emerald-900">
                              {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-100 print:text-slate-955">
                              ₹{entry.balance.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      {(!activeLedger || activeLedger.ledger.length === 0) && !ledgerLoading && (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-500">No ledger transaction activities on record.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerList;
