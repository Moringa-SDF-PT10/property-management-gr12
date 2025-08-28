import { Link, useLocation, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, Building2, Plus, Bell } from "lucide-react";

function TopNavLink({ to, icon, children, active }) {
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border ${
        active
          ? "bg-slate-900 text-white border-slate-900 shadow"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}


export default function Shell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-slate-200"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 grid place-items-center rounded-2xl bg-slate-900 text-white shadow-md">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">Rent</div>
              <div className="text-xs text-slate-500 -mt-0.5">Property Manager</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <TopNavLink
              to="/"
              icon={<LayoutDashboard className="h-4 w-4" />}
              active={location.pathname === "/"}
            >
              Dashboard
            </TopNavLink>
            <TopNavLink
              to="/properties"
              icon={<Building2 className="h-4 w-4" />}
              active={location.pathname.startsWith("/properties")}
            >
              Properties
            </TopNavLink>
            <TopNavLink
              to="/properties/new"
              icon={<Plus className="h-4 w-4" />}
              active={location.pathname === "/properties/new"}
            >
              Add
            </TopNavLink>
            <TopNavLink
              to="/notifications"
              icon={<Plus className="h-4 w-4" />} 
              active={location.pathname === "/notifications"}
            >
              Notifications
            </TopNavLink>
          </nav>
        </div>
      </motion.header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-slate-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Rent</span>
        </div>
      </footer>
    </div>
  );
}