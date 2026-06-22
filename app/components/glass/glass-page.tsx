import type { ReactNode } from "react";

import { AmbientBackground } from "@/app/components/glass/ambient-background";
import { PageShell } from "@/app/components/ui/page-shell";
import { cn } from "@/lib/design/cn";

type GlassPageProps = {
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  className?: string;
  shellClassName?: string;
};

export function GlassPage({
  children,
  width = "md",
  className,
  shellClassName,
}: GlassPageProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[calc(100dvh-4.5rem)] flex-1 flex-col",
        className,
      )}
    >
      <AmbientBackground />
      <PageShell
        width={width}
        className={cn("relative flex flex-1 justify-center", shellClassName)}
      >
        {children}
      </PageShell>
    </div>
  );
}
