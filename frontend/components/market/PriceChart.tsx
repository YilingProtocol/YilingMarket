"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";

interface PriceChartProps {
  data: { label: string; value: number }[];
}

const CHART_COLOR = "var(--primary)";

const chartConfig = {
  probability: {
    label: "Probability",
    color: CHART_COLOR,
  },
};

export function PriceChart({ data }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <TrendingUp className="size-5 opacity-40" />
        <span className="text-xs">No price data yet</span>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    agent: d.label,
    probability: d.value,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillProbability" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.25} />
            <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border/30"
          vertical={false}
        />
        <XAxis
          dataKey="agent"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="bg-card border-border shadow-lg"
              formatter={(value: number) => `${value}%`}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="probability"
          stroke={CHART_COLOR}
          fill="url(#fillProbability)"
          strokeWidth={2}
          dot={{
            fill: CHART_COLOR,
            strokeWidth: 2,
            r: 3,
            stroke: "var(--card)",
          }}
          activeDot={{
            r: 5,
            fill: CHART_COLOR,
            stroke: "var(--card)",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
