import type { HTMLAttributes } from "react";

import { cn } from "@/lib/design/cn";

type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  width?: "sm" | "md" | "lg" | "xl";
};

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-5xl",
} as const;

export function PageShell({
  className,
  width = "md",
  children,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center px-4 py-10 md:px-6 md:py-16",
        className,
      )}
      {...props}
    >
      <div className={cn("flex w-full flex-col gap-6", widthClasses[width])}>
        {children}
      </div>
    </div>
  );
}

export function PageTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "font-display text-2xl font-semibold tracking-tight text-ink-primary md:text-3xl",
        className,
      )}
      {...props}
    />
  );
}

export function PageDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-ink-secondary md:text-base", className)} {...props} />
  );
}

export function TextLink({
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 transition-colors duration-200 ease-in-out hover:text-primary-800",
        className,
      )}
      {...props}
    />
  );
}
