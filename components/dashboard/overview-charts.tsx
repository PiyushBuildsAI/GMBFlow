"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { STATUS_POLL_MS, usePolling } from "@/lib/use-polling";
import type { ActivityLog, DashboardStats } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const pipelineConfig = {
  pending: { label: "Pending", color: "var(--chart-5)" },
  queued: { label: "Queued", color: "var(--chart-4)" },
  sent: { label: "Sent", color: "var(--chart-3)" },
  opened: { label: "Opened", color: "var(--chart-2)" },
  reviewed: { label: "Reviewed", color: "var(--chart-1)" },
} satisfies ChartConfig;

const activityConfig = {
  events: { label: "Events", color: "var(--chart-1)" },
} satisfies ChartConfig;

function buildActivitySeries(logs: ActivityLog[]) {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const day = log.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, events]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      events,
    }));
}

export function OverviewCharts({
  slug,
  stats,
}: {
  slug: string;
  stats: DashboardStats;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      try {
        const res = await api.listLogs(slug, undefined, { page: 1, limit: 100 });
        setLogs(res.logs);
      } catch (err) {
        if (!options?.silent) {
          toast.error(err instanceof Error ? err.message : "Failed to load charts");
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    load();
  }, [load]);

  usePolling(() => load({ silent: true }), STATUS_POLL_MS);

  const pipelineData = useMemo(
    () => [
      {
        stage: "Pipeline",
        pending: stats.pending,
        queued: stats.queued,
        sent: stats.sent,
        opened: stats.opened,
        reviewed: stats.reviewed,
      },
    ],
    [stats]
  );

  const activityData = useMemo(() => buildActivitySeries(logs), [logs]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Review pipeline</CardTitle>
          <CardDescription>
            Lead distribution across each stage of your review flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={pipelineConfig} className="h-56 w-full">
            <AreaChart accessibilityLayer data={pipelineData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="pending"
                type="monotone"
                fill="var(--color-pending)"
                fillOpacity={0.35}
                stroke="var(--color-pending)"
                stackId="a"
              />
              <Area
                dataKey="queued"
                type="monotone"
                fill="var(--color-queued)"
                fillOpacity={0.35}
                stroke="var(--color-queued)"
                stackId="a"
              />
              <Area
                dataKey="sent"
                type="monotone"
                fill="var(--color-sent)"
                fillOpacity={0.35}
                stroke="var(--color-sent)"
                stackId="a"
              />
              <Area
                dataKey="opened"
                type="monotone"
                fill="var(--color-opened)"
                fillOpacity={0.35}
                stroke="var(--color-opened)"
                stackId="a"
              />
              <Area
                dataKey="reviewed"
                type="monotone"
                fill="var(--color-reviewed)"
                fillOpacity={0.35}
                stroke="var(--color-reviewed)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <TrendingUp className="mr-1 size-4" />
          {stats.total_leads} total leads in workspace
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity trend</CardTitle>
          <CardDescription>
            Daily events from your activity log (last 14 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No activity data yet
            </div>
          ) : (
            <ChartContainer config={activityConfig} className="h-56 w-full">
              <AreaChart accessibilityLayer data={activityData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="events"
                  type="natural"
                  fill="var(--color-events)"
                  fillOpacity={0.25}
                  stroke="var(--color-events)"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Based on {logs.length} logged events
        </CardFooter>
      </Card>
    </div>
  );
}
