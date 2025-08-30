import { useEffect, useState } from "react";
import { getLeases } from "../api/api";
import { Link } from "react-router-dom";

export default function TenantDashboardPage() {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLeases() {
      setLoading(true);
      setError("");
      try {
        const data = await getLeases();
        setLeases(data.leases || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load leases.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeases();
  }, []);

  if (loading) return <p className="p-4">Loading leases...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">My Leases</h2>

      {leases.length === 0 ? (
        <p>No leases found.</p>
      ) : (
        <ul className="space-y-3">
          {leases.map((lease) => (
            <li key={lease.id} className="border p-3 rounded">
              <p><strong>Property:</strong> {lease.property?.name || lease.property_id}</p>
              <p><strong>Start:</strong> {lease.start_date}</p>
              <p><strong>End:</strong> {lease.end_date}</p>
              <p><strong>Rent:</strong> {lease.rent_amount}</p>
              <p><strong>Status:</strong> {lease.status}</p>

              <Link 
                to={`/leases/${lease.id}/vacate`} 
                className="mt-2 inline-block bg-red-600 text-white px-3 py-1 rounded"
            >
                Submit Vacate Notice
            </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}