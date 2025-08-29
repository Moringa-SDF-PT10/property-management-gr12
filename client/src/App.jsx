import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Shell from "./layout/Shell";
import HomePage from "./pages/HomePagePage";
import DashboardPage from "./pages/DashboardPage";
import PropertiesListPage from "./pages/PropertiesListPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import PropertyFormPage from "./pages/PropertyFormPage";
import SignupForm from "./pages/SignupFormPage";
import LoginForm from "./pages/LoginFormPage";

export default function App() {
  return (

      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/register" element={<SignupForm />} />
          <Route path="/auth/login" element={<LoginForm />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesListPage />} />
          <Route path="/properties/new" element={<PropertyFormPage />} />
          <Route path="/properties/:id" element={<PropertyDetailsPage />} />
          <Route path="/properties/:id/edit" element={<PropertyFormPage />} />
          
        </Routes>
      </Shell>

  );
}
