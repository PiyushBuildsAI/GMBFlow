import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  invert,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-md",
          invert ? "bg-white text-black" : "bg-primary text-primary-foreground"
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
        </svg>
      </div>
      <span className="text-sm font-semibold tracking-tight">GMBFlow</span>
    </Link>
  );
}
