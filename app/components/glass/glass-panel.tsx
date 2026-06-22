import type { HTMLAttributes } from "react";

import { cn } from "@/lib/design/cn";

type GlassPanelProps = HTMLAttributes<HTMLDivElement>;

export function GlassPanel({ className, children, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-white/50 bg-surface/60 p-4 shadow-card backdrop-blur-2xl md:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
