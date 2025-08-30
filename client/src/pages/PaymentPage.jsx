import React, { useState } from "react";
import PaymentButton from "../components/PaymentButton";
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
    alert("Please enter phone number to continue payment.");
  };

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