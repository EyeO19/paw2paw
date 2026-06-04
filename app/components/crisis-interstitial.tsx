"use client";

import { crisisCopy } from "@/lib/copy/crisis";

type CrisisInterstitialProps = {
  open: boolean;
  onContinue: () => void;
  onExit: () => void;
};

export function CrisisInterstitial({
  open,
  onContinue,
  onExit,
}: CrisisInterstitialProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-interstitial-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2
          id="crisis-interstitial-title"
          className="text-lg font-semibold text-zinc-900"
        >
          {crisisCopy.interstitial.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          {crisisCopy.interstitial.body}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          {crisisCopy.interstitial.disclaimer}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onExit}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
          >
            {crisisCopy.interstitial.exitLabel}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            {crisisCopy.interstitial.continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
