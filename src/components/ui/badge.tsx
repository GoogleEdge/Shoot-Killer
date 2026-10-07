import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "accent" | "flare" | "ok" | "live";
  children: ReactNode;
}) {
  const tones = {
    muted: "bg-raised text-muted border-line",
    accent: "bg-accent/15 text-accent border-accent/30",
    flare: "bg-flare/15 text-flare border-flare/30",
    ok: "bg-ok/15 text-ok border-ok/30",
    live: "bg-ok/15 text-ok border-ok/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
