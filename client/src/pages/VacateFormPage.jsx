import { useState } from "react";
import { useParams } from "react-router-dom";
import { submitVacate } from "../api/api";

const VacateFormPage = () => {
  const [noticeDate, setNoticeDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { leaseId } = useParams(); // <-- get leaseId from URL

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await submitVacate(leaseId, { vacate_date: noticeDate });
      setSuccess("Vacate notice submitted successfully!");
      setNoticeDate("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error submitting notice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Submit Vacate Notice</h2>

      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Vacate Date</label>
          <input
            type="date"
            value={noticeDate}
            onChange={(e) => setNoticeDate(e.target.value)}
            className="border p-2 w-full"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Notice"}
        </button>
      </form>
    </div>
  );
};

export default VacateFormPage;