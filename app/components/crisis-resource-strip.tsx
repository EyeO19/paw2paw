import { crisisCopy } from "@/lib/copy/crisis";

export function CrisisResourceStrip() {
  return (
    <aside
      className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-ink-primary backdrop-blur-sm"
      aria-label={crisisCopy.strip.title}
    >
      <p className="font-medium text-ink-primary">{crisisCopy.strip.title}</p>
      <p className="mt-1 text-ink-secondary">{crisisCopy.strip.body}</p>
    </aside>
  );
}
