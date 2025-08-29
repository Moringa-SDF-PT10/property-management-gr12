import LandlordDashboard from './pages/LandlordDashboard.jsx';
import LeaseDetailPage from './pages/LeaseDetailPage.jsx';
import NotificationsFeed from './pages/NotificationsFeed.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import PaymentResultPage from './pages/PaymentResultPage.jsx';
import RepairRequestFormPage from './pages/RepairRequestFormPage.jsx';
import NoPage from './pages/NoPage.jsx';
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
// import Shell from "./layout/Shell"; // Not used, can be removed
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import PropertiesListPage from "./pages/PropertiesListPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import PropertyFormPage from "./pages/PropertyFormPage";
import LeaseFormPage from "./pages/LeaseFormPage";
import TenantDashboardPage from "./pages/TenantDashboardPage";
import VacateFormPage from "./pages/VacateFormPage";

export default function App() {
  return (
    <div>
      <BrowserRouter>
        <nav className="bg-gray-800 p-4 shadow-md">
          <ul className="flex space-x-6">
            <li>
              <Link to="/" className="text-white hover:text-gray-300">
                Landlord Dashboard (Home)
              </Link>
            </li>
            <li>
              <Link
                to="/tenant/dashboard"
                className="text-white hover:text-gray-300"
              >
                Tenant Dashboard
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="text-white hover:text-gray-300">
                General Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/properties"
                className="text-white hover:text-gray-300"
              >
                Properties
              </Link>
            </li>
            <li>
              <Link
                to="/properties/new"
                className="text-white hover:text-gray-300"
              >
                Add Property
              </Link>
            </li>
            <li>
              <Link
                to="/leases-booking"
                className="text-white hover:text-gray-300"
              >
                Create Lease
              </Link>
            </li>
            <li>
              <Link
                to="/notifications"
                className="text-white hover:text-gray-300"
              >
                Notifications
              </Link>
            </li>
            <li>
              <Link to="/payment" className="text-white hover:text-gray-300">
                Make Payment
              </Link>
            </li>

          </ul>
        </nav>

        <Routes>

          <Route path="/" element={<LandlordDashboard />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesListPage />} />
          <Route path="/properties/new" element={<PropertyFormPage />} />
          <Route path="/properties/:id" element={<PropertyDetailsPage />} />
          <Route path="/properties/:id/edit" element={<PropertyFormPage />} />
          <Route path="/leases-booking" element={<LeaseFormPage />} />
          <Route path="/tenant/dashboard" element={<TenantDashboardPage />} />
          <Route
            path="/leases/:leaseId/vacate"
            element={<VacateFormPage />}
          />
          <Route path="/leases/:leaseId" element={<LeaseDetailPage />} />
          <Route path="/notifications" element={<NotificationsFeed />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route
            path="/payments/result/:paymentId"
            element={<PaymentResultPage />}
          />
          <Route
            path="/properties/:propertyId/repair-request"
            element={<RepairRequestFormPage />}
          />
          <Route path="*" element={<NoPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}