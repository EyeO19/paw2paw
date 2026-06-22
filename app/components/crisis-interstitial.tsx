"use client";

import { Dialog } from "@/app/components/ui/dialog";
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
  return (
    <Dialog
      open={open}
      title={crisisCopy.interstitial.title}
      description={crisisCopy.interstitial.body}
      disclaimer={crisisCopy.interstitial.disclaimer}
      cancelLabel={crisisCopy.interstitial.exitLabel}
      confirmLabel={crisisCopy.interstitial.continueLabel}
      onCancel={onExit}
      onConfirm={onContinue}
    />
  );
}
