"use client";

import { CAMPUS_RESOURCES } from "@/lib/constants/resources";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { AnalyticsSurface } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { crisisCopy } from "@/lib/copy/crisis";

type CrisisResourceStripProps = {
  surface: AnalyticsSurface;
  threadId?: string;
};

export function CrisisResourceStrip({
  surface,
  threadId,
}: CrisisResourceStripProps) {
  const trackResource = (resourceId: string) => {
    trackEvent(ANALYTICS_EVENTS.resourceClicked, {
      resource_id: resourceId,
      surface,
      thread_id: threadId,
    });
  };

  return (
    <aside
      className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
      aria-label={crisisCopy.strip.title}
    >
      <p className="font-medium">{crisisCopy.strip.title}</p>
      <p className="mt-1 text-sky-900">{crisisCopy.strip.body}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <a
          href={crisisCopy.strip.call988Href}
          onClick={() => trackResource("988")}
          className="font-medium underline"
        >
          {crisisCopy.strip.call988}
        </a>
        <a
          href={crisisCopy.strip.learn988Href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackResource("988-info")}
          className="font-medium underline"
        >
          {crisisCopy.strip.learn988}
        </a>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-sky-800">
        {crisisCopy.strip.campusHeading}
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {CAMPUS_RESOURCES.map((resource) => (
          <li key={resource.id}>
            <a
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackResource(resource.id)}
              className="font-medium underline"
            >
              {resource.name}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
