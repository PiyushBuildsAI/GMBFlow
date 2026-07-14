"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ReviewLeadResponse } from "@/lib/types";
import { ReviewPageShell } from "@/components/review/review-page";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ReviewLeadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    api
      .getReviewLead(token)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Invalid review link")
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {error || "This review link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  return <ReviewPageShell data={data} />;
}
