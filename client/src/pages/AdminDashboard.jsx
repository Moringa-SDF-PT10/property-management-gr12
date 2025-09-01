import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import {
  Shield,
  Users,
  Building,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  UserMinus,
  Activity,
  BarChart3,
  Settings,
  Database,
  Megaphone,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Home,
  RefreshCw,
  PlusCircle,
  Loader2 // Added Loader2 for specific user data loading
} from 'lucide-react';
import { api } from '../api/api.js';

const AdminDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  // State for fetched dashboard data
  const [systemStats, setSystemStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState([]);

  // --- NEW STATE FOR USERS ---
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState(null);

  const [loadingDashboard, setLoadingDashboard] = useState(true); // Renamed for clarity
  const [errorDashboard, setErrorDashboard] = useState(null); // Renamed for clarity

  const navigate = useNavigate(); // Initialize useNavigate for redirects

  // Helper functions for auth checks
  const getAccessToken = () => localStorage.getItem('accessToken');
  const getUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user ? user.role : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  };


  const fetchAdminDashboardData = useCallback(async () => {
    setLoadingDashboard(true);
    setErrorDashboard(null);
    try {
      const token = getAccessToken();
      const userRole = getUserRole();

      if (!token || userRole !== 'admin') {
        setErrorDashboard("You are not authorized to view this page.");
        navigate('/auth/login', { state: { message: "Access denied. Please log in as an administrator." } });
        return;
      }

      const response = await api('/admin/dashboard'); // Use the `api` utility
      const data = response.dashboard; // Adjust based on actual backend response structure

      if (data) {
        setSystemStats({
          totalUsers: data.user_statistics?.total_users || 0,
          totalLandlords: data.user_statistics?.landlords || 0,
          totalTenants: data.user_statistics?.tenants || 0,
          totalAdmins: data.user_statistics?.admins || 0,
          totalProperties: data.system_statistics?.total_properties || 0,
          totalRevenue: data.system_statistics?.total_payments || 0,
          systemUptime: data.system_health?.api_status === 'running' ? 99.8 : 0,
          activeIssues: 0
        });

        setRecentActivity(data.recent_activities || []);

        setSystemHealth([
          { component: 'Database', status: data.system_health?.database_status || 'unknown', uptime: 99.9, response: '45ms' },
          { component: 'API Server', status: data.system_health?.api_status === 'running' ? 'healthy' : 'error', uptime: 99.8, response: '120ms' },
          { component: 'Payment Gateway', status: 'unknown', uptime: 0, response: 'N/A' },
          { component: 'File Storage', status: 'unknown', uptime: 0, response: 'N/A' },
          { component: 'Email Service', status: 'unknown', uptime: 0, response: 'N/A' }
        ]);
      } else {
        setSystemStats({ totalUsers: 0, totalLandlords: 0, totalTenants: 0, totalAdmins: 0, totalProperties: 0, totalRevenue: 0, systemUptime: 0, activeIssues: 0 });
        setRecentActivity([]);
        setSystemHealth([]);
      }
    } catch (err) {
      console.error("Failed to fetch admin dashboard data:", err);
      if (err.status === 403) { // Forbidden if not admin
          setErrorDashboard("Access denied. You do not have administrator privileges.");
          navigate('/auth/login', { state: { message: "Access denied. Please log in as an administrator." } });
      } else if (err.status === 401) { // Unauthorized (token invalid/expired)
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          navigate('/auth/login', { state: { message: "Your session expired. Please log in again." } });
      } else {
          setErrorDashboard(err.message || 'Failed to load dashboard data. Please ensure you are logged in as an Admin.');
      }

      setSystemStats({ totalUsers: 0, totalLandlords: 0, totalTenants: 0, totalAdmins: 0, totalProperties: 0, totalRevenue: 0, systemUptime: 0, activeIssues: 1 });
      setRecentActivity([]);
      setSystemHealth([{ component: 'Backend Connection', status: 'error', uptime: 0, response: 'N/A' }]);
    } finally {
      setLoadingDashboard(false);
    }
  }, [navigate]); // Added navigate to dependencies


  // --- NEW: Function to fetch all users ---
  const fetchUsersData = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const token = getAccessToken();
      const userRole = getUserRole();

      if (!token || userRole !== 'admin') {
        setErrorUsers("You are not authorized to view this page.");
        navigate('/auth/login', { state: { message: "Access denied. Please log in as an administrator." } });
        return;
      }

      // --- CRITICAL: Use the /admin/users endpoint ---
      const response = await api('/auth/users');
    // If backend wraps the data, unwrap it
      const usersArray = Array.isArray(response) ? response : response.users || [];
      setAllUsers(usersArray);


}
    catch (err) {
      console.error("Failed to fetch user data:", err);
      if (err.status === 403) {
        setErrorUsers("Access denied. You do not have administrator privileges.");
        navigate('/auth/login', { state: { message: "Access denied. Please log in as an administrator." } });
      } else if (err.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        navigate('/auth/login', { state: { message: "Your session expired. Please log in again." } });
      } else {
        setErrorUsers(err.message || 'Failed to load users. Please ensure you are logged in as an Admin.');
      }
      setAllUsers([]); // Clear users on error
    } finally {
      setLoadingUsers(false);
    }
  }, [navigate]);


  // --- useEffect to fetch dashboard data on load/period change ---
  useEffect(() => {
    fetchAdminDashboardData();
  }, [fetchAdminDashboardData, selectedPeriod]);


  // --- NEW: useEffect to fetch user data ONLY when 'users' tab is active ---
  useEffect(() => {
    if (activeTab === 'users' && !loadingUsers && allUsers.length === 0 && !errorUsers) {
      // Only fetch if tab is active, not already loading, no users fetched, and no previous error
      fetchUsersData();
    }
    // You could also refetch if 'allUsers' becomes stale, but for simplicity, only fetch once per tab activation.
  }, [activeTab, fetchUsersData, loadingUsers, allUsers.length, errorUsers]);


  const handleNavigation = (view) => {
    if (view === 'home') {
      window.location.href = '/';
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'overview') {
      fetchAdminDashboardData();
    } else if (activeTab === 'users') {
      fetchUsersData();
    }
    // Add other tab refreshes as needed
  };

  // --- Placeholder handlers for all quick action buttons (unchanged) ---
  const handleSendBroadcast = () => {
    console.log("Sending system broadcast...");
    alert("System Broadcast feature initiated! (Placeholder)");
  };

  const handleAddUser = () => {
    console.log("Adding new user...");
    alert("Add User feature initiated! (Placeholder)");
  };

  const handleGenerateReport = () => {
    console.log("Generating report...");
    alert("Generate Report feature initiated! (Placeholder)");
  };

  const handleSystemSettings = () => {
    console.log("Accessing system settings...");
    alert("System Settings feature initiated! (Placeholder)");
  };

  const handleViewAllActivity = () => {
    console.log("Viewing all activity...");
    alert("View All Activity feature initiated! (Placeholder)");
  };
  // --- End of new handlers ---


  const getActivityColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'unknown': return 'text-gray-600'; // Added unknown state
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'unknown': return <Activity className="h-4 w-4" />; // Added unknown state
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loadingDashboard) { // Use loadingDashboard for initial full dashboard load
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
        <p className="ml-3 text-slate-500">Loading admin dashboard...</p>
      </div>
    );
  }

  // Ensure systemStats is not null before accessing its properties
  const safeSystemStats = systemStats || {
    totalUsers: 0,
    totalLandlords: 0,
    totalTenants: 0,
    totalAdmins: 0,
    totalProperties: 0,
    totalRevenue: 0,
    systemUptime: 0,
    activeIssues: 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="h-6 w-6 mr-2 text-red-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">System overview and management</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleNavigation('home')}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                HomePage
              </button>
              <button
                onClick={handleRefresh}
                disabled={loadingDashboard || loadingUsers} // Disable if any data is loading
                className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${(loadingDashboard || loadingUsers) ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button
                onClick={handleSendBroadcast}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
              >
                <Megaphone className="h-4 w-4" />
                <span>System Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display for Dashboard */}
        {errorDashboard && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{errorDashboard}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'system', label: 'System Health', icon: Activity },
                { id: 'reports', label: 'Reports', icon: FileText }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{safeSystemStats.totalUsers}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Properties</p>
                    <p className="text-3xl font-bold text-gray-900">{safeSystemStats.totalProperties}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">${safeSystemStats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Uptime</p>
                    <p className="text-3xl font-bold text-gray-900">{safeSystemStats.systemUptime}%</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-2 text-xs">
                  <span className="text-gray-500">Last 30 days</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-gray-600" />
                    Recent Activity
                  </h2>
                </div>
                <div className="p-6">
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${getActivityColor(activity.status)}`}>
                            {activity.user ? activity.user.split(' ').map(n => n[0]).join('') : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.status)}`}>
                                {activity.role}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-sm text-gray-500">{activity.user}</p>
                              <span className="text-gray-400">•</span>
                              <p className="text-sm text-gray-500">{activity.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No recent activity data available.</p>
                      <p className="text-sm mt-1">Check your backend API endpoints.</p>
                    </div>
                  )}
                  <button
                    onClick={handleViewAllActivity} // Integrated handler
                    className="mt-4 w-full text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    View All Activity
                  </button>
                </div>
              </div>

              {/* Quick Actions & User Distribution */}
              <div className="space-y-6">
                {/* Quick Admin Actions */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    <button
                      onClick={handleSendBroadcast} // Integrated handler
                      className="w-full flex items-center space-x-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition duration-200"
                    >
                      <Megaphone className="h-5 w-5 text-red-600" />
                      <span className="text-red-800 font-medium">Send Broadcast</span>
                    </button>
                    <button
                      onClick={handleAddUser} // Integrated handler
                      className="w-full flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200"
                    >
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">Add User</span>
                    </button>
                    {/* NEW: Replaced placeholder button with Link component for Add Property */}
                    <Link
                      to="/properties" // This is the path the button will navigate to
                      className="w-full flex items-center space-x-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition duration-200"
                    >
                      <PlusCircle className="h-5 w-5 text-purple-600" />
                      <span className="text-purple-800 font-medium">Add Property</span>
                    </Link>
                    <button
                      onClick={handleGenerateReport} // Integrated handler
                      className="w-full flex items-center space-x-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition duration-200"
                    >
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">Generate Report</span>
                    </button>
                    <button
                      onClick={handleSystemSettings} // Integrated handler
                      className="w-full flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-200"
                    >
                      <Settings className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-800 font-medium">System Settings</span>
                    </button>
                  </div>
                </div>

                {/* User Distribution */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">User Distribution</h2>
                  </div>
                  <div className="p-6">
                    {safeSystemStats.totalUsers > 0 ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center">
                            <div className="h-3 w-3 bg-blue-500 rounded-full mr-2"></div>
                            Tenants
                          </span>
                          <span className="font-semibold text-gray-900">{safeSystemStats.totalTenants}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(safeSystemStats.totalTenants / safeSystemStats.totalUsers) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center">
                            <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                            Landlords
                          </span>
                          <span className="font-semibold text-gray-900">{safeSystemStats.totalLandlords}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(safeSystemStats.totalLandlords / safeSystemStats.totalUsers) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 flex items-center">
                            <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                            Admins
                          </span>
                          <span className="font-semibold text-gray-900">{safeSystemStats.totalAdmins}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(safeSystemStats.totalAdmins / safeSystemStats.totalUsers) * 100}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p>No user data available.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-600" />
                All System Users
              </h2>
            </div>
            <div className="p-6">
              {errorUsers && ( // Display user-specific error
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700">{errorUsers}</p>
                  </div>
                </div>
              )}

              {loadingUsers ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  <span className="ml-2 text-md text-gray-700">Loading user data...</span>
                </div>
              ) : (
                allUsers.length === 0 && !errorUsers ? (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No users found in the system.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">

                      <table className="min-w-full divide-y divide-gray-200">
                        <caption className="mt-4 text-sm text-gray-500">A list of all registered users in the system.</caption>
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allUsers.map((user) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.username}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {/* Simple badge-like styling */}
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                    user.role === 'landlord' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-indigo-600 hover:text-indigo-900 px-3 py-1 rounded-md hover:bg-gray-50">Edit</button>
                                <button className="ml-2 text-red-600 hover:text-red-900 px-3 py-1 rounded-md hover:bg-red-50">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Database className="h-5 w-5 mr-2 text-gray-600" />
                System Health Monitoring
              </h2>
            </div>
            <div className="p-6">
              {systemHealth.length > 0 ? (
                <div className="space-y-6">
                  {systemHealth.map((component, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`${getHealthColor(component.status)}`}>
                          {getHealthIcon(component.status)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{component.component}</h3>
                          <p className="text-sm text-gray-500">Response: {component.response}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getHealthColor(component.status)}`}>
                          {component.uptime}% uptime
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{component.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">No system health data.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">System Reports</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports Coming Soon</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Comprehensive reporting features including analytics, financial reports, and system insights will be available here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Endpoints Info */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Backend API Integration</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Primary Endpoints:</h4>
                <div className="space-y-2">
                  <div className="bg-gray-50 p-3 rounded">
                    <code className="text-blue-600">GET /admin/dashboard</code>
                    <p className="text-gray-600 mt-1">Main dashboard data with user statistics and system health</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <code className="text-blue-600">GET /api/activities/recent</code>
                    <p className="text-gray-600 mt-1">Recent user activities and system events</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <code className="text-blue-600">GET /admin/users</code>
                    <p className="text-gray-600 mt-1">Fetch all system users (for admin only)</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Optional Endpoints:</h4>
                <div className="space-y-2">
                  <div className="bg-gray-50 p-3 rounded">
                    <code className="text-blue-600">GET /api/system/health</code>
                    <p className="text-gray-600 mt-1">System component health status</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <code className="text-green-600">Backend URL:</code>
                    <p className="text-gray-600 mt-1"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;