import { PageHeader } from "@/components/layout/page-header";
import { LeadTable } from "@/components/dashboard/lead-table";

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Import clients, tag by service, and queue review requests."
        slug={slug}
        section="Leads"
      />
      <LeadTable slug={slug} />
    </div>
  );
}
