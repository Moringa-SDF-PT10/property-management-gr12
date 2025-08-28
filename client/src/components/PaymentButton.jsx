import React, { useState, useEffect } from "react";

function PaymentButton({ lease, paymentType, amount, onPaymentComplete }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentId, setPaymentId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Polling logic: keep checking status if payment is pending
  useEffect(() => {
    let interval;
    if (paymentId && status === "pending") {
      interval = setInterval(async () => {
        try {
          // Assuming /api/payments/status/:paymentId endpoint
          const res = await fetch(`/api/payments/status/${paymentId}`, {
             headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
          });
          if (!res.ok) throw new Error("Failed to fetch status");
          const data = await res.json();
          setStatus(data.status);
          if (data.status === "success" || data.status === "failed") {
            clearInterval(interval);
            setProcessing(false);
            if (data.status === "success") {
              onPaymentComplete(data); // Notify parent component
            } else {
              alert("Payment failed. Please try again.");
            }
            // Optionally reset form after status is final
            setPaymentId(null);
            setStatus(null);
            setShowForm(false);
            setPhoneNumber("");
          }
        } catch (err) {
          console.error("Error fetching payment status:", err);
          clearInterval(interval);
          setProcessing(false);
          alert("Error fetching payment status. Please check your network.");
          // Optionally reset form on error
          setPaymentId(null);
          setStatus(null);
          setShowForm(false);
          setPhoneNumber("");
        }
      }, 3000); // check every 3 seconds
    }
    return () => clearInterval(interval);
  }, [paymentId, status, onPaymentComplete]);


  const handlePaymentInitiation = async () => {
    setProcessing(true);
    try {
      // Assuming /api/payments/initiate endpoint
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          lease_id: lease.id,
          amount: amount,
          payment_type: paymentType,
          phone_number: phoneNumber, // Include phone number
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to initiate payment");
      }
      const data = await res.json();

      setPaymentId(data.payment_id);
      setStatus(data.status);
      // Processing state remains true for polling
    } catch (err) {
      console.error("Error initiating payment:", err);
      alert(err.message || "Error initiating payment. Please try again.");
      setProcessing(false);
      // Reset form if initiation fails
      setPaymentId(null);
      setStatus(null);
      setShowForm(false);
      setPhoneNumber("");
    }
  };

  const buttonLabel = paymentType === "rent" ? `Pay Rent ($${amount})` : `Pay Deposit ($${amount})`;

  return (
    <div className="inline-block">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          {buttonLabel}
        </button>
      )}

      {showForm && (
        <div className="p-4 border border-blue-200 rounded-md shadow-sm bg-blue-50">
          <h3 className="text-lg font-bold mb-3 text-blue-800">
            {paymentType === "rent" ? "Make Rent Payment" : "Make Deposit Payment"}
          </h3>
          {!paymentId && (
            <>
              <p className="text-sm text-blue-700 mb-2">Amount: ${amount}</p>
              <input
                type="tel" // Use tel for phone numbers
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter M-Pesa phone number (e.g., 0712345678)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                required
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePaymentInitiation}
                  disabled={processing || !phoneNumber}
                  className={`flex-1 py-2 px-4 rounded font-medium ${
                    processing || !phoneNumber
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {processing ? 'Processing...' : `Pay via M-Pesa`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setPhoneNumber("");
                  }}
                  className="py-2 px-4 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {paymentId && (
            <div className="mt-4 text-center">
              <p className="font-medium text-blue-800">
                Payment Request Sent!
              </p>
              <p className="text-sm text-blue-700">
                Please check your phone for the M-Pesa STK push.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                <strong>Status:</strong>{" "}
                {status === "pending"
                  ? "Waiting for confirmation... ⏳"
                  : status === "success"
                  ? "✅ Payment Successful!"
                  : "❌ Payment Failed"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PaymentButton;