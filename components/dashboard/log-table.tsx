"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { LOGS_PAGE_SIZE, normalizePagination } from "@/lib/pagination";
import type { ActivityLog, LogEvent, PaginationMeta } from "@/lib/types";
import { formatDate, formatEventLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "./table-pagination";

const EVENTS: LogEvent[] = [
  "lead.created",
  "lead.imported",
  "status.changed",
  "email.sent",
  "email.failed",
  "email.skipped",
  "review.submitted",
  "review.gmb_redirect",
  "review.opened",
  "business.created",
  "business.updated",
  "service.created",
  "service.updated",
];

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: LOGS_PAGE_SIZE,
  total: 0,
  total_pages: 1,
};

export function LogTable({ slug }: { slug: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<LogEvent | "all">("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listLogs(
        slug,
        eventFilter === "all" ? undefined : eventFilter,
        { page, limit: LOGS_PAGE_SIZE }
      );
      setLogs(res.logs);
      setPagination(
        normalizePagination(res.pagination, {
          items: res.logs,
          limit: LOGS_PAGE_SIZE,
          page,
        })
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [slug, eventFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select
          value={eventFilter}
          onValueChange={(v) => {
            setEventFilter((v as LogEvent | "all") ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {EVENTS.map((e) => (
              <SelectItem key={e} value={e}>
                {formatEventLabel(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No activity yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline">{formatEventLabel(log.event)}</Badge>
                  </TableCell>
                  <TableCell>{log.detail}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}
