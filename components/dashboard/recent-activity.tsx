"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { STATUS_POLL_MS, usePolling } from "@/lib/use-polling";
import { ACTIVITY_PAGE_SIZE, normalizePagination } from "@/lib/pagination";
import type { ActivityLog, PaginationMeta } from "@/lib/types";
import { formatDate, formatEventLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "./table-pagination";

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: ACTIVITY_PAGE_SIZE,
  total: 0,
  total_pages: 1,
};

export function RecentActivity({ slug }: { slug: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      try {
        const res = await api.listLogs(slug, undefined, {
          page,
          limit: ACTIVITY_PAGE_SIZE,
        });
        setLogs(res.logs);
        setPagination(
          normalizePagination(res.pagination, {
            items: res.logs,
            limit: ACTIVITY_PAGE_SIZE,
            page,
          })
        );
      } catch (err) {
        if (!options?.silent) {
          toast.error(err instanceof Error ? err.message : "Failed to load activity");
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [slug, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  usePolling(() => load({ silent: true }), STATUS_POLL_MS);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest events across your workspace</CardDescription>
      </CardHeader>
      <CardContent className="divide-y px-0 pb-0">
        {logs.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-2 px-6 py-3.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <Badge variant="outline" className="text-[10px] font-medium">
                  {formatEventLabel(log.event)}
                </Badge>
                <p className="text-sm text-foreground">{log.detail}</p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(log.created_at)}
              </time>
            </div>
          ))
        )}
      </CardContent>
      <TablePagination pagination={pagination} onPageChange={setPage} />
    </Card>
  );
}
