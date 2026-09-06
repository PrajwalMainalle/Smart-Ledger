const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

// Load Environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase JSON limit to support base64 logo uploads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve Static Files (Invoice PDFs and images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount API Routers
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/billing", require("./routes/billingRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/purchases", require("./routes/purchaseRoutes"));
app.use("/api/gst", require("./routes/gstRoutes"));
app.use("/api/requests", require("./routes/requestRoutes"));
app.use("/api/gov-funds", require("./routes/govFundRoutes"));
app.use("/api/superadmin", require("./routes/superadminRoutes"));

// Catch-all route for test/health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Smart Ledger API Engine is running" });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected server error occurred",
    error: process.env.NODE_ENV === "production" ? {} : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
