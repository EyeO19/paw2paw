import type { HTMLAttributes } from "react";

import { getAbstractAvatarStyle } from "@/lib/design/abstract-avatar";
import { cn } from "@/lib/design/cn";

type AbstractAvatarProps = HTMLAttributes<HTMLDivElement> & {
  hashedDisplayId: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-16",
} as const;

export function AbstractAvatar({
  hashedDisplayId,
  size = "md",
  className,
  ...props
}: AbstractAvatarProps) {
  const { color, borderRadius } = getAbstractAvatarStyle(hashedDisplayId);

  return (
    <div
      aria-hidden="true"
      className={cn("shrink-0", sizeClasses[size], className)}
      style={{ backgroundColor: color, borderRadius }}
      {...props}
    />
  );
}
