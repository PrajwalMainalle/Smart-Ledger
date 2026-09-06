import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import publicRoutes from "./PublicRoutes";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import LoadingOverlay from "../components/LoadingOverlay";
import ErrorBoundary from "../components/ErrorBoundary";
import lazyWithRetry from "../utils/lazyWithRetry";

// Lazy-loaded page features with deployment retry resilience
const DashboardPage = lazyWithRetry(() => import("../features/dashboard/screens/Dashboard"));
const POSPage = lazyWithRetry(() => import("../features/billing/screens/POS"));
const InvoiceListPage = lazyWithRetry(() => import("../features/billing/screens/InvoiceList"));
const ProductListPage = lazyWithRetry(() => import("../features/inventory/screens/ProductList"));
const ReportsPage = lazyWithRetry(() => import("../features/reports/screens/Reports"));
const SettingsPage = lazyWithRetry(() => import("../features/profile/screens/Settings"));
const CustomerListPage = lazyWithRetry(() => import("../features/customers/screens/CustomerList"));
const PurchaseListPage = lazyWithRetry(() => import("../features/purchases/screens/PurchaseList"));
const RequestBookPage = lazyWithRetry(() => import("../features/requests/screens/RequestBook"));
const QuotationListPage = lazyWithRetry(() => import("../features/quotations/screens/QuotationList"));
const GovSchoolsPage = lazyWithRetry(() => import("../features/gov-funds/screens/GovSchoolsPage"));
const GstDashboard = lazyWithRetry(() => import("../features/gst/screens/GstDashboard"));
const GstSales = lazyWithRetry(() => import("../features/gst/screens/GstSales"));
const GstPurchases = lazyWithRetry(() => import("../features/gst/screens/GstPurchases"));
const GstSummary = lazyWithRetry(() => import("../features/gst/screens/GstSummary"));
const GstInventory = lazyWithRetry(() => import("../features/gst/screens/GstInventory"));
const GstCAReports = lazyWithRetry(() => import("../features/gst/screens/GstCAReports"));
const SuperadminPortal = lazyWithRetry(() => import("../features/superadmin/SuperadminPortal"));

const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingOverlay message="Initializing Smart Ledger module..." />}>
        <Routes>

          {/* Superadmin Backoffice Route */}
          <Route path="/superadmin" element={<SuperadminPortal />} />

          {/* Public Routes */}
          {publicRoutes.map(({ path, element }, index) => (
            <Route key={index} path={path} element={element} />
          ))}

          {/* Layout Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/home" element={<DashboardPage />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/billing" element={<POSPage />} />
              <Route path="/invoices" element={<InvoiceListPage />} />
              <Route path="/inventory" element={<ProductListPage />} />
              <Route path="/request-book" element={<RequestBookPage />} />
              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/purchases" element={<PurchaseListPage />} />
              <Route path="/quotations" element={<QuotationListPage />} />
              <Route path="/gst/dashboard" element={<GstDashboard />} />
              <Route path="/gst/sales" element={<GstSales />} />
              <Route path="/gst/purchases" element={<GstPurchases />} />
              <Route path="/gst/summary" element={<GstSummary />} />
              <Route path="/gst/inventory" element={<GstInventory />} />
              <Route path="/gst/ca-reports" element={<GstCAReports />} />

              {/* Government Schools Panel Route */}
              <Route path="/gov-schools" element={<GovSchoolsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default AppRoutes;
