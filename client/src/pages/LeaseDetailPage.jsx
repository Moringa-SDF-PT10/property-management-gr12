import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api } from "../api/api";  // ✅ use centralized API helper

export default function LeaseDetailPage() {
  const { leaseId } = useParams();
  const [lease, setLease] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch Lease Details
  const fetchLeaseDetails = async () => {
    try {
      setError(null);
      const data = await api(`/leases/${leaseId}`);
      setLease(data);
    } catch (err) {
      console.error("Failed to fetch lease details:", err);
      setError("Failed to load lease details. Please try again.");
    }
  };

  // // ✅ Fetch Payment History
  // const fetchPaymentHistory = async () => {
  //   try {
  //     setError(null);
  //     const data = await api(`/payments/lease/${leaseId}`);
  //     setPaymentHistory(data.payments || []);
  //   } catch (err) {
  //     console.error("Failed to fetch payment history:", err);
  //     setError("Failed to load payment history. Please try again.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // ✅ Load data when component mounts
  useEffect(() => {
    fetchLeaseDetails();
    // fetchPaymentHistory();
  }, [leaseId]);

  if (loading) return <p className="text-center text-gray-500">Loading lease details...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Lease Info */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Property:</strong> {lease?.property?.name}</p>
          <p><strong>Tenant:</strong> {lease?.tenant?.name}</p>
          <p><strong>Start Date:</strong> {lease?.start_date}</p>
          <p><strong>End Date:</strong> {lease?.end_date}</p>
          <p><strong>Status:</strong> {lease?.status}</p>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <ul className="space-y-2">
              {paymentHistory.map((payment) => (
                <li key={payment.id} className="flex justify-between border-b pb-2">
                  <span>{payment.date}</span>
                  <span>KES {Number(payment.amount).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No payments recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
