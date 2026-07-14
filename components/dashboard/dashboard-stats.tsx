"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { STATUS_POLL_MS, usePolling } from "@/lib/use-polling";
import type { DashboardStats } from "@/lib/types";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStats({ slug }: { slug: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      try {
        const res = await api.getStats(slug);
        setStats(res.stats);
      } catch (err) {
        if (!options?.silent) {
          toast.error(err instanceof Error ? err.message : "Failed to load stats");
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-muted-foreground">No stats available.</p>;
  }

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />
      <OverviewCharts slug={slug} stats={stats} />
      <Card>
        <CardHeader>
          <CardTitle>Average rating</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">
            {stats.avg_rating !== null ? (
              <>
                {stats.avg_rating.toFixed(1)}
                <span className="ml-1 text-lg font-normal text-muted-foreground">
                  / 5
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No reviews yet</span>
            )}
          </p>
        </CardContent>
      </Card>
      <RecentActivity slug={slug} />
    </div>
  );
}
