import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Shell from "./layout/Shell";
import HomePage from "./pages/HomePagePage";
import DashboardPage from "./pages/DashboardPage";
import PropertiesListPage from "./pages/PropertiesListPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import PropertyFormPage from "./pages/PropertyFormPage";
import LeaseFormPage from "./pages/LeaseFormPage";
import TenantDashboardPage from "./pages/TenantDashboardPage";
import VacateFormPage from "./pages/VacateFormPage";
export default function App() {
  return (

      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesListPage />} />
          <Route path="/properties/new" element={<PropertyFormPage />} />
          <Route path="/properties/:id" element={<PropertyDetailsPage />} />
          <Route path="/properties/:id/edit" element={<PropertyFormPage />} />
          <Route path="/leases-booking" element={<LeaseFormPage />} />
          <Route path="/tenant/dashboard" element={<TenantDashboardPage />} />
          <Route path= "/leases/:leaseId/vacate" element={<VacateFormPage />} />
          
        </Routes>
      </Shell>

  );
}
