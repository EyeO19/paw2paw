import { CAMPUS_RESOURCES } from "@/lib/constants/resources";
import { conversationCopy } from "@/lib/copy/conversation";

export function ResourceBridge() {
  return (
    <aside className="w-full md:w-64 md:shrink-0">
      <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:open md:block md:border-0 md:bg-transparent md:p-0">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900 md:hidden">
          {conversationCopy.resources.summary}
        </summary>
        <div className="mt-3 flex flex-col gap-3 md:mt-0">
          <p className="hidden text-sm font-semibold text-zinc-900 md:block">
            {conversationCopy.resources.summary}
          </p>
          <p className="text-xs text-zinc-600">{conversationCopy.resources.intro}</p>
          <ul className="flex flex-col gap-3">
            {CAMPUS_RESOURCES.map((resource) => (
              <li key={resource.id} className="text-sm">
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-900 underline"
                >
                  {resource.name}
                </a>
                <p className="text-xs text-zinc-600">{resource.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </aside>
  );
}
