'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Lines are colored by position — the chart adapts to whatever exercises the
// lifter actually trains, so there's no sport-specific color map.
const PALETTE = ['#22d3ee', '#f59e0b', '#10b981', '#a78bfa', '#f472b6']

export default function E1rmChart({
  data,
  lifts,
  units,
}: {
  data: Record<string, number | string>[]
  lifts: string[]
  units: string
}) {
  return (
    <div className="h-72 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
          <YAxis stroke="#71717a" fontSize={11} width={56} unit={` ${units}`} />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lifts.map((lift, i) => (
            <Line
              key={lift}
              type="monotone"
              dataKey={lift}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
