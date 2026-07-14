"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "lg",
}: {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "lg";
}) {
  const iconSize = size === "lg" ? "size-10" : "size-5";

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            className={cn(
              "rounded-md p-1 transition-transform",
              readonly ? "cursor-default" : "cursor-pointer hover:scale-105"
            )}
          >
            <Star
              className={cn(
                iconSize,
                "transition-colors",
                filled ? "fill-foreground text-foreground" : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
