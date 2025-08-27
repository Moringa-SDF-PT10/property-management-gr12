import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const color = s === "occupied" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const label = s === "occupied" ? "Occupied" : "Vacant";
  return <Badge className={`rounded-full ${color}`}>{label}</Badge>;
}
