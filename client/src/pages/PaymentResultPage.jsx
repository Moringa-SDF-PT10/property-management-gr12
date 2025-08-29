import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom"; // Added Link
import InlineError from "../components/InlineError";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PaymentResultPage = () => {
  const { paymentId } = useParams(); // Get paymentId from URL
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const success = queryParams.get('status') === 'success'; // Get status from query param

  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    } else {
      setLoading(false);
      setError("No payment ID provided.");
    }
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPaymentDetails(data);
    } catch (err) {
      console.error('Failed to fetch payment details:', err);
      setError("Failed to fetch payment details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
        <p className="ml-3 text-slate-500">Loading payment results...</p>
      </div>
    );
  }

  if (error) {
    return <InlineError message={error} />;
  }

  return (
    <Card className="rounded-2xl shadow-md max-w-md mx-auto mt-8">
      <CardContent className="p-6">
        <div className="text-center">
          {success ? (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-sm text-gray-600 mb-6">
                Your payment has been processed successfully.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Failed</h3>
              <p className="text-sm text-gray-600 mb-6">
                There was an issue processing your payment. Please try again.
              </p>
            </>
          )}

          {paymentDetails ? (
            <div className="border-t border-gray-200 pt-4 text-left">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Amount:</dt>
                  <dd className="text-sm font-medium text-gray-900">KES {Number(paymentDetails.amount).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Payment Type:</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">{paymentDetails.payment_type?.replace(/_/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Method:</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">{paymentDetails.method}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Transaction ID:</dt>
                  <dd className="text-sm font-medium text-gray-900">{paymentDetails.transaction_id || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Date:</dt>
                  <dd className="text-sm font-medium text-gray-900">{new Date(paymentDetails.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-4">Payment details could not be retrieved.</p>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              asChild
              className="flex-1 rounded-xl"
            >
              <Link to="/landlord-dashboard">Back to Dashboard</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 rounded-xl"
            >
              <Link to="/properties">View Properties</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentResultPage;