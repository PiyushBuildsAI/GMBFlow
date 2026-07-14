"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { slugify } from "@/lib/gmb";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const steps = [
  { title: "Business", description: "Name and workspace URL" },
  { title: "Google", description: "Connect your Place ID" },
];

export function OnboardWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) setSlug(slugify(value));
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await api.createBusiness({
        name,
        slug,
        place_id: placeId,
        owner_email: ownerEmail || undefined,
      });
      setCreatedUrl(`${window.location.origin}/b/${result.business.slug}`);
      setStep(2);
      toast.success("Workspace created");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create";
      if (message.includes("slug already exists")) {
        toast.error("This workspace URL is already taken", {
          description: `Open /b/${slug} or pick a different slug.`,
          action: {
            label: "View workspaces",
            onClick: () => router.push("/workspaces"),
          },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === 2 && createdUrl) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-2xl border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-6" />
          </div>
          <h2 className="text-xl font-semibold">You&apos;re all set</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your review workspace is live. Bookmark this URL.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
            <code className="flex-1 truncate text-left text-xs">{createdUrl}</code>
            <Button variant="ghost" size="icon-sm" onClick={copyUrl}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <Button className="mt-6 w-full" onClick={() => router.push(createdUrl)}>
            Open dashboard
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 flex items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-3">
          <Link
            href="/workspaces"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Open existing
          </Link>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
        </div>
      </div>

      <Progress value={((step + 1) / steps.length) * 100} className="mb-8 h-1" />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{steps[step].title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{steps[step].description}</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Business name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  className="pl-9"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="FusionSync Technologies"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Workspace URL</Label>
              <div className="flex items-center rounded-lg border bg-muted/30">
                <span className="px-3 text-sm text-muted-foreground">/b/</span>
                <Input
                  id="slug"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="fusionsync"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="place-id">Google Place ID</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="place-id"
                  className="pl-9 font-mono text-sm"
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  placeholder="ChIJ..."
                />
              </div>
            </div>
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
              Used to redirect happy customers (4–5 stars) to your Google review page.
              Find your Place ID in Google&apos;s Place ID Finder.
            </p>
            <div className="space-y-2">
              <Label htmlFor="owner-email">Alert email (optional)</Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="you@business.com"
              />
              <p className="text-xs text-muted-foreground">
                Notified when clients leave 1–3 star ratings.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {step < 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!name || !slug}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={loading || !placeId}>
              {loading ? "Creating..." : "Create workspace"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              i <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
