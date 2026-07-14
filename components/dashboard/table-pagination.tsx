"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TablePagination({
  pagination,
  onPageChange,
  className,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { page = 1, limit = 25, total = 0, total_pages = 1 } = pagination ?? {};

  if (!total) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="px-1 text-sm text-muted-foreground whitespace-nowrap">
          Page {page} of {total_pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= total_pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
