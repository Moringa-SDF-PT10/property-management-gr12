import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = ({ isPublic = false }) => {
  const navigate = useNavigate();

  // Check if user is authenticated
  const isAuthenticated = () => {
    return (
      localStorage.getItem("user") !== null &&
      localStorage.getItem("accessToken") !== null
    );
  };

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    // Redirect to home
    navigate("/");
  };

  const handleDashboardRedirect = () => {
    const user = getUser();

    if (!user || !user.role) {
      navigate("/"); // fallback
      return;
    }

    // Switch based on role
    switch (user.role.toLowerCase()) {
      case "landlord":
        navigate("/landlord/dashboard");
        break;
      case "tenant":
        navigate("/tenant/dashboard");
        break;
      case "admin":
        navigate("/admin/dashboard");
        break;
      default:
        navigate("/"); // fallback
        break;
    }
  };

  const user = getUser();
  const isLoggedIn = isAuthenticated();

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold">
        🏠 PropertyHub
      </Link>

      <div className="flex gap-4 items-center">
        {!isLoggedIn ? (
          // Show login/signup for non-authenticated users
          <>
            <Link
              to="/auth/login"
              className="hover:text-green-400 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/auth/register"
              className="hover:text-green-400 transition-colors"
            >
              Signup
            </Link>
          </>
        ) : (
          // Show dashboard and logout for authenticated users
          <>
            <button
              onClick={handleDashboardRedirect}
              className="hover:text-green-400 transition-colors"
            >
              Dashboard
            </button>
            <span className="text-gray-300 text-sm">
              Welcome, {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;