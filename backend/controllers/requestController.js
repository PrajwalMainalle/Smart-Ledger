const CustomerRequest = require("../models/CustomerRequest");
const Product = require("../models/Product");

// @desc    Get all customer requests for tenant
// @route   GET /api/requests
// @access  Private
const getRequests = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const requests = await CustomerRequest.find({ tenantId })
      .sort({ requestDate: -1 })
      .lean();
    res.json(requests);
  } catch (error) {
    console.error("Error in getRequests:", error);
    res.status(500).json({ message: "Server error fetching customer requests", error: error.message });
  }
};

// @desc    Create a new customer request
// @route   POST /api/requests
// @access  Private
const createRequest = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { customerName, customerPhone, itemName, quantity, expectedPrice, notes } = req.body;

    if (!customerName || !itemName || !quantity) {
      return res.status(400).json({ message: "Please provide customer name, item name, and quantity" });
    }

    // Auto-generate Request Number: Find the last request and increment
    const lastRequest = await CustomerRequest.findOne({ tenantId }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastRequest && lastRequest.requestNumber) {
      const match = lastRequest.requestNumber.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0]) + 1;
      }
    }
    const requestNumber = `REQ-${String(nextNum).padStart(5, "0")}`;

    const newRequest = await CustomerRequest.create({
      tenantId,
      requestNumber,
      customerName,
      customerPhone: customerPhone || "",
      itemName,
      quantity: Number(quantity),
      expectedPrice: expectedPrice ? Number(expectedPrice) : 0,
      notes: notes || "",
      status: "Pending",
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error("Error in createRequest:", error);
    res.status(500).json({ message: "Server error creating customer request", error: error.message });
  }
};

// @desc    Update a customer request
// @route   PUT /api/requests/:id
// @access  Private
const updateRequest = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { customerName, customerPhone, itemName, quantity, expectedPrice, notes, status } = req.body;

    const request = await CustomerRequest.findOne({ _id: req.params.id, tenantId });

    if (!request) {
      return res.status(404).json({ message: "Customer request not found or unauthorized" });
    }

    if (customerName !== undefined) request.customerName = customerName;
    if (customerPhone !== undefined) request.customerPhone = customerPhone;
    if (itemName !== undefined) request.itemName = itemName;
    if (quantity !== undefined) request.quantity = Number(quantity);
    if (expectedPrice !== undefined) request.expectedPrice = Number(expectedPrice);
    if (notes !== undefined) request.notes = notes;
    if (status !== undefined) {
      const validStatuses = ["Pending", "Ordered from Supplier", "Stock Received", "Customer Collected", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      request.status = status;
    }

    const updatedRequest = await request.save();
    res.json(updatedRequest);
  } catch (error) {
    console.error("Error in updateRequest:", error);
    res.status(500).json({ message: "Server error updating customer request", error: error.message });
  }
};

// @desc    Delete a customer request
// @route   DELETE /api/requests/:id
// @access  Private
const deleteRequest = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const request = await CustomerRequest.findOneAndDelete({ _id: req.params.id, tenantId });

    if (!request) {
      return res.status(404).json({ message: "Customer request not found or unauthorized" });
    }

    res.json({ message: "Customer request deleted successfully" });
  } catch (error) {
    console.error("Error in deleteRequest:", error);
    res.status(500).json({ message: "Server error deleting customer request", error: error.message });
  }
};

// @desc    Get dashboard and daily reminder statistics for customer requests and out of stock items
// @route   GET /api/requests/reminders
// @access  Private
const getReminderStats = async (req, res) => {
  try {
    const tenantId = req.user._id;

    // Count pending requests
    const pendingCount = await CustomerRequest.countDocuments({
      tenantId,
      status: "Pending",
    });

    // Count items ready for collection (Stock Received)
    const readyCount = await CustomerRequest.countDocuments({
      tenantId,
      status: "Stock Received",
    });

    // Count out-of-stock products
    const outOfStockCount = await Product.countDocuments({
      tenantId,
      stock: { $lte: 0 },
    });

    res.json({
      pendingRequests: pendingCount,
      readyRequests: readyCount,
      outOfStockProducts: outOfStockCount,
    });
  } catch (error) {
    console.error("Error in getReminderStats:", error);
    res.status(500).json({ message: "Server error fetching reminder statistics", error: error.message });
  }
};

module.exports = {
  getRequests,
  createRequest,
  updateRequest,
  deleteRequest,
  getReminderStats,
};
