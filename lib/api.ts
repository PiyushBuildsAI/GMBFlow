"use client";

import type {
  ActivityLog,
  Business,
  DashboardStats,
  Lead,
  LeadStatus,
  ListParams,
  LogEvent,
  MarkGmbRedirectResponse,
  PaginationMeta,
  ReviewLeadResponse,
  ReviewSubmitResponse,
  Service,
} from "./types";

class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function call<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch("/api/n8n", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiClientError(data.error || "Request failed");
  }

  return data as T;
}

export const api = {
  createBusiness: (data: {
    name: string;
    slug: string;
    place_id: string;
    logo_url?: string;
    owner_email?: string;
  }) => call<{ business: Business }>("business.create", data),

  getBusiness: (slug: string) =>
    call<{ business: Business }>("business.get", { slug }),

  listBusinesses: () => call<{ businesses: Business[] }>("business.list"),

  updateBusiness: (data: {
    slug: string;
    name?: string;
    place_id?: string;
    logo_url?: string;
  }) => call<{ business: Business }>("business.update", data),

  listServices: (slug: string, params?: ListParams) =>
    call<{ services: Service[]; pagination: PaginationMeta }>("service.list", {
      slug,
      ...params,
    }),

  createService: (data: {
    slug: string;
    name: string;
    email_subject: string;
    email_body: string;
  }) => call<{ service: Service }>("service.create", data),

  updateService: (data: {
    slug: string;
    service_id: string;
    name?: string;
    email_subject?: string;
    email_body?: string;
  }) => call<{ service: Service }>("service.update", data),

  listLeads: (slug: string, status?: LeadStatus, params?: ListParams) =>
    call<{ leads: Lead[]; pagination: PaginationMeta; unassigned_total: number }>(
      "lead.list",
      { slug, ...(status ? { status } : {}), ...params }
    ),

  createLead: (data: {
    slug: string;
    name: string;
    email: string;
    service_id: string;
    notes?: string;
  }) => call<{ lead: Lead }>("lead.create", data),

  importLeads: (data: {
    slug: string;
    leads: Array<{
      name: string;
      email: string;
      service?: string;
      notes?: string;
    }>;
    default_service_id?: string;
  }) =>
    call<{ imported: number; skipped_duplicates: number; leads: Lead[] }>(
      "lead.import",
      data
    ),

  deleteLeads: (data: { slug: string; lead_ids: string[] }) =>
    call<{ deleted: number; lead_ids: string[] }>("lead.delete", data),

  bulkAssignService: (data: {
    slug: string;
    service_id: string;
    lead_ids?: string[];
    all_unassigned?: boolean;
  }) =>
    call<{ updated: number; service_name: string }>(
      "lead.bulk_assign_service",
      data
    ),

  updateLead: (data: {
    slug: string;
    lead_id: string;
    name?: string;
    email?: string;
  }) => call<{ lead: Lead }>("lead.update", data),

  updateLeadService: (data: {
    slug: string;
    lead_id: string;
    service_id: string;
  }) => call<{ lead: Lead }>("lead.update_service", data),

  updateLeadStatus: (data: {
    slug: string;
    lead_ids: string[];
    status: LeadStatus;
  }) =>
    call<{ updated: Lead[]; skipped: string[] }>("lead.update_status", data),

  getReviewLead: (token: string) =>
    call<ReviewLeadResponse>("review.get_lead", { token }),

  submitReview: (data: { token: string; rating: number; comment?: string }) =>
    call<ReviewSubmitResponse>("review.submit", data),

  markGmbRedirect: (data: { token: string }) =>
    call<MarkGmbRedirectResponse>("review.mark_gmb_redirect", data),

  listLogs: (slug: string, event?: LogEvent, params?: ListParams) =>
    call<{ logs: ActivityLog[]; pagination: PaginationMeta }>("log.list", {
      slug,
      ...(event ? { event } : {}),
      ...params,
    }),

  getStats: (slug: string) =>
    call<{ stats: DashboardStats }>("stats.get", { slug }),
};
