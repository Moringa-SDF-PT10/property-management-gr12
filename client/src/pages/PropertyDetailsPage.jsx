import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import InlineError from "../components/InlineError.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { API_BASE_URL, api } from "../api/api.js";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border rounded-xl px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const p = await api(`/properties/${id}`);
        if (mounted) setData(p);
      } catch (e) {
        setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  const onDelete = async () => {
    if (!window.confirm("Delete this property? This cannot be undone.")) return;
    try {
      await api(`/properties/${id}`, { method: "DELETE" });
      navigate("/properties");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      ) : error ? (
        <InlineError message={error} />
      ) : !data ? (
        <InlineError message="Property not found." />
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">{data.name}</CardTitle>
                <StatusBadge status={data.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-slate-700">
              <DetailRow label="Location" value={data.location} />
              <DetailRow label="Rent" value={`KES ${Number(data.rent).toLocaleString()}`} />

              {data.pictures && data.pictures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.pictures.map((pic, i) => (
                    <img
                      key={i}
                      src={`${API_BASE_URL}${pic}`}
                      alt={`Property ${i + 1}`}
                      className="w-32 h-32 object-cover rounded-xl border"
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Link to={`/properties/${id}/edit`}>
                  <Button className="rounded-xl">
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </Link>
                <Button variant="destructive" className="rounded-xl" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
