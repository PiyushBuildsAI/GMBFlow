import Link from "next/link";
import { ArrowRight, Star, Shield, Zap, BarChart3 } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Automated outreach",
    description:
      "Queue leads and n8n sends service-specific review emails instantly.",
  },
  {
    icon: Shield,
    title: "Smart routing",
    description:
      "Happy clients go to Google. Constructive feedback stays internal.",
  },
  {
    icon: BarChart3,
    title: "Full visibility",
    description: "Track every email, open, and review from one dashboard.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between border-b px-4 sm:px-6">
        <BrandLogo />
        <Button variant="outline" render={<Link href="/onboard" />}>
          Get started
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Star className="size-3.5" />
            Google Business review management
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            Turn client satisfaction into{" "}
            <span className="underline decoration-foreground/20 underline-offset-4">
              Google reviews
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            GMBFlow helps service businesses collect feedback, send branded
            review requests, and route 4–5 star ratings straight to Google
            Business.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/onboard" />}>
              Create your workspace
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/workspaces" />}>
              Open existing workspace
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
