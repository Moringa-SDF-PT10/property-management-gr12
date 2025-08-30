import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { StatusBadge } from "./CardComponents.jsx";

export default function PropertyCard({ property }) {
  if (!property) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 text-slate-500">No property data</CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">
            {property?.name ?? "Unnamed property"}
          </CardTitle>
          <StatusBadge status={property?.status} />
        </div>
      </CardHeader>
      <CardContent className="text-sm text-slate-600 space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="truncate" title={property?.location ?? "Unknown"}>
            {property?.location ?? "Unknown"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">Rent:</span>
          <span>
            KES {property?.rent ? Number(property.rent).toLocaleString() : "N/A"}
          </span>
        </div>
        <div className="pt-2">
          {property?.id ? (
            <Link
              to={`/properties/${property.id}`}
              className="text-sm text-slate-900 hover:underline"
            >
              View details →
            </Link>
          ) : (
            <span className="text-sm text-slate-400">No details available</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
