import { CAMPUS_RESOURCES } from "@/lib/constants/resources";
import { conversationCopy } from "@/lib/copy/conversation";

export function ResourceBridge() {
  return (
    <aside className="w-full">
      <details className="rounded-md border border-white/50 bg-surface p-4 shadow-card md:open md:block">
        <summary className="cursor-pointer text-sm font-semibold text-ink-primary md:hidden">
          {conversationCopy.resources.summary}
        </summary>
        <div className="mt-3 flex flex-col gap-3 md:mt-0">
          <p className="hidden text-sm font-semibold text-ink-primary md:block">
            {conversationCopy.resources.summary}
          </p>
          <p className="text-xs text-ink-secondary">{conversationCopy.resources.intro}</p>
          <ul className="flex flex-col gap-3">
            {CAMPUS_RESOURCES.map((resource) => (
              <li key={resource.id} className="text-sm">
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2"
                >
                  {resource.name}
                </a>
                <p className="text-xs text-ink-secondary">{resource.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </aside>
  );
}
