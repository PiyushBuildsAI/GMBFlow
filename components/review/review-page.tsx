"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ReviewLeadResponse } from "@/lib/types";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

function GmbReviewButton({
  token,
  gmbUrl,
}: {
  token: string;
  gmbUrl: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await api.markGmbRedirect({ token });
      window.open(gmbUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open review link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      className="mt-6 gap-1.5"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Opening...
        </>
      ) : (
        <>
          <ExternalLink className="size-4" />
          Leave a Google review
        </>
      )}
    </Button>
  );
}

export function ReviewExperience({ data }: { data: ReviewLeadResponse }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [gmbUrl, setGmbUrl] = useState<string | null>(data.gmb_url ?? null);

  const showGmbPrompt =
    (done && gmbUrl) ||
    (data.already_reviewed && data.eligible_for_gmb && data.gmb_url);

  const activeGmbUrl = gmbUrl ?? data.gmb_url ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.submitReview({
        token: data.lead.review_token,
        rating,
        comment: comment || undefined,
      });
      setDone(true);
      if (result.eligible_for_gmb && result.gmb_url) {
        setGmbUrl(result.gmb_url);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (data.already_reviewed && !showGmbPrompt) {
    return (
      <Card className="w-full max-w-lg border shadow-sm">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="size-10 text-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Already submitted</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Thank you — your review has already been recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (done || (data.already_reviewed && showGmbPrompt)) {
    return (
      <Card className="w-full max-w-lg border shadow-sm">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="size-10 text-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Thank you!</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {activeGmbUrl
              ? "We appreciate your feedback. Tap below to leave a public Google review."
              : "We appreciate you taking the time. Your input helps us improve."}
          </p>
          {activeGmbUrl && (
            <GmbReviewButton
              token={data.lead.review_token}
              gmbUrl={activeGmbUrl}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg border shadow-sm">
      <CardHeader className="space-y-1 border-b pb-6 text-center">
        <p className="text-sm text-muted-foreground">{data.business.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          How was your {data.service.name} experience?
        </h1>
        <p className="text-sm text-muted-foreground">
          Hi {data.lead.name}, your honest feedback means a lot to us.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-2 rounded-xl border bg-muted/30 p-6">
            <StarRating value={rating} onChange={setRating} size="lg" />
            <p className="text-sm font-medium text-muted-foreground">
              {rating === 0 ? "Tap a star to rate" : ratingLabels[rating]}
            </p>
            {rating >= 4 && rating > 0 && (
              <p className="text-xs text-muted-foreground">
                You&apos;ll be invited to leave a Google review next
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              Comments (optional)
            </label>
            <Textarea
              id="comment"
              placeholder="Tell us what stood out..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit feedback"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ReviewPageShell({ data }: { data: ReviewLeadResponse }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <ReviewExperience data={data} />
    </div>
  );
}
