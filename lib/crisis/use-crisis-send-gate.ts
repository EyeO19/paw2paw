"use client";

import { useCallback, useState } from "react";

import { detectCrisisSignals } from "@/lib/constants/crisis-phrases";
import {
  hasCrisisAck,
  markCrisisAck,
} from "@/lib/crisis/crisis-ack";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import type { AnalyticsSurface } from "@/lib/analytics/events";

type UseCrisisSendGateOptions = {
  surfaceId: string;
  surface: AnalyticsSurface;
  threadId?: string;
  onProceed: (content: string) => void;
  onClearComposer?: () => void;
};

export function useCrisisSendGate({
  surfaceId,
  surface,
  threadId,
  onProceed,
  onClearComposer,
}: UseCrisisSendGateOptions) {
  const [interstitialOpen, setInterstitialOpen] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  const runProceed = useCallback(
    (content: string) => {
      setInterstitialOpen(false);
      setPendingContent(null);
      onProceed(content);
    },
    [onProceed],
  );

  const requestSend = useCallback(
    (rawContent: string) => {
      const content = rawContent.trim();
      if (!content) {
        return;
      }

      const shouldCheckPhrase = !hasCrisisAck(surfaceId, content);

      if (shouldCheckPhrase && detectCrisisSignals(content)) {
        setPendingContent(content);
        setInterstitialOpen(true);
        trackEvent(ANALYTICS_EVENTS.crisisInterstitialShown, {
          surface,
          thread_id: threadId,
        });
        return;
      }

      runProceed(content);
    },
    [runProceed, surface, surfaceId, threadId],
  );

  const handleContinue = useCallback(() => {
    if (!pendingContent) {
      return;
    }
    markCrisisAck(surfaceId, pendingContent);
    trackEvent(ANALYTICS_EVENTS.crisisInterstitialAcknowledged, {
      surface,
      thread_id: threadId,
      action: "continue",
    });
    runProceed(pendingContent);
  }, [pendingContent, runProceed, surface, surfaceId, threadId]);

  const handleExit = useCallback(() => {
    trackEvent(ANALYTICS_EVENTS.crisisInterstitialAcknowledged, {
      surface,
      thread_id: threadId,
      action: "exit",
    });
    setInterstitialOpen(false);
    setPendingContent(null);
    onClearComposer?.();
  }, [onClearComposer, surface, threadId]);

  return {
    requestSend,
    interstitialOpen,
    handleContinue,
    handleExit,
  };
}
