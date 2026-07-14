import { notFound } from "next/navigation";
import { n8nRequest } from "@/lib/n8n";
import type { Business } from "@/lib/types";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let business: Business;
  try {
    const data = await n8nRequest<{ business: Business }>("business.get", {
      slug,
    });
    business = data.business;
  } catch {
    notFound();
  }

  return <DashboardShell business={business}>{children}</DashboardShell>;
}
