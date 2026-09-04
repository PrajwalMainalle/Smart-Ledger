import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import publicRoutes from "./PublicRoutes";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import LoadingOverlay from "../components/LoadingOverlay";
import ErrorBoundary from "../components/ErrorBoundary";

// Lazy-loaded page features for route code-splitting
const DashboardPage = lazy(() => import("../features/dashboard/screens/Dashboard"));
const POSPage = lazy(() => import("../features/billing/screens/POS"));
const InvoiceListPage = lazy(() => import("../features/billing/screens/InvoiceList"));
const ProductListPage = lazy(() => import("../features/inventory/screens/ProductList"));
const ReportsPage = lazy(() => import("../features/reports/screens/Reports"));
const SettingsPage = lazy(() => import("../features/profile/screens/Settings"));
const CustomerListPage = lazy(() => import("../features/customers/screens/CustomerList"));
const PurchaseListPage = lazy(() => import("../features/purchases/screens/PurchaseList"));
const RequestBookPage = lazy(() => import("../features/requests/screens/RequestBook"));
const QuotationListPage = lazy(() => import("../features/quotations/screens/QuotationList"));
const GovSchoolsPage = lazy(() => import("../features/gov-funds/screens/GovSchoolsPage"));
const GstDashboard = lazy(() => import("../features/gst/screens/GstDashboard"));
const GstSales = lazy(() => import("../features/gst/screens/GstSales"));
const GstPurchases = lazy(() => import("../features/gst/screens/GstPurchases"));
const GstSummary = lazy(() => import("../features/gst/screens/GstSummary"));
const GstInventory = lazy(() => import("../features/gst/screens/GstInventory"));
const GstCAReports = lazy(() => import("../features/gst/screens/GstCAReports"));

const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingOverlay message="Loading portal view..." />}>
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
