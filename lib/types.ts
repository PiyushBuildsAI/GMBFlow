export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
}

export type LeadStatus =
  | "pending"
  | "queued"
  | "sent"
  | "opened"
  | "reviewed"
  | "failed";

export type LogEvent =
  | "lead.created"
  | "lead.imported"
  | "lead.deleted"
  | "lead.updated"
  | "status.changed"
  | "email.sent"
  | "email.failed"
  | "email.skipped"
  | "review.submitted"
  | "review.gmb_redirect"
  | "review.opened"
  | "business.created"
  | "business.updated"
  | "service.created"
  | "service.updated";

export interface Business {
  id: string;
  slug: string;
  name: string;
  place_id: string;
  logo_url?: string | null;
  owner_email?: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  email_subject: string;
  email_body: string;
  created_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  name: string;
  email: string;
  service_id: string | null;
  service_name?: string;
  status: LeadStatus;
  review_token: string;
  notes?: string | null;
  queued_at?: string | null;
  sent_at?: string | null;
  opened_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  lead_id: string;
  business_id: string;
  rating: number;
  comment?: string | null;
  redirected_to_gmb: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  business_id: string;
  lead_id?: string | null;
  event: LogEvent;
  detail: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  total_leads: number;
  pending: number;
  queued: number;
  sent: number;
  opened: number;
  reviewed: number;
  failed: number;
  avg_rating: number | null;
}

export interface ReviewLeadResponse {
  lead: Lead;
  business: Business;
  service: Service;
  already_reviewed: boolean;
  review?: Review | null;
  eligible_for_gmb?: boolean;
  gmb_url?: string;
}

export interface ReviewSubmitResponse {
  success: boolean;
  eligible_for_gmb: boolean;
  gmb_url?: string;
}

export interface MarkGmbRedirectResponse {
  ok: boolean;
  redirected_to_gmb: boolean;
  gmb_url?: string;
}

export interface ApiError {
  error: string;
}
