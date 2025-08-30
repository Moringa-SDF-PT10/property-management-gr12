// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Layout
import Navbar from "./pages/navbar";

// Pages
import HomePage from "./pages/HomePage";
import LoginForm from "./pages/LoginForm";
import SignupForm from "./pages/SignupForm";
import LandlordDashboard from "./pages/LandlordDashboard";
import TenantDashboardPage from "./pages/TenantDashboardPage";
import AdminDashboard from "./pages/AdminDashboard";
import PropertiesListPage from "./pages/PropertiesListPage";
import PropertyFormPage from "./pages/PropertyFormPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import LeaseFormPage from "./pages/LeaseFormPage";
import LeaseDetailPage from "./pages/LeaseDetailPage";
import VacateFormPage from "./pages/VacateFormPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import RepairRequestFormPage from "./pages/RepairRequestFormPage";
import NotificationsFeed from "./pages/NotificationsFeed";
import NoPage from "./pages/NoPage";

// ✅ check auth status via localStorage
const isAuthenticated = () => {
  return localStorage.getItem("user") !== null && localStorage.getItem("accessToken") !== null;
};

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

// ✅ Layouts
const AuthenticatedLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-100">
    <Navbar />
    <main className="p-6">{children}</main>
  </div>
);

const PublicLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar isPublic={true} />
    <main className="p-6">{children}</main>
  </div>
);

// ✅ Route Wrappers
const PrivateRoute = ({ element }) => {
  return isAuthenticated() ? (
    <AuthenticatedLayout>{element}</AuthenticatedLayout>
  ) : (
    <Navigate to="/auth/login" />
  );
};

const PublicOnlyRoute = ({ element }) => {
  return isAuthenticated() ? (
    <Navigate to="/dashboard" />
  ) : (
    <PublicLayout>{element}</PublicLayout>
  );
};

// ✅ Role-based dashboard resolver
const RoleBasedDashboardResolver = () => {
  const user = getUser();

  if (!user) return <Navigate to="/auth/login" />;

  switch (user.role) {
    case "landlord":
      return <LandlordDashboard />;
    case "tenant":
      return <TenantDashboardPage />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <Navigate to="/auth/login" />;
  }
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/auth/register" element={<PublicOnlyRoute element={<SignupForm />} />} />
        <Route path="/auth/login" element={<PublicOnlyRoute element={<LoginForm />} />} />

        {/* Protected - Main dashboard that routes based on role */}
        <Route path="/dashboard" element={<PrivateRoute element={<RoleBasedDashboardResolver />} />} />

        {/* Protected - Direct role-specific dashboards */}
        <Route path="/landlord/dashboard" element={<PrivateRoute element={<LandlordDashboard />} />} />
        <Route path="/tenant/dashboard" element={<PrivateRoute element={<TenantDashboardPage />} />} />
        <Route path="/admin/dashboard" element={<PrivateRoute element={<AdminDashboard />} />} />

        {/* Protected - Property routes */}
        <Route path="/properties" element={<PrivateRoute element={<PropertiesListPage />} />} />
        <Route path="/properties/new" element={<PrivateRoute element={<PropertyFormPage />} />} />
        <Route path="/properties/:id" element={<PrivateRoute element={<PropertyDetailsPage />} />} />
        <Route path="/properties/:id/edit" element={<PrivateRoute element={<PropertyFormPage />} />} />

        {/* Protected - Lease routes */}
        <Route path="/properties/:propertyId/lease" element={<PrivateRoute element={<LeaseFormPage />} />} />
        <Route path="/leases/new" element={<PrivateRoute element={<LeaseFormPage />} />} />
        <Route path="/leases/:leaseId" element={<PrivateRoute element={<LeaseDetailPage />} />} />
        <Route path="/leases/:leaseId/vacate" element={<PrivateRoute element={<VacateFormPage />} />} />

        {/* Protected - Payment routes */}
        <Route path="/payment" element={<PrivateRoute element={<PaymentPage />} />} />
        <Route path="/payments/result/:paymentId" element={<PrivateRoute element={<PaymentResultPage />} />} />

        {/* Protected - Other routes */}
        <Route path="/properties/:propertyId/repair-request" element={<PrivateRoute element={<RepairRequestFormPage />} />} />
        <Route path="/notifications" element={<PrivateRoute element={<NotificationsFeed />} />} />

        {/* Catch-all */}
        <Route path="*" element={<NoPage />} />
      </Routes>
    </Router>
  );
}