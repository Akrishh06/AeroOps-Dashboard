"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TelemetryHistoryPoint } from "@/types/telemetry";

const stroke = {
  battery: "#5fa8b3",
  temp: "#c4a35a",
  vib: "#8b7ab8",
  flow: "#6a9e78",
  current: "#b87a7a",
} as const;

function Spark({
  data,
  dataKey,
  color,
  label,
}: {
  data: TelemetryHistoryPoint[];
  dataKey: keyof Omit<TelemetryHistoryPoint, "t">;
  color: string;
  label: string;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-14 flex-1 flex-col justify-center rounded border border-white/[0.05] bg-black/20 px-2">
        <p className="micro-label text-dim">{label}</p>
        <p className="mt-1 text-[10px] text-dim">Collecting…</p>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="micro-label mb-0.5 px-1 text-dim">{label}</p>
      <div className="h-14 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, left: -18, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                background: "#0d0f12",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 10,
              }}
              labelFormatter={() => ""}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TelemetryStripBottom({ history }: { history: TelemetryHistoryPoint[] }) {
  return (
    <div className="flex h-[100px] shrink-0 items-stretch gap-2 border-t border-white/[0.06] bg-void/85 px-3 py-2 backdrop-blur-md">
      <Spark data={history} dataKey="battery_pct" color={stroke.battery} label="Battery %" />
      <Spark data={history} dataKey="temp_c" color={stroke.temp} label="Temp °C" />
      <Spark data={history} dataKey="vibration" color={stroke.vib} label="Vib mm/s" />
      <Spark data={history} dataKey="airflow" color={stroke.flow} label="Flow m/s" />
      <Spark data={history} dataKey="current" color={stroke.current} label="Current A" />
    </div>
  );
}
