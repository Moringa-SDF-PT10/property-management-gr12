import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart3 } from "lucide-react";
import { api } from "../api/api.js";
import { Stat } from "./CardComponents.jsx";

export default function OccupancyWidget({ className = "" }) {
  const [summary, setSummary] = useState({ occupied: 0, vacant: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api("/properties");
        if (mounted) setSummary(data || { occupied: 0, vacant: 0 });
      } catch (e) {
        setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const chartData = useMemo(
    () => [
      { name: "Occupied", value: Number(summary.occupied) || 0 },
      { name: "Vacant", value: Number(summary.vacant) || 0 },
    ],
    [summary]
  );

  return (
    <Card className={`rounded-2xl shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-600" /> Occupancy Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 grid place-items-center animate-pulse text-slate-400">
            Loading summary…
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={chartData}
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    label
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={undefined} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <Stat label="Occupied" value={summary.occupied} />
              <Stat label="Vacant" value={summary.vacant} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}