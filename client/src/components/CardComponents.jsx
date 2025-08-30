import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const color =
    s === "occupied" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const label = s === "occupied" ? "Occupied" : "Vacant";
  return <Badge className={`rounded-full ${color}`}>{label}</Badge>;
}

export function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-slate-600">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

export function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border rounded-xl px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}