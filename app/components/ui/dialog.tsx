"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/app/components/ui/button";

type DialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  disclaimer?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: "primary" | "destructive";
  isPending?: boolean;
};

export function Dialog({
  open,
  title,
  description,
  disclaimer,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = "primary",
  isPending = false,
}: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex min-h-[100dvh] w-full items-center justify-center bg-ink-primary/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[480px] rounded-xl bg-surface p-8 shadow-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="dialog-title"
          className="font-display text-lg font-semibold text-ink-primary"
        >
          {title}
        </h2>
        {description ? (
          <div className="mt-3 text-sm leading-relaxed text-ink-secondary">
            {description}
          </div>
        ) : null}
        {disclaimer ? (
          <p className="mt-2 text-xs text-ink-tertiary">{disclaimer}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
