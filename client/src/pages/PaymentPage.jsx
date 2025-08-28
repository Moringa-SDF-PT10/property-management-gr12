import React, { useState } from "react";
import PaymentButton from "../components/PaymentButton"; // Reusing the component
import InlineError from "../components/InlineError";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PaymentPage = () => {
  const [leaseId, setLeaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handlePaymentComplete = (result) => {
    alert("Payment initiated successfully!");
    console.log("Payment result:", result);
    // Optionally redirect to a payment success page or clear the form
    setLeaseId("");
    setAmount("");
  };

  const handleInitiateStandalonePayment = () => {
    setErrorMessage("");
    if (!leaseId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMessage("Please enter a valid Lease ID and a positive Amount.");
      return;
    }
    // For standalone payment, PaymentButton will handle its own internal state/polling
    // We just need to ensure the props are passed correctly.
    // In this simplified example, PaymentButton doesn't handle direct "amount" prop for initiation,
    // it's designed for fixed amounts (rent/deposit/outstanding).
    // A standalone payment might require a slightly different PaymentButton or direct API call.
    // For now, we'll simulate by rendering PaymentButton and letting user enter phone.
    // A more robust solution might have PaymentButton be a form that takes leaseId and amount.
    alert("Please enter phone number to continue payment.");
  };

  // This PaymentPage now acts as a wrapper to either prompt for Lease ID and amount,
  // or to use a generic payment flow if the backend supports it.
  // Given the PaymentButton's current design (expecting a 'lease' object),
  // a "generic" payment without a known lease might be a separate component.
  // For demonstration, let's allow input of leaseId and amount.
  // The PaymentButton component actually expects a 'lease' object.
  // So, to use PaymentButton here, we'd need to mock a lease or fetch one.

  // Let's adapt this page to be a form for a new, arbitrary payment,
  // or to direct to a lease-specific payment.
  // For now, let's keep it simple: it can prompt for a lease ID and then theoretically
  // pass it to a payment component.
  // However, the provided Payment.jsx (renamed to PaymentPage)
  // already had the leaseId prop, let's align with that.

  // Reverting to the original design for PaymentPage:
  // It expects `leaseId` as a prop if rendered directly,
  // but if it's a page, it needs to get it from params or state.
  // Let's make it a general payment initiation form.

  const mockLease = { id: leaseId, rent_amount: Number(amount), deposit_amount: 0, outstanding_rent: Number(amount) };

  return (
    <Card className="rounded-2xl shadow-sm max-w-md mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Make a New Payment</CardTitle>
      </CardHeader>
      <CardContent>
        {errorMessage && <InlineError message={errorMessage} className="mb-4" />}
        <div className="space-y-4">
          <div>
            <label htmlFor="leaseId" className="block text-sm font-medium text-gray-700 mb-1">
              Lease ID
            </label>
            <Input
              id="leaseId"
              type="text"
              placeholder="Enter Lease ID (e.g., L123)"
              value={leaseId}
              onChange={(e) => setLeaseId(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount (e.g., 5000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <p className="text-sm text-gray-600">
            This will initiate an M-Pesa STK push for the entered amount to the associated tenant's phone number for this lease.
          </p>

          {/* This part will dynamically show the payment button if both fields are filled */}
          {leaseId && amount && Number(amount) > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <PaymentButton
                lease={mockLease} // Pass a mock lease object
                paymentType="other" // Can be a generic type like "other"
                amount={Number(amount)}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentPage;