import React, { useState, useEffect } from "react";
import TenantTable from "./TenantPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Bell, ClipboardList, TrendingUp, Home, Users, DollarSign, AlertTriangle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import InlineError from "../components/InlineError";

const LandlordDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchPaymentData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await fetch("http://localhost:5000/landlord/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, redirect to login
          localStorage.clear();
          navigate("/auth/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data.dashboard);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    }
  };

  const fetchPaymentData = async () => {
    try {
      const response = await fetch("http://localhost:5000/landlord/payments/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
      }
    } catch (err) {
      console.error("Failed to fetch payment data:", err);
      // Don't set error for payment data as it's supplementary
    } finally {
      setLoading(false);
    }
  };

  const sendRentReminders = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/reminders/rent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(result.message || "Rent reminders sent successfully!");
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error("Failed to send reminders:", err);
      alert(`Failed to send reminders: ${err.message}`);
    }
  };

  const generateReport = () => {
    // Navigate to reports page or trigger report generation
    window.open("/reports/monthly", "_blank");
  };

  const viewRepairRequests = () => {
    navigate("/maintenance/requests");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
        <p className="ml-3 text-slate-500">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return <InlineError message={error} />;
  }

  if (!dashboardData) {
    return <div className="text-center text-red-600">No dashboard data available.</div>;
  }

  // Use payment data if available, otherwise fall back to dashboard data
  const summary = paymentData?.summary || dashboardData?.summary || {};
  const upToDateTenants = paymentData?.up_to_date_tenants || dashboardData?.up_to_date_tenants || [];
  const behindTenants = paymentData?.behind_tenants || dashboardData?.behind_tenants || [];

  const { property_summary = {}, financial_summary = {}, tenant_summary = {} } = dashboardData;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Landlord Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Welcome back, {dashboardData.landlord_info?.name || 'Landlord'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500">Total Properties</h3>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {property_summary.total_properties || 0}
                </p>
              </div>
              <Home className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500">Total Tenants</h3>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {summary.total_leases || tenant_summary.total_tenants || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500">Monthly Revenue</h3>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  Ksh {(financial_summary.monthly_revenue || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500">Behind on Rent</h3>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {summary.behind_count || tenant_summary.tenants_behind_rent || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500">Collection Rate</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {summary.collection_rate || 0}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(summary.collection_rate || 0, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500">Pending Payments</h3>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              Ksh {(financial_summary.pending_payments || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {financial_summary.overdue_payments || 0} overdue
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500">Maintenance Requests</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {property_summary.maintenance_requests || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">Active requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          onClick={sendRentReminders}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
        >
          <Bell className="h-4 w-4 mr-2" />
          Send Rent Reminders
        </Button>

        <Button
          onClick={() => navigate("/properties/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>

        <Button
          onClick={generateReport}
          variant="secondary"
          className="rounded-xl"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Generate Report
        </Button>

        <Button
          onClick={viewRepairRequests}
          variant="outline"
          className="rounded-xl"
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          View Repair Requests
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", name: "Overview" },
            { id: "up_to_date", name: `Up to Date (${summary.up_to_date_count || 0})` },
            { id: "behind", name: `Behind (${summary.behind_count || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-slate-600" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Occupied Units</span>
                  <span className="font-semibold">{property_summary.occupied_units || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Vacant Units</span>
                  <span className="font-semibold">{property_summary.vacant_units || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Occupancy Rate</span>
                  <span className="font-semibold">
                    {property_summary.total_properties > 0
                      ? Math.round((property_summary.occupied_units || 0) / property_summary.total_properties * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-slate-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/properties")}
                  className="w-full text-left p-3 border rounded-xl hover:bg-gray-50 justify-start"
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-3" />
                  Manage Properties
                </Button>
                <Button
                  onClick={() => navigate("/leases")}
                  className="w-full text-left p-3 border rounded-xl hover:bg-gray-50 justify-start"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-3" />
                  Manage Leases
                </Button>
                <Button
                  onClick={() => navigate("/notifications")}
                  className="w-full text-left p-3 border rounded-xl hover:bg-gray-50 justify-start"
                  variant="outline"
                >
                  <Bell className="h-4 w-4 mr-3" />
                  Send Announcements
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(activeTab === "up_to_date" || activeTab === "behind") && (
        <TenantTable
          tenants={activeTab === "up_to_date" ? upToDateTenants : behindTenants}
          type={activeTab}
        />
      )}
    </div>
  );
};

export default LandlordDashboard;