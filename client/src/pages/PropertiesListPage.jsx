import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Search, Building2 } from "lucide-react";
import { API_BASE_URL } from "../api/api.js";
import InlineError from "../components/InlineError.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api } from "../api/api.js";

export default function PropertiesListPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api("/properties");
        if (mounted) setAll(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const filtered = useMemo(() => {
    return all.filter((p) => {
      const matchQ = `${p.name} ${p.location}`.toLowerCase().includes(q.toLowerCase());
      const matchStatus = status === "all" ? true : p.status === status;
      return matchQ && matchStatus;
    });
  }, [all, q, status]);

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-slate-500 text-sm"></p>
        </div>
        <Link to="/properties/new">
          <Button className="rounded-xl"><Plus className="h-4 w-4 mr-2" /> New Property</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="col-span-2 flex items-center gap-2 border rounded-xl bg-white p-2">
          <Search className="h-4 w-4 text-slate-500 ml-1" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or location…"
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
        <div>
          <Label className="text-sm">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Property Cards */}
      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <InlineError message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <PropertyCard property={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function PropertyCard({ property }) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* ✅ Show image if available */}
      {property.image && (
        <img    
         src={`${API_BASE_URL}/uploads/properties/${property.image}`}
          alt={property.name}
          className="w-full h-40 object-cover rounded-t-2xl"
        />
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">{property.name}</CardTitle>
          <StatusBadge status={property.status} />
        </div>
      </CardHeader>

      <CardContent className="text-sm text-slate-600 space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="truncate" title={property.location}>
            {property.location}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">Rent:</span>
          <span>KES {Number(property.rent).toLocaleString()}</span>
        </div>
        <div className="pt-2 flex gap-2">
          <Link to={`/properties/${property.id}`} className="text-sm text-slate-900 hover:underline">
            View details →
          </Link>
          <Link to={`/properties/${property.id}/edit`} className="text-sm text-blue-600 hover:underline">
            Edit
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}