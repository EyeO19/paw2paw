import type { HTMLAttributes } from "react";

import { cn } from "@/lib/design/cn";

const variantClasses = {
  default: "bg-surface-subtle text-ink-secondary",
  status: "bg-primary-500 text-ink-inverse",
  "status-pending": "bg-danger text-ink-inverse",
  "status-matched": "bg-status-active text-ink-inverse",
  "status-closed": "bg-success text-ink-inverse",
} as const;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variantClasses;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-3 py-1 text-xs font-semibold capitalize",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
