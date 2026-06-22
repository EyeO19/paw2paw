import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/design/cn";

const variantClasses = {
  primary:
    "bg-primary-500 text-ink-inverse hover:bg-primary-600 active:bg-primary-700",
  secondary:
    "border border-primary-500 bg-surface text-primary-700 hover:bg-primary-50",
  ghost: "bg-transparent text-ink-secondary hover:bg-surface-subtle",
  destructive: "bg-danger text-ink-inverse hover:bg-danger/90",
} as const;

const sizeClasses = {
  default: "min-h-11 px-5 py-3 text-sm font-semibold",
  sm: "min-h-9 px-3 py-2 text-sm font-semibold",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  href?: string;
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  href,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-sm transition-colors duration-200 ease-in-out",
    "focus-visible:outline-none focus-visible:shadow-focus",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
