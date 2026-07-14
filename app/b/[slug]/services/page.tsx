import { PageHeader } from "@/components/layout/page-header";
import { ServicesPanel } from "@/components/dashboard/services-panel";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      <PageHeader
        title="Services"
        description="Define service tags and customize the email each client receives."
        slug={slug}
        section="Services"
      />
      <ServicesPanel slug={slug} />
    </div>
  );
}
