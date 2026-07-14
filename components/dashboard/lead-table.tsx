"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, RotateCcw, Trash2, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { LEADS_PAGE_SIZE, normalizePagination } from "@/lib/pagination";
import { STATUS_POLL_MS, usePolling } from "@/lib/use-polling";
import type { Lead, LeadStatus, PaginationMeta, Service } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { StatusBadge } from "./status-badge";
import { AddLeadDialog } from "./add-lead-dialog";
import { EditLeadDialog } from "./edit-lead-dialog";
import { ImportLeadsDialog } from "./import-leads-dialog";
import { TablePagination } from "./table-pagination";
import { Card, CardContent } from "@/components/ui/card";

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: LEADS_PAGE_SIZE,
  total: 0,
  total_pages: 1,
};

const QUEUEABLE: LeadStatus[] = ["pending"];
const RETRYABLE: LeadStatus[] = ["failed", "queued"];

export function LeadTable({ slug }: { slug: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkServiceId, setBulkServiceId] = useState<string>("");

  const unassignedCount = unassignedTotal;

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const [leadsRes, servicesRes] = await Promise.all([
        api.listLeads(slug, statusFilter === "all" ? undefined : statusFilter, {
          page,
          limit: LEADS_PAGE_SIZE,
        }),
        api.listServices(slug, { page: 1, limit: 100 }),
      ]);
      setLeads(leadsRes.leads);
      setPagination(
        normalizePagination(leadsRes.pagination, {
          items: leadsRes.leads,
          limit: LEADS_PAGE_SIZE,
          page,
        })
      );
      setUnassignedTotal(leadsRes.unassigned_total ?? 0);
      setServices(servicesRes.services);
      if (!options?.silent) setSelected(new Set());
    } catch (err) {
      if (!options?.silent) {
        toast.error(err instanceof Error ? err.message : "Failed to load leads");
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [slug, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(() => load({ silent: true }), STATUS_POLL_MS);

  function goToPage(nextPage: number) {
    setPage(nextPage);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  async function queueSelected() {
    const ids = [...selected].filter((id) => {
      const lead = leads.find((l) => l.id === id);
      return lead && QUEUEABLE.includes(lead.status);
    });

    if (ids.length === 0) {
      toast.error("No pending leads selected");
      return;
    }

    setActionLoading(true);
    try {
      const result = await api.updateLeadStatus({
        slug,
        lead_ids: ids,
        status: "queued",
      });
      if (result.skipped.length > 0) {
        toast.warning(
          `Skipped ${result.skipped.length} lead(s) — may need a service assigned or already processed`
        );
      }
      toast.success(`Queued ${result.updated.length} leads for email`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue");
    } finally {
      setActionLoading(false);
    }
  }

  async function retryFailed() {
    const ids = leads
      .filter((l) => selected.has(l.id) && RETRYABLE.includes(l.status))
      .map((l) => l.id);

    if (ids.length === 0) {
      toast.error("No failed or queued leads selected to retry");
      return;
    }

    setActionLoading(true);
    try {
      const result = await api.updateLeadStatus({
        slug,
        lead_ids: ids,
        status: "queued",
      });
      toast.success(`Retrying ${result.updated.length} leads`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) {
      toast.error("No leads selected");
      return;
    }

    const ids = [...selected];
    if (!confirm(`Delete ${ids.length} lead(s)? This cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await api.deleteLeads({ slug, lead_ids: ids });
      toast.success(`Deleted ${result.deleted} lead(s)`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function assignService(leadId: string, serviceId: string) {
    try {
      await api.updateLeadService({ slug, lead_id: leadId, service_id: serviceId });
      toast.success("Service assigned");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign service");
    }
  }

  async function bulkAssignService(options: {
    lead_ids?: string[];
    all_unassigned?: boolean;
  }) {
    if (!bulkServiceId) {
      toast.error("Select a service first");
      return;
    }

    const serviceName = services.find((s) => s.id === bulkServiceId)?.name ?? "service";
    const count = options.all_unassigned
      ? unassignedCount
      : (options.lead_ids?.length ?? 0);

    if (count === 0) {
      toast.error("No leads to assign");
      return;
    }

    if (
      !confirm(
        `Assign "${serviceName}" to ${count} lead(s)?`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await api.bulkAssignService({
        slug,
        service_id: bulkServiceId,
        ...options,
      });
      toast.success(`Assigned "${result.service_name}" to ${result.updated} lead(s)`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk assign failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <AddLeadDialog slug={slug} services={services} onAdded={load} />
            <ImportLeadsDialog slug={slug} services={services} onImported={load} />
            <Button
              onClick={queueSelected}
              disabled={actionLoading || selected.size === 0}
            >
              <Send className="size-4" />
              <span className="hidden sm:inline">Queue for Review</span>
              <span className="sm:hidden">Queue</span>
            </Button>
            <Button
              variant="outline"
              onClick={retryFailed}
              disabled={actionLoading || selected.size === 0}
            >
              <RotateCcw className="size-4" />
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={deleteSelected}
              disabled={actionLoading || selected.size === 0}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter((v as LeadStatus | "all") ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {services.length > 0 && (unassignedCount > 0 || selected.size > 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="size-4 text-muted-foreground" />
              <span>
                {unassignedCount > 0 ? (
                  <>
                    <strong>{unassignedCount}</strong> lead
                    {unassignedCount === 1 ? "" : "s"} without a service
                  </>
                ) : (
                  "Bulk assign service"
                )}
              </span>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              <Select
                value={bulkServiceId || "none"}
                onValueChange={(v) =>
                  setBulkServiceId(v === "none" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Choose service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose service</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected.size > 0 && (
                <Button
                  variant="outline"
                  disabled={actionLoading || !bulkServiceId}
                  onClick={() => bulkAssignService({ lead_ids: [...selected] })}
                >
                  Assign to selected ({selected.size})
                </Button>
              )}
              {unassignedCount > 0 && (
                <Button
                  disabled={actionLoading || !bulkServiceId}
                  onClick={() => bulkAssignService({ all_unassigned: true })}
                >
                  Assign all unassigned ({unassignedCount})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={leads.length > 0 && selected.size === leads.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No leads yet. Add or import leads to get started.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>
                    {lead.service_name ? (
                      lead.service_name
                    ) : (
                      <Select
                        onValueChange={(v) => {
                          if (typeof v === "string" && v) assignService(lead.id, v);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue placeholder="Assign service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </TableCell>
                  <TableCell>
                    <EditLeadDialog slug={slug} lead={lead} onUpdated={load} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} onPageChange={goToPage} />
      </Card>
    </div>
  );
}
