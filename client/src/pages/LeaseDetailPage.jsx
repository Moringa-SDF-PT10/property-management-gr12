import React, { useState, useEffect } from "react";
import PaymentButton from "../components/PaymentButton"; // Use the new reusable component
import InlineError from "../components/InlineError"; // For error display
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Using existing UI components
import { Badge } from "@/components/ui/badge"; // Using existing UI components
import { useParams } from "react-router-dom"; // To get leaseId from URL

const LeaseDetailPage = () => {
  const { leaseId } = useParams(); // Get leaseId from URL parameter
  const [lease, setLease] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (leaseId) {
      fetchLeaseDetails();
      fetchPaymentHistory();
    }
  }, [leaseId]);

  const fetchLeaseDetails = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/leases/${leaseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLease(data);
    } catch (err) {
      console.error('Failed to fetch lease details:', err);
      setError("Failed to load lease details. Please try again.");
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/payments/lease/${leaseId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPaymentHistory(data.payments || []);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      setError("Failed to load payment history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = (result) => {
    alert('Payment completed successfully!');
    fetchLeaseDetails(); // Refresh lease status
    fetchPaymentHistory(); // Refresh payment history
    // Potentially navigate to a success page or show a success toast
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
        <p className="ml-3 text-slate-500">Loading lease details...</p>
      </div>
    );
  }

  if (error) {
    return <InlineError message={error} />;
  }

  if (!lease) {
    return <div className="text-center text-red-600">Lease not found or an error occurred.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="rounded-2xl shadow-lg overflow-hidden">
        {/* Lease Header */}
        <CardHeader className="bg-blue-600 text-white p-6">
          <CardTitle className="text-2xl font-bold">Lease #{lease.id}</CardTitle>
          <p className="text-blue-100">
            {new Date(lease.start_date).toLocaleDateString()} - {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Ongoing'}
          </p>
        </CardHeader>

        {/* Lease Details */}
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-slate-700">Lease Information</h2>
              <div className="space-y-2 text-slate-600">
                <p><strong>Monthly Rent:</strong> KES {Number(lease.rent_amount).toLocaleString()}</p>
                <p><strong>Deposit:</strong> KES {Number(lease.deposit_amount).toLocaleString()}</p>
                <p className="flex items-center">
                  <strong>Status:</strong>
                  <Badge className={`ml-2 rounded-full ${
                    lease.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {lease.status}
                  </Badge>
                </p>
                <p><strong>Tenant:</strong> {lease.tenant?.first_name} {lease.tenant?.last_name}</p>
                <p><strong>Property:</strong> {lease.property?.name} ({lease.property?.location})</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 text-slate-700">Payment Status</h2>
              <div className="space-y-2 text-slate-600">
                <p><strong>Last Payment:</strong> {lease.last_rent_paid_date ? new Date(lease.last_rent_paid_date).toLocaleDateString() : 'No payments yet'}</p>
                <p><strong>Next Due:</strong> {lease.next_rent_due_date ? new Date(lease.next_rent_due_date).toLocaleDateString() : 'Not set'}</p>
                <p className="flex items-center">
                  <strong>Rent Status:</strong>
                  <Badge className={`ml-2 rounded-full ${
                    lease.is_rent_up_to_date
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {lease.is_rent_up_to_date ? 'Up to date' : `${lease.days_behind_rent} days behind`}
                  </Badge>
                </p>
                {lease.outstanding_rent > 0 && (
                  <p><strong>Outstanding:</strong>
                    <span className="text-red-600 font-semibold ml-2">
                      KES {Number(lease.outstanding_rent).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-700">Make Payment</h2>
            <div className="flex flex-wrap gap-4">
              <PaymentButton
                lease={lease}
                paymentType="rent"
                amount={lease.rent_amount}
                onPaymentComplete={handlePaymentComplete}
              />

              {lease.deposit_amount > 0 && (
                <PaymentButton
                  lease={lease}
                  paymentType="deposit"
                  amount={lease.deposit_amount}
                  onPaymentComplete={handlePaymentComplete}
                />
              )}

              {lease.outstanding_rent > 0 && (
                <PaymentButton
                  lease={lease}
                  paymentType="rent_arrears" // Specific type for outstanding rent
                  amount={lease.outstanding_rent}
                  onPaymentComplete={handlePaymentComplete}
                />
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-700">Payment History</h2>
            {paymentHistory.length === 0 ? (
              <p className="text-gray-500">No payments yet for this lease.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {payment.payment_type?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          KES {Number(payment.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {payment.method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`rounded-full ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaseDetailPage