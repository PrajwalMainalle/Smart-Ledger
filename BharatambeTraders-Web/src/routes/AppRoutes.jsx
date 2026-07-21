import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import publicRoutes from "./PublicRoutes";

import MainLayout from "../layouts/MainLayout";
import DashboardPage from "../features/dashboard/screens/Dashboard";
import POSPage from "../features/billing/screens/POS";
import InvoiceListPage from "../features/billing/screens/InvoiceList";
import ProductListPage from "../features/inventory/screens/ProductList";
import ReportsPage from "../features/reports/screens/Reports";
import SettingsPage from "../features/profile/screens/Settings";
import CustomerListPage from "../features/customers/screens/CustomerList";
import PurchaseListPage from "../features/purchases/screens/PurchaseList";
import RequestBookPage from "../features/requests/screens/RequestBook";
import ProtectedRoute from "./ProtectedRoute";
import GstDashboard from "../features/gst/screens/GstDashboard";
import GstSales from "../features/gst/screens/GstSales";
import GstPurchases from "../features/gst/screens/GstPurchases";
import GstSummary from "../features/gst/screens/GstSummary";
import GstInventory from "../features/gst/screens/GstInventory";
import GstCAReports from "../features/gst/screens/GstCAReports";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        {publicRoutes.map(({ path, element }, index) => (
          <Route key={index} path={path} element={element} />
        ))}

        {/* Layout Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/home" element={<DashboardPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/invoices" element={<InvoiceListPage />} />
            <Route path="/inventory" element={<ProductListPage />} />
            <Route path="/request-book" element={<RequestBookPage />} />
            <Route path="/customers" element={<CustomerListPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/purchases" element={<PurchaseListPage />} />
            <Route path="/gst/dashboard" element={<GstDashboard />} />
            <Route path="/gst/sales" element={<GstSales />} />
            <Route path="/gst/purchases" element={<GstPurchases />} />
            <Route path="/gst/summary" element={<GstSummary />} />
            <Route path="/gst/inventory" element={<GstInventory />} />
            <Route path="/gst/ca-reports" element={<GstCAReports />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
