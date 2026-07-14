import { Users, Clock, Send, Star, AlertTriangle } from "lucide-react";
import type { DashboardStats } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const items = [
  { key: "total_leads" as const, label: "Total leads", icon: Users },
  { key: "pending" as const, label: "Pending", icon: Clock },
  { key: "sent" as const, label: "Emails sent", icon: Send },
  { key: "reviewed" as const, label: "Reviewed", icon: Star },
  { key: "failed" as const, label: "Failed", icon: AlertTriangle },
];

export function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const value =
          item.key === "total_leads" ? stats.total_leads : stats[item.key];
        return (
          <Card key={item.key} size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">
                {value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
