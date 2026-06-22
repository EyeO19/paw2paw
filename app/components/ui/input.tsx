import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/design/cn";

const fieldClassName =
  "min-h-11 w-full rounded-sm border border-white/60 bg-surface/70 px-4 py-3 text-base text-ink-primary backdrop-blur-sm transition-colors duration-200 ease-in-out placeholder:text-ink-tertiary focus:border-primary-500 focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:bg-surface-subtle/80 disabled:text-ink-tertiary aria-invalid:border-danger";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-sm font-medium text-ink-secondary", className)}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClassName, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClassName, "min-h-24 resize-y", className)}
      {...props}
    />
  );
}

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 rounded-sm border-border-default text-primary-500 focus:shadow-focus",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      role="alert"
      className={cn("text-sm text-danger", className)}
      {...props}
    />
  );
}

export function FieldHint({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-ink-tertiary", className)} {...props} />
  );
}

export function InfoBanner({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "rounded-sm bg-surface-subtle px-3 py-2 text-sm text-ink-secondary",
        className,
      )}
      {...props}
    />
  );
}
