import type {
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics/events";

/** Never pass message content, email, or hashed_display_id. Thread UUIDs are OK. */
export function trackEvent(
  name: AnalyticsEventName,
  properties?: AnalyticsProperties,
): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console -- intentional dev-only analytics stub
    console.info("[analytics]", name, properties ?? {});
  }
}
