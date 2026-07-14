import { PageHeader } from "@/components/layout/page-header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Monitor your review pipeline — leads, emails sent, and ratings collected."
        slug={slug}
        section="Overview"
      />
      <DashboardStats slug={slug} />
    </div>
  );
}
