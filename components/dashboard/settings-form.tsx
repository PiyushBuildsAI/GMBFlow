"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Save } from "lucide-react";
import { api } from "@/lib/api";
import { buildGmbReviewUrl } from "@/lib/gmb";
import type { Business } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({ business }: { business: Business }) {
  const [name, setName] = useState(business.name);
  const [placeId, setPlaceId] = useState(business.place_id);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateBusiness({
        slug: business.slug,
        name,
        place_id: placeId,
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="settings-name">Business name</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-place-id">Google Place ID</Label>
          <Input
            id="settings-place-id"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">
            Must match exactly — one wrong character causes a 404. Copy from
            Google&apos;s Place ID Finder, don&apos;t type it by hand.
          </p>
          {placeId.trim() && (
            <a
              href={buildGmbReviewUrl(placeId.trim())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-foreground underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-3.5" />
              Test Google review link
            </a>
          )}
        </div>
        <div className="space-y-2">
          <Label>Workspace URL</Label>
          <Input value={`/b/${business.slug}`} readOnly className="bg-muted/50" />
        </div>
        <Button type="submit" disabled={loading}>
          <Save className="size-4" />
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
