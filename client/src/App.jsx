// src/App.jsx
import { Route, Routes } from 'react-router-dom';
// import Shell from './pages/Shell.jsx';
import Shell from './layout/Shell.jsx';


// Existing Pages
// import HomePage from './pages/HomePage.jsx'; // You might still use HomePage, but not at "/"
import DashboardPage from './pages/DashboardPage.jsx';

// NEW Pages
import LandlordDashboard from './pages/LandlordDashboard.jsx'; // Import the LandlordDashboard
import LeaseDetailPage from './pages/LeaseDetailPage.jsx';
import NotificationsFeed from './pages/NotificationsFeed.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import PaymentResultPage from './pages/PaymentResultPage.jsx';
import RepairRequestFormPage from './pages/RepairRequestFormPage.jsx';
import NoPage from './pages/NoPage.jsx';

function App() {
  return (
    <Shell>
      <Routes>
        {/* Make LandlordDashboard the default root page */}
        <Route path="/" element={<LandlordDashboard />} />

        {/* You can still keep HomePage at a different path if you want, e.g., /home */}
        {/* <Route path="/home" element={<HomePage />} /> */}

        {/* Your existing dashboard page (which currently says "Landlord Dashboard")
            might be renamed or merged with the new LandlordDashboard
            Consider if you need both. For now, keeping it here. */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Other new routes */}
        {/* The route below is now redundant if "/" points to LandlordDashboard */}
        {/* <Route path="/landlord-dashboard" element={<LandlordDashboard />} /> */}
        {/* If you want to keep a separate explicit route to the landlord dashboard,
            you can, but it might be confusing if "/" also goes there.
            A common pattern is to redirect from /landlord-dashboard to / if / is the primary. */}
        <Route path="/leases/:leaseId" element={<LeaseDetailPage />} />
        <Route path="/notifications" element={<NotificationsFeed />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payments/result/:paymentId" element={<PaymentResultPage />} />
        <Route path="/properties/:propertyId/repair-request" element={<RepairRequestFormPage />} />

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<NoPage />} />
      </Routes>
    </Shell>
  );
}

export default App;