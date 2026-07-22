import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { IoSearch } from "react-icons/io5";
import {
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrashAlt,
  FaSpinner,
  FaPhoneAlt,
  FaWhatsapp,
  FaExclamationTriangle,
  FaClipboardList,
  FaCheckCircle,
  FaTruck,
  FaBoxOpen,
  FaUserClock,
  FaTimesCircle,
  FaCopy,
} from "react-icons/fa";
import {
  fetchRequests,
  addRequest,
  updateRequest,
  deleteRequest,
} from "../requestsSlice";
import LoadingOverlay from "../../../components/LoadingOverlay";

function RequestBook() {
  const dispatch = useDispatch();
  const { requests, loading, error } = useSelector((state) => state.requests);

  // UI state
  const [activeTab, setActiveTab] = useState("list"); // "list" or "supplier"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);

  // Add Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [formItems, setFormItems] = useState([{ itemName: "", quantity: 1, expectedPrice: "" }]);

  // Edit Form states
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAdvancePayment, setEditAdvancePayment] = useState("");
  const [editStatus, setEditStatus] = useState("Pending");
  const [editFormItems, setEditFormItems] = useState([{ itemName: "", quantity: 1, expectedPrice: "" }]);

  useEffect(() => {
    dispatch(fetchRequests());
  }, [dispatch]);

  // Calculations for KPI Cards
  const totalRequests = requests.length;
  const pendingRequestsCount = requests.filter((r) => r.status === "Pending").length;
  const orderedRequestsCount = requests.filter((r) => r.status === "Ordered from Supplier").length;
  const readyRequestsCount = requests.filter((r) => r.status === "Stock Received").length;

  // Filtered requests list
  const filteredRequests = requests.filter((req) => {
    if (!req) return false;
    const matchesStatus = statusFilter === "All" || req.status === statusFilter;
    const customer = req.customerName || "";
    const phone = req.customerPhone || "";
    
    // Check if search matches customer name, phone, or any item name
    const matchesSearch =
      customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      (req.items && req.items.some((it) => it.itemName.toLowerCase().includes(searchTerm.toLowerCase())));

    return matchesStatus && matchesSearch;
  });

  // Supplier Checklist logic: Group pending requests by item name (case-insensitive)
  const getSupplierChecklist = () => {
    const itemsMap = {};
    requests
      .filter((req) => req.status === "Pending" || req.status === "Ordered from Supplier")
      .forEach((req) => {
        if (!req.items) return;
        req.items.forEach((item) => {
          const key = item.itemName.trim().toLowerCase();
          if (!itemsMap[key]) {
            itemsMap[key] = {
              originalName: item.itemName.trim(),
              totalQty: 0,
              customers: [],
            };
          }
          itemsMap[key].totalQty += item.quantity;
          itemsMap[key].customers.push({
            id: req._id || req.id,
            name: req.customerName,
            phone: req.customerPhone,
            qty: item.quantity,
            status: req.status,
            date: req.requestDate,
          });
        });
      });

    return Object.values(itemsMap).sort((a, b) => b.totalQty - a.totalQty);
  };

  const supplierChecklist = getSupplierChecklist();

  // Copy compiled order list to clipboard
  const handleCopyOrderList = () => {
    if (supplierChecklist.length === 0) {
      alert("No pending requests to compile.");
      return;
    }

    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    let copyText = `📋 *BHARATAMBE TRADERS - SUPPLIER ORDER CHECKLIST*\n📅 Date: ${dateStr}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    supplierChecklist.forEach((item, index) => {
      const customerBreakdown = item.customers
        .map((c) => `${c.name} (${c.qty})`)
        .join(", ");
      copyText += `${index + 1}. *${item.originalName}*\n   📦 Total Qty: *${item.totalQty}*\n   👤 Customers: _${customerBreakdown}_\n\n`;
    });

    copyText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🙏 Please arrange the above items at the earliest. Thank you!`;

    navigator.clipboard.writeText(copyText)
      .then(() => {
        alert("Company order checklist copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy", err);
        alert("Failed to copy order list. Please copy manually.");
      });
  };

  // Dynamic Form items handlers (Add Modal)
  const handleAddItemRow = () => {
    setFormItems([...formItems, { itemName: "", quantity: 1, expectedPrice: "" }]);
  };

  const handleRemoveItemRow = (index) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = formItems.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setFormItems(updated);
  };

  // Dynamic Form items handlers (Edit Modal)
  const handleAddEditItemRow = () => {
    setEditFormItems([...editFormItems, { itemName: "", quantity: 1, expectedPrice: "" }]);
  };

  const handleRemoveEditItemRow = (index) => {
    if (editFormItems.length === 1) return;
    setEditFormItems(editFormItems.filter((_, idx) => idx !== index));
  };

  const handleEditItemChange = (index, field, value) => {
    const updated = editFormItems.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setEditFormItems(updated);
  };

  // Reset Add Form helper
  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setAdvancePayment("");
    setFormItems([{ itemName: "", quantity: 1, expectedPrice: "" }]);
  };

  // Submit Add Request Form
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!customerName) {
      alert("Please fill customer name.");
      return;
    }

    const invalidItems = formItems.some((it) => !it.itemName || it.quantity < 1);
    if (invalidItems) {
      alert("Please check that all items have a name and quantity of at least 1.");
      return;
    }

    const payload = {
      customerName,
      customerPhone,
      notes,
      advancePayment: advancePayment ? parseFloat(advancePayment) : 0,
      items: formItems.map((it) => ({
        itemName: it.itemName,
        quantity: parseInt(it.quantity),
        expectedPrice: it.expectedPrice ? parseFloat(it.expectedPrice) : 0,
      })),
    };

    dispatch(addRequest(payload))
      .unwrap()
      .then(() => {
        setShowAddModal(false);
        resetForm();
      })
      .catch((err) => {
        alert(err || "Failed to save request");
      });
  };

  // Open Edit Modal
  const openEditModal = (req) => {
    setCurrentRequest(req);
    setEditCustomerName(req.customerName || "");
    setEditCustomerPhone(req.customerPhone || "");
    setEditNotes(req.notes || "");
    setEditAdvancePayment(req.advancePayment || "");
    setEditStatus(req.status || "Pending");
    
    if (req.items && req.items.length > 0) {
      setEditFormItems(req.items.map((it) => ({
        itemName: it.itemName || "",
        quantity: it.quantity || 1,
        expectedPrice: it.expectedPrice || "",
      })));
    } else {
      setEditFormItems([{ itemName: "", quantity: 1, expectedPrice: "" }]);
    }
    
    setShowEditModal(true);
  };

  // Submit Edit Request Form
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editCustomerName) {
      alert("Please fill customer name.");
      return;
    }

    const invalidItems = editFormItems.some((it) => !it.itemName || it.quantity < 1);
    if (invalidItems) {
      alert("Please verify all items have valid names and quantities.");
      return;
    }

    const payload = {
      _id: currentRequest._id || currentRequest.id,
      customerName: editCustomerName,
      customerPhone: editCustomerPhone,
      notes: editNotes,
      advancePayment: editAdvancePayment ? parseFloat(editAdvancePayment) : 0,
      status: editStatus,
      items: editFormItems.map((it) => ({
        itemName: it.itemName,
        quantity: parseInt(it.quantity),
        expectedPrice: it.expectedPrice ? parseFloat(it.expectedPrice) : 0,
      })),
    };

    dispatch(updateRequest(payload))
      .unwrap()
      .then(() => {
        setShowEditModal(false);
        setCurrentRequest(null);
      })
      .catch((err) => {
        alert(err || "Failed to update request");
      });
  };

  // Direct Status Update
  const handleStatusChange = (req, newStatus) => {
    dispatch(
      updateRequest({
        _id: req._id || req.id,
        status: newStatus,
      })
    )
      .unwrap()
      .catch((err) => {
        alert(err || "Failed to change status");
      });
  };

  // Delete Request helper
  const handleDeleteRequest = (id) => {
    if (window.confirm("Are you sure you want to delete this request record?")) {
      dispatch(deleteRequest(id))
        .unwrap()
        .catch((err) => {
          alert(err || "Failed to delete request");
        });
    }
  };

  // Calculate expected total for a request
  const getExpectedTotal = (req) => {
    if (!req.items) return 0;
    return req.items.reduce((acc, curr) => acc + (curr.expectedPrice || 0) * (curr.quantity || 1), 0);
  };

  // Calculate total items count in a request
  const getItemsCount = (req) => {
    if (!req.items) return 0;
    return req.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  };

  // Helper to generate WhatsApp message link based on status
  const getWhatsAppLink = (req) => {
    let msg = "";
    const cleanPhone = (req.customerPhone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const itemsFormatted = req.items && req.items.length > 0
      ? req.items.map((it) => `• *${it.itemName.trim()}* × ${it.quantity}`).join("\n")
      : "• Requested items";

    const totalQty = req.items ? req.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0) : 0;
    const reqNum = req.requestNumber ? `🔖 *Req No:* ${req.requestNumber}\n` : "";
    const advanceInfo = req.advancePayment > 0 ? `💰 *Advance Paid:* ₹${req.advancePayment.toFixed(2)}\n` : "";
    const qtyInfo = totalQty > 0 ? `🔢 *Total Items:* ${totalQty}\n` : "";

    if (req.status === "Stock Received") {
      msg = `🎉 *GOOD NEWS - ITEMS READY FOR COLLECTION!*

Hello *${req.customerName}*,

Great news! Your requested items have arrived and are now ready to be picked up at *Bharatambe Traders*. 🛍️✨

📋 *Items Ready:*
${itemsFormatted}

${qtyInfo}${reqNum}${advanceInfo}
📍 *Pickup Location:* Bharatambe Traders
Please visit our shop at your earliest convenience to collect your items.

Thank you for your business! 🙏`;
    } else if (req.status === "Ordered from Supplier") {
      msg = `🚚 *ORDER UPDATE - BHARATAMBE TRADERS*

Hello *${req.customerName}*,

We have placed an order with our supplier for your requested items! 📦

📋 *Items Ordered:*
${itemsFormatted}

${qtyInfo}${reqNum}${advanceInfo}
⏳ We will notify you as soon as the stock arrives at our shop.

Thank you for choosing *Bharatambe Traders*! 🙏`;
    } else if (req.status === "Customer Collected") {
      msg = `✅ *ORDER COMPLETED - BHARATAMBE TRADERS*

Hello *${req.customerName}*,

Thank you for picking up your requested items from *Bharatambe Traders*! 🛍️

📋 *Collected Items:*
${itemsFormatted}

${reqNum}
We appreciate your business and look forward to serving you again! 🙏✨`;
    } else if (req.status === "Cancelled") {
      msg = `ℹ️ *REQUEST UPDATE - BHARATAMBE TRADERS*

Hello *${req.customerName}*,

Regarding your request ${req.requestNumber ? `(*${req.requestNumber}*)` : ""}:
${itemsFormatted}

This request status has been updated to *Cancelled*. If you have any questions, please reach out to us.

Thank you! - *Bharatambe Traders* 🙏`;
    } else {
      // Pending or default
      msg = `📋 *REQUEST RECEIVED - BHARATAMBE TRADERS*

Hello *${req.customerName}*,

We have noted down your request in our Request Book. ✍️

📦 *Requested Items:*
${itemsFormatted}

${qtyInfo}${reqNum}${advanceInfo}
🔎 We are checking availability with our suppliers and will update you shortly!

Thank you for choosing *Bharatambe Traders*! 🙏`;
    }

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Helper for status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Pending":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Ordered from Supplier":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "Stock Received":
        return "bg-green-500/10 text-green-400 border border-green-500/20 animate-pulse";
      case "Customer Collected":
        return "bg-slate-800 text-slate-400 border border-slate-700/50";
      case "Cancelled":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      {loading && <LoadingOverlay message="Updating Request Book..." />}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <FaClipboardList className="text-orange-500 text-2xl" />
            Customer Request Book
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Replace your paper notebook. Note down out-of-stock items requested by customers, track advance payments, and compile supplier orders.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg hover:shadow-orange-500/10 transition duration-200 text-xs md:text-sm"
        >
          <FaPlus size={12} />
          Add Customer Request
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Requests</span>
            <FaClipboardList className="text-slate-600 text-base" />
          </div>
          <p className="text-xl font-black text-slate-100 mt-2">{totalRequests}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">Pending Requests</span>
            <FaUserClock className="text-amber-500 text-base animate-pulse" />
          </div>
          <p className="text-xl font-black text-slate-100 mt-2">{pendingRequestsCount}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">Ordered from Supplier</span>
            <FaTruck className="text-blue-500 text-base" />
          </div>
          <p className="text-xl font-black text-slate-100 mt-2">{orderedRequestsCount}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-green-400 tracking-wider uppercase">Ready for Collection</span>
            <FaBoxOpen className="text-green-500 text-base" />
          </div>
          <p className="text-xl font-black text-green-400 mt-2">{readyRequestsCount}</p>
        </div>
      </div>

      {/* View Selector Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("list")}
          className={`py-3 px-5 font-bold text-xs uppercase tracking-wider transition ${
            activeTab === "list"
              ? "border-b-2 border-orange-500 text-orange-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Customer Request List
        </button>
        <button
          onClick={() => setActiveTab("supplier")}
          className={`py-3 px-5 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
            activeTab === "supplier"
              ? "border-b-2 border-orange-500 text-orange-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Supplier Order Helper
          {supplierChecklist.length > 0 && (
            <span className="bg-orange-500 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {supplierChecklist.length}
            </span>
          )}
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-center gap-3">
          <FaExclamationTriangle className="text-lg flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* TAB 1: CUSTOMER REQUEST LIST */}
      {activeTab === "list" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
          {/* Controls */}
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
            {/* Search Bar */}
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <IoSearch size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, item..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-orange-500 text-slate-200 placeholder-slate-500 rounded-xl text-xs focus:outline-none transition"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
              {["All", "Pending", "Ordered from Supplier", "Stock Received", "Customer Collected", "Cancelled"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition whitespace-nowrap ${
                      statusFilter === status
                        ? "bg-orange-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200 border border-slate-700/50"
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <FaClipboardList className="text-3xl text-slate-700" />
                <p className="text-xs">No customer requests found matching the criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="py-4 px-4 w-24">Req No.</th>
                    <th className="py-4 px-4 font-black">Customer Name</th>
                    <th className="py-4 px-4 w-32">Phone Number</th>
                    <th className="py-4 px-4">Requested Items</th>
                    <th className="py-4 px-4 w-20 text-center">Total Qty</th>
                    <th className="py-4 px-4 w-32">Expected Price</th>
                    <th className="py-4 px-4 w-28">Advance Paid</th>
                    <th className="py-4 px-4 w-36">Status</th>
                    <th className="py-4 px-4 text-right w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {filteredRequests.map((req) => (
                    <tr key={req._id || req.id} className="hover:bg-slate-850/30 text-xs transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        {req.requestNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {req.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {req.customerPhone || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-100">
                        <div className="space-y-1">
                          {req.items && req.items.map((it, idx) => (
                            <div key={idx} className="flex gap-1.5 items-center">
                              <span className="font-semibold">{it.itemName}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                                x{it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                        {getItemsCount(req)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-300">
                        {getExpectedTotal(req) > 0 ? `₹${getExpectedTotal(req).toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {req.advancePayment > 0 ? (
                          <span className="font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                            ₹{req.advancePayment.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {/* Call Client */}
                          {req.customerPhone ? (
                            <a
                              href={`tel:${req.customerPhone}`}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-orange-400 transition"
                              title="Call Customer"
                            >
                              <FaPhoneAlt size={10} />
                            </a>
                          ) : (
                            <button
                              disabled
                              className="p-1.5 rounded-lg bg-slate-850 text-slate-600 cursor-not-allowed"
                              title="No phone number"
                            >
                              <FaPhoneAlt size={10} />
                            </button>
                          )}

                          {/* WhatsApp Customer */}
                          {req.customerPhone ? (
                            <a
                              href={getWhatsAppLink(req)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-green-500 transition"
                              title="WhatsApp Customer"
                            >
                              <FaWhatsapp size={11} />
                            </a>
                          ) : (
                            <button
                              disabled
                              className="p-1.5 rounded-lg bg-slate-850 text-slate-600 cursor-not-allowed"
                              title="No phone number"
                            >
                              <FaWhatsapp size={11} />
                            </button>
                          )}

                          {/* Quick Status Shift to Ordered */}
                          {req.status === "Pending" && (
                            <button
                              onClick={() => handleStatusChange(req, "Ordered from Supplier")}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition"
                              title="Mark as Ordered"
                            >
                              <FaTruck size={11} />
                            </button>
                          )}

                          {/* Quick Status Shift to Received */}
                          {req.status === "Ordered from Supplier" && (
                            <button
                              onClick={() => handleStatusChange(req, "Stock Received")}
                              className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition"
                              title="Mark as Stock Received"
                            >
                              <FaBoxOpen size={11} />
                            </button>
                          )}

                          {/* Quick Status Shift to Collected */}
                          {req.status === "Stock Received" && (
                            <button
                              onClick={() => handleStatusChange(req, "Customer Collected")}
                              className="p-1.5 rounded-lg bg-slate-750 hover:bg-slate-700 text-slate-200 transition"
                              title="Mark as Collected"
                            >
                              <FaCheckCircle size={11} />
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(req)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-orange-400 transition"
                            title="Edit Request"
                          >
                            <FaEdit size={10} />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDeleteRequest(req._id || req.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-rose-500 transition"
                            title="Delete Request"
                          >
                            <FaTrashAlt size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIER CHECKLIST */}
      {activeTab === "supplier" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Purchase Checklist Helper</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Displays aggregate order quantities required for out-of-stock items, grouped across all customers.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyOrderList}
                className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs shadow transition active:scale-95"
                title="Copy formatted list for WhatsApp or Supplier Email"
              >
                <FaCopy size={11} />
                Copy Order List
              </button>
              <span className="text-xs bg-slate-950 text-slate-350 px-3 py-2 rounded-xl border border-slate-800/80 font-bold flex items-center">
                {supplierChecklist.length} Items to Order
              </span>
            </div>
          </div>

          {supplierChecklist.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <FaCheckCircle className="text-3xl text-slate-700" />
              <p className="text-xs">No pending or ordered customer requests to compile. All caught up!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplierChecklist.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-750 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-sm font-black text-slate-100 capitalize">
                        {item.originalName}
                      </h4>
                      <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-xs px-3 py-1 rounded-xl flex items-center gap-1.5 shadow">
                        Total: {item.totalQty}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Requested By ({item.customers.length})
                      </div>
                      <div className="divide-y divide-slate-800/40 max-h-40 overflow-y-auto pr-1">
                        {item.customers.map((c, idx) => (
                          <div key={idx} className="py-2 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-slate-300">{c.name}</div>
                              <div className="text-[10px] text-slate-555 text-slate-500">
                                Date: {new Date(c.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-orange-450 font-mono">
                                x{c.qty}
                              </span>
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                                c.status === "Pending" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10"
                              }`}>
                                {c.status === "Pending" ? "Pending" : "Ordered"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Supplier items */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        // Mark all pending/ordered requests for this item name to Stock Received
                        if (
                          window.confirm(
                            `Mark requests containing "${item.originalName}" as "Stock Received" for all listed customers?`
                          )
                        ) {
                          item.customers.forEach((c) => {
                            dispatch(updateRequest({ _id: c.id, status: "Stock Received" }));
                          });
                        }
                      }}
                      className="text-[10px] font-bold text-green-400 hover:text-green-300 bg-green-500/10 border border-green-500/25 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      <FaBoxOpen size={10} />
                      Receive Stock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <FaClipboardList className="text-orange-500" />
                Record Customer Request
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-orange-500 text-slate-200 px-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-orange-500 text-slate-200 px-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Dynamic Items Array */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Requested Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    <FaPlus size={8} /> Add Item Row
                  </button>
                </div>

                {formItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 relative group"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-[8px] font-bold text-slate-500 mb-1">
                        ITEM NAME <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Milton Bottle"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[8px] font-bold text-slate-500 mb-1">
                        QTY <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none text-center font-bold"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[8px] font-bold text-slate-500 mb-1">
                        PRICE (EACH)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.expectedPrice}
                        onChange={(e) => handleItemChange(index, "expectedPrice", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none font-bold"
                      />
                    </div>

                    {formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-950 border border-rose-800 text-rose-400 rounded-full flex items-center justify-center hover:bg-rose-900 transition text-[9px] shadow"
                        title="Remove row"
                      >
                        <FaTimes size={8} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Advance Payment Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Advance Payment (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4.5 flex items-center text-slate-500 text-xs font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 pl-8 pr-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition font-bold text-green-400 placeholder-slate-750"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Size, color, custom orders notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition h-10.5"
                  />
                </div>
              </div>

              {/* Submit Actions */}
              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow transition duration-200"
                >
                  Record Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <FaEdit className="text-orange-500" />
                Update Request Details
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-orange-500 text-slate-200 px-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-orange-500 text-slate-200 px-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Dynamic items editing list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Requested Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEditItemRow}
                    className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    <FaPlus size={8} /> Add Item Row
                  </button>
                </div>

                {editFormItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 relative group"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-[8px] font-bold text-slate-500 mb-1">
                        ITEM NAME <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.itemName}
                        onChange={(e) => handleEditItemChange(index, "itemName", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[8px] font-bold text-slate-500 mb-1">
                        QTY <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleEditItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none text-center font-bold"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[8px] font-bold text-slate-500 mb-1">
                        PRICE (EACH)
                      </label>
                      <input
                        type="number"
                        value={item.expectedPrice}
                        onChange={(e) => handleEditItemChange(index, "expectedPrice", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none font-bold"
                      />
                    </div>

                    {editFormItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEditItemRow(index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-950 border border-rose-800 text-rose-400 rounded-full flex items-center justify-center hover:bg-rose-900 transition text-[9px] shadow"
                        title="Remove row"
                      >
                        <FaTimes size={8} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Status and Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Status Flow
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition font-bold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Ordered from Supplier">Ordered from Supplier</option>
                    <option value="Stock Received">Stock Received (Ready for Collection)</option>
                    <option value="Customer Collected">Customer Collected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Advance Payment (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4.5 flex items-center text-slate-500 text-xs font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={editAdvancePayment}
                      onChange={(e) => setEditAdvancePayment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 pl-8 pr-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition font-bold text-green-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-orange-500 text-slate-200 px-4.5 py-2.5 rounded-xl text-xs focus:outline-none transition h-20 resize-none"
                />
              </div>

              {/* Submit Actions */}
              <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4.5 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow transition duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestBook;
