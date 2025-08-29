// src/App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet, // Keep Outlet if you want a shared header/footer for auth routes, but typically not needed for raw links.
  Link,   // Import Link for direct navigation
} from 'react-router-dom';

// Import all your page components
// import Shell from './layout/Shell'; // NO LONGER USED
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LandlordDashboard from './pages/LandlordDashboard';
import LeaseDetailPage from './pages/LeaseDetailPage';
import NotificationsFeed from './pages/NotificationsFeed';
import PaymentPage from './pages/PaymentPage';
import PaymentResultPage from './pages/PaymentResultPage';
import RepairRequestFormPage from './pages/RepairRequestFormPage';
import NoPage from './pages/NoPage';
import PropertiesListPage from './pages/PropertiesListPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import PropertyFormPage from './pages/PropertyFormPage';
import SignupForm from './pages/SignupForm'; // Ensure correct import name: SignupForm
import LoginForm from './pages/LoginForm';   // Ensure correct import name: LoginForm
import LeaseFormPage from './pages/LeaseFormPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import VacateFormPage from './pages/VacateFormPage';
import AdminDashboard from './pages/AdminDashboard';


// --- Auth Helper Functions and Components ---
const isAuthenticated = () => {
  return localStorage.getItem('accessToken') !== null;
};

// Layout for authenticated users, including basic navigation
const AuthenticatedLayout = ({ children }) => {
  // You would typically have a more sophisticated navigation bar here,
  // perhaps dynamically generated based on user role.
  // For this request, a simple list of links.
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/auth/login'; // Redirect to login
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b p-4 flex justify-between items-center">
        <div className="flex space-x-4">
          <Link to="/" className="text-blue-600 hover:underline">Home</Link>
          <Link to="/dashboard" className="text-blue-600 hover:underline">My Dashboard</Link>
          <Link to="/landlord-dashboard" className="text-blue-600 hover:underline">Landlord Dashboard</Link>
          <Link to="/tenant/dashboard" className="text-blue-600 hover:underline">Tenant Dashboard</Link>
          <Link to="/admin/dashboard" className="text-blue-600 hover:underline">Admin Dashboard</Link>
          <Link to="/properties" className="text-blue-600 hover:underline">Properties</Link>
          <Link to="/properties/new" className="text-blue-600 hover:underline">Add Property</Link>
          <Link to="/leases-booking" className="text-blue-600 hover:underline">Book Lease</Link>
          <Link to="/notifications" className="text-blue-600 hover:underline">Notifications</Link>
          <Link to="/payment" className="text-blue-600 hover:underline">Make Payment</Link>
          {/* Add more links as needed */}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        {children} {/* This will render the actual page component */}
      </main>
    </div>
  );
};


const PrivateRoute = ({ element }) => {
  return isAuthenticated() ? <AuthenticatedLayout>{element}</AuthenticatedLayout> : <Navigate to="/auth/login" replace />;
};

const PublicOnlyRoute = ({ element }) => {
  return !isAuthenticated() ? element : <Navigate to="/" replace />; // Redirect to default authenticated route (HomePage)
};

const RoleBasedDashboardResolver = () => {
  const userString = localStorage.getItem('user');
  let role = null;
  if (userString) {
    try {
      const user = JSON.parse(userString);
      role = user.role;
    } catch (e) {
      console.error("Error parsing user data from localStorage", e);
    }
  }

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'landlord':
      return <LandlordDashboard />;
    case 'tenant':
      return <TenantDashboardPage />;
    default:
      return <HomePage />;
  }
};


export default function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page for unauthenticated users (login/register) */}
        <Route path="/" element={<PublicOnlyRoute element={<LoginForm />} />} />

        {/* Auth Routes */}
        <Route path="/auth/register" element={<PublicOnlyRoute element={<SignupForm />} />} />
        <Route path="/auth/login" element={<PublicOnlyRoute element={<LoginForm />} />} />

        {/* Protected Routes - require authentication and use the AuthenticatedLayout */}
        <Route path="/home" element={<PrivateRoute element={<HomePage />} />} />
        <Route path="/dashboard" element={<PrivateRoute element={<RoleBasedDashboardResolver />} />} />
        <Route path="/landlord-dashboard" element={<PrivateRoute element={<LandlordDashboard />} />} />
        <Route path="/tenant/dashboard" element={<PrivateRoute element={<TenantDashboardPage />} />} />
        <Route path="/admin/dashboard" element={<PrivateRoute element={<AdminDashboard />} />} />

        <Route path="/properties" element={<PrivateRoute element={<PropertiesListPage />} />} />
        <Route path="/properties/new" element={<PrivateRoute element={<PropertyFormPage />} />} />
        <Route path="/properties/:id" element={<PrivateRoute element={<PropertyDetailsPage />} />} />
        <Route path="/properties/:id/edit" element={<PrivateRoute element={<PropertyFormPage />} />} />

        <Route path="/leases-booking" element={<PrivateRoute element={<LeaseFormPage />} />} />
        <Route path="/leases/:leaseId" element={<PrivateRoute element={<LeaseDetailPage />} />} />
        <Route path="/leases/:leaseId/vacate" element={<PrivateRoute element={<VacateFormPage />} />} />

        <Route path="/payment" element={<PrivateRoute element={<PaymentPage />} />} />
        <Route path="/payments/result/:paymentId" element={<PrivateRoute element={<PaymentResultPage />} />} />
        <Route path="/properties/:propertyId/repair-request" element={<PrivateRoute element={<RepairRequestFormPage />} />} />

        <Route path="/notifications" element={<PrivateRoute element={<NotificationsFeed />} />} />

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<NoPage />} />
      </Routes>
    </Router>
  );
}