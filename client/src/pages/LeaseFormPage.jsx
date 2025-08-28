import { useState } from "react";
import { createLease } from "../api/api";

export default function LeaseFormPage() {
  const [formData, setFormData] = useState({
    property_id: "",
    start_date: "",
    end_date: "",
    rent_amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          <label>Property ID</label>
          <input
            name="property_id"
            type="number"
            value={formData.property_id}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label>Start Date</label>
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
          <label>End Date</label>
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
          <label>Rent Amount</label>
          <input
            name="rent_amount"
            type="number"
            value={formData.rent_amount}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
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
