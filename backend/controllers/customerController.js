const Customer = require("../models/Customer");
const CustomerLedger = require("../models/CustomerLedger");

// @desc    Get all customers for tenant
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ tenantId: req.user._id }).sort({ name: 1 }).lean();
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching customers list" });
  }
};

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  const { name, phone, customerType, priceCategory, creditReminderDays } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: "Please provide customer name and phone number" });
  }

  try {
    // Check if phone already exists for this tenant
    const customerExists = await Customer.findOne({ tenantId: req.user._id, phone });
    if (customerExists) {
      return res.status(400).json({ message: `A customer with phone number '${phone}' already exists` });
    }

    let parsedDays = null;
    if (creditReminderDays !== undefined && creditReminderDays !== "" && creditReminderDays !== null) {
      const num = parseInt(creditReminderDays, 10);
      if (!isNaN(num) && num >= 1) parsedDays = num;
    }

    const customer = await Customer.create({
      tenantId: req.user._id,
      name,
      phone,
      customerType: customerType || "Retail",
      priceCategory: priceCategory || "retail",
      creditReminderDays: parsedDays,
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating customer", error: error.message });
  }
};

// @desc    Update an existing customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  const { name, phone, customerType, priceCategory, creditReminderDays } = req.body;

  try {
    const customer = await Customer.findOne({ _id: req.params.id, tenantId: req.user._id });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found or unauthorized" });
    }

    // Check phone number conflict
    if (phone && phone !== customer.phone) {
      const phoneConflict = await Customer.findOne({
        tenantId: req.user._id,
        phone,
        _id: { $ne: req.params.id },
      });
      if (phoneConflict) {
        return res.status(400).json({ message: `Phone number '${phone}' is already in use by another customer` });
      }
    }

    customer.name = name !== undefined ? name : customer.name;
    customer.phone = phone !== undefined ? phone : customer.phone;
    customer.customerType = customerType !== undefined ? customerType : customer.customerType;
    customer.priceCategory = priceCategory !== undefined ? priceCategory : customer.priceCategory;

    if (creditReminderDays !== undefined) {
      if (creditReminderDays === "" || creditReminderDays === null) {
        customer.creditReminderDays = null;
      } else {
        const num = parseInt(creditReminderDays, 10);
        customer.creditReminderDays = !isNaN(num) && num >= 1 ? num : null;
      }
    }

    const updatedCustomer = await customer.save();
    res.json(updatedCustomer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating customer", error: error.message });
  }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found or unauthorized" });
    }

    res.json({ message: "Customer removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting customer" });
  }
};

// @desc    Get ledger for a customer
// @route   GET /api/customers/:id/ledger
// @access  Private
const getCustomerLedger = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, tenantId: req.user._id });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found or unauthorized" });
    }

    const ledger = await CustomerLedger.find({
      tenantId: req.user._id,
      customerId: req.params.id,
    }).sort({ date: 1 });

    res.json({
      customer,
      ledger,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching customer ledger" });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
};
