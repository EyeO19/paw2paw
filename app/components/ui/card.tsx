import type { HTMLAttributes } from "react";

import { cn } from "@/lib/design/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-border-subtle bg-surface p-6 shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardLink({
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "flex flex-col gap-3 rounded-md border border-white/60 bg-surface-muted/55 p-4 shadow-card backdrop-blur-sm transition-colors duration-200 ease-in-out hover:bg-surface/70",
        className,
      )}
      {...props}
    />
  );
}
