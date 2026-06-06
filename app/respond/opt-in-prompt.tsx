import Link from "next/link";

import { respondCopy } from "@/lib/copy/respond";
import { settingsCopy } from "@/lib/copy/settings";

type OptInPromptProps = {
  optInResponder: boolean;
};

export function OptInPrompt({ optInResponder }: OptInPromptProps) {
  const ctaLabel = optInResponder
    ? settingsCopy.optInPrompt.updatePreferences
    : settingsCopy.optInPrompt.enableResponder;

  return (
    <div className="flex w-full max-w-md flex-col gap-4 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">
        {respondCopy.optIn.title}
      </h2>
      <p className="text-sm text-zinc-600">{respondCopy.optIn.body}</p>
      <Link
        href="/settings?from=/respond"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
