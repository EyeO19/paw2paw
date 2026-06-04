export const ANALYTICS_EVENTS = {
  messageSent: "message_sent",
  crisisInterstitialShown: "crisis_interstitial_shown",
  crisisInterstitialAcknowledged: "crisis_interstitial_acknowledged",
  messageReported: "message_reported",
  conversationEnded: "conversation_ended",
  resourceClicked: "resource_clicked",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsSurface = "compose" | "conversation" | "crisis_strip";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | undefined
>;
