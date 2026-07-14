import { PageHeader } from "@/components/layout/page-header";
import { LogTable } from "@/components/dashboard/log-table";

export default async function LogsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Complete audit log — emails, status changes, and reviews."
        slug={slug}
        section="Activity"
      />
      <LogTable slug={slug} />
    </div>
  );
}
