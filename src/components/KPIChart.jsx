import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function KPIChart({ data }) {
  const chartData = useMemo(() => data ?? [
    { month: "Jan", score: 62 },
    { month: "Feb", score: 68 },
    { month: "Mar", score: 72 },
    { month: "Apr", score: 70 },
    { month: "Mei", score: 76 },
    { month: "Jun", score: 80 },
  ], [data]);

  return (
    <div className="card">
      <div className="card-header">Riwayat KPI</div>
      <div className="card-body">
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
