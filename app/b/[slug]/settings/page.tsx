import { notFound } from "next/navigation";
import { n8nRequest } from "@/lib/n8n";
import type { Business } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let business: Business;
  try {
    const data = await n8nRequest<{ business: Business }>("business.get", { slug });
    business = data.business;
  } catch {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Business profile, Google Place ID, and branding."
        slug={slug}
        section="Settings"
      />
      <SettingsForm business={business} />
    </div>
  );
}
