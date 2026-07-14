import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  LeadStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  queued: { label: "Queued", variant: "outline" },
  sent: { label: "Sent", variant: "default" },
  opened: { label: "Opened", variant: "default" },
  reviewed: { label: "Reviewed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
