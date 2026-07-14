import type { PaginationMeta } from "./types";

export const LEADS_PAGE_SIZE = 25;
export const SERVICES_PAGE_SIZE = 12;
export const LOGS_PAGE_SIZE = 25;
export const ACTIVITY_PAGE_SIZE = 8;

export function normalizePagination(
  pagination: PaginationMeta | undefined | null,
  fallback: { items: unknown[]; limit: number; page?: number }
): PaginationMeta {
  if (pagination && typeof pagination.total === "number") {
    const limit = pagination.limit || fallback.limit;
    return {
      page: pagination.page || fallback.page || 1,
      limit,
      total: pagination.total,
      total_pages:
        pagination.total_pages || Math.max(1, Math.ceil(pagination.total / limit)),
    };
  }

  const total = fallback.items.length;
  const limit = fallback.limit;
  return {
    page: fallback.page || 1,
    limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}
