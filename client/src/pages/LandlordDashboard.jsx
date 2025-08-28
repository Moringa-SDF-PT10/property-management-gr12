import React, { useState, useEffect } from 'react';
import TenantTable from './TenantPage';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Bell, ClipboardList, TrendingUp } from "lucide-react";
import InlineError from '../components/InlineError';

// Landlord Dashboard Component
const LandlordDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard/landlord', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendRentReminders = async () => {
    try {
      const response = await fetch('/api/reminders/rent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      alert(result.message);
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error('Failed to send reminders:', err);
      alert(`Failed to send reminders: ${err.message}`);
    }
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

  const { summary, up_to_date_tenants, behind_tenants } = dashboardData;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Landlord Dashboard</h1>
        <p className="text-slate-600 mt-2">Manage your properties and track rent payments efficiently.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500">Total Leases</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{summary.total_leases}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500">Up to Date</h3>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{summary.up_to_date_count}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500">Behind on Rent</h3>
            <p className="text-3xl font-bold text-red-600 mt-1">{summary.behind_count}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500">Collection Rate</h3>
            <p className="text-3xl font-bold text-blue-600 mt-1">{summary.collection_rate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          onClick={sendRentReminders}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
        >
          Send Rent Reminders
        </Button>
        <Button
          onClick={() => window.open('/reports/monthly', '_blank')}
          variant="secondary"
          className="rounded-xl"
        >
          Generate Report
        </Button>
        <Button
          onClick={() => console.log('View all repair requests')} // Placeholder
          variant="outline"
          className="rounded-xl"
        >
          <ClipboardList className="h-4 w-4 mr-2" /> View Repair Requests
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'up_to_date', name: `Up to Date (${summary.up_to_date_count})` },
            { id: 'behind', name: `Behind (${summary.behind_count})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-slate-600" /> Payment Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-200">
                <p className="text-gray-500">Chart data will be displayed here</p>
              </div>
            </CardContent>
          </Card>


          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Bell className="h-5 w-5 text-slate-600" /> Notifications & Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full text-left p-3 border rounded-xl hover:bg-gray-50 justify-start" variant="outline">
                  View All Repair Requests
                </Button>
                <Button className="w-full text-left p-3 border rounded-xl hover:bg-gray-50 justify-start" variant="outline">
                  Schedule Maintenance
                </Button>
                <Button className="w-full text-left p-3 border rounded-xl hover:bg-gray-50 justify-start" variant="outline">
                  Send Announcements
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(activeTab === 'up_to_date' || activeTab === 'behind') && (
        <TenantTable
          tenants={activeTab === 'up_to_date' ? up_to_date_tenants : behind_tenants}
          type={activeTab}
        />
      )}
    </div>
  );
};

export default LandlordDashboard