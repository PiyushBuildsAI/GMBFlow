import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { n8nRequest } from "@/lib/n8n";
import type { Business } from "@/lib/types";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function WorkspacesPage() {
  let businesses: Business[] = [];
  let error: string | null = null;

  try {
    const data = await n8nRequest<{ businesses: Business[] }>("business.list");
    businesses = data.businesses;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load workspaces";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between border-b px-4 sm:px-6">
        <BrandLogo />
        <Button variant="outline" render={<Link href="/onboard" />}>
          New workspace
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Your workspaces</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Open an existing business dashboard. Each workspace lives at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/b/your-slug</code>
          </p>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : businesses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Building2 className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No workspaces yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first business to get started.
                </p>
              </div>
              <Button render={<Link href="/onboard" />}>Create workspace</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {businesses.map((business) => (
              <Card key={business.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{business.name}</CardTitle>
                  <CardDescription>
                    <code>/b/{business.slug}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button render={<Link href={`/b/${business.slug}`} />}>
                    Open dashboard
                    <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
