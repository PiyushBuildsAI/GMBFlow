import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function PageHeader({
  title,
  description,
  slug,
  section,
}: {
  title: string;
  description?: string;
  slug?: string;
  section?: string;
}) {
  return (
    <div className="space-y-1 pb-6">
      {slug && section && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/b/${slug}`}>Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{section}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
      )}
    </div>
  );
}
