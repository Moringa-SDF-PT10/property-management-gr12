import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { createLease } from "../api/api";

export default function LeaseFormPage() {
  const { propertyId } = useParams(); // From /properties/:propertyId/lease
  const [searchParams] = useSearchParams();
  
  // Look for 'propertyId' to match what PropertyDetailsPage sends
  const queryPropertyId = searchParams.get("propertyId");
  
  // Use propertyId from URL params first, then query params
  const initialPropertyId = propertyId || queryPropertyId || "";

  const [formData, setFormData] = useState({
    property_id: initialPropertyId,
    start_date: "",
    end_date: "",
    rent_amount: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Update form when property ID is detected
  useEffect(() => {
    const effectivePropertyId = propertyId || queryPropertyId;
    if (effectivePropertyId && effectivePropertyId !== formData.property_id) {
      setFormData((prev) => ({ ...prev, property_id: effectivePropertyId }));
    }
  }, [propertyId, queryPropertyId, formData.property_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await createLease(formData);
      setSuccess("Lease created successfully!");
      setFormData({
        property_id: "",
        start_date: "",
        end_date: "",
        rent_amount: "",
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create lease");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Book a Lease</h2>

      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Property ID</label>
          <input
            name="property_id"
            type="number"
            value={formData.property_id}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
            placeholder={initialPropertyId ? "Property pre-selected" : "Enter property ID"}
            disabled={!!initialPropertyId} // Disable if property is pre-selected
          />
          {initialPropertyId && (
            <p className="text-sm text-gray-500 mt-1">
              Property automatically selected from your navigation
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Rent Amount</label>
          <input
            name="rent_amount"
            type="number"
            value={formData.rent_amount}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter monthly rent amount"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Create Lease"}
        </button>
      </form>
    </div>
  );
}