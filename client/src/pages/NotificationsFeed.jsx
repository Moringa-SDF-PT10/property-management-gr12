import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InlineError from "../components/InlineError";
import { Bell, Wallet, Wrench, CalendarDays, Info } from "lucide-react"; 

const NotificationsFeed = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      alert('Failed to mark notification as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_received':
        return <Wallet className="h-5 w-5 text-green-600" />;
      case 'rent_reminder':
        return <Bell className="h-5 w-5 text-orange-600" />;
      case 'repair_request':
        return <Wrench className="h-5 w-5 text-blue-600" />;
      case 'lease_expiry':
        return <CalendarDays className="h-5 w-5 text-purple-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'payments') return notification.notification_type.includes('payment');
    if (filter === 'repairs') return notification.notification_type.includes('repair');
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
        <p className="ml-3 text-slate-500">Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return <InlineError message={error} />;
  }

  return (
    <Card className="rounded-2xl shadow-sm max-w-3xl mx-auto">
      {/* Header */}
      <CardHeader className="p-4 border-b border-gray-200 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-gray-900">Notifications</CardTitle>
        <div className="flex space-x-2">
          {['all', 'unread', 'payments', 'repairs'].map(filterType => (
            <Badge
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 text-sm cursor-pointer ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Badge>
          ))}
        </div>
      </CardHeader>

      {/* Notifications List */}
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No notifications found matching your filter.
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="pt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-medium ${
                        !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {notification.body}
                    </p>
                    {notification.metadata && (
                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4">
                        {notification.metadata.lease_id && (
                          <span className="mr-3">Lease #{notification.metadata.lease_id}</span>
                        )}
                        {notification.metadata.amount && (
                          <span>KES {Number(notification.metadata.amount).toLocaleString()}</span>
                        )}
                         {notification.metadata.property_name && (
                          <span>Property: {notification.metadata.property_name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsFeed