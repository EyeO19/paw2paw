import Link from "next/link";

import { GlassPanel } from "@/app/components/glass/glass-panel";
import { PawHeader } from "@/app/components/paw-header";
import { Button } from "@/app/components/ui/button";
import { TextLink } from "@/app/components/ui/page-shell";
import { MAX_WRITER_OPEN_THREADS } from "@/lib/constants/conversation-limits";
import { authCopy } from "@/lib/copy/auth";
import { homeCopy } from "@/lib/copy/home";
import { cn } from "@/lib/design/cn";

type HomeMindMapProps = {
  showRespond: boolean;
  canCompose: boolean;
  canStartNewConversation: boolean;
  writerOpenCount: number;
  activeResponderThreadId: string | null;
};

type MindMapCardProps = {
  href?: string;
  title: string;
  description: string;
  tone: "respond" | "compose" | "inbox";
};

const toneClasses = {
  respond: {
    card: "border-status-active/40 bg-[#fff8e8]/75 backdrop-blur-sm hover:bg-[#fff3d6]/85",
    title: "text-[#7a4a00]",
    body: "text-[#5c3d10]",
  },
  compose: {
    card: "border-success/40 bg-tag-identity-surface/75 backdrop-blur-sm hover:bg-[#d1fae5]/85",
    title: "text-[#14532d]",
    body: "text-[#166534]",
  },
  inbox: {
    card: "border-danger/40 bg-tag-relationships-surface/75 backdrop-blur-sm hover:bg-[#fce4ec]/85",
    title: "text-[#7f1d1d]",
    body: "text-[#9f1239]",
  },
} as const;

function MindMapCard({ href, title, description, tone }: MindMapCardProps) {
  const styles = toneClasses[tone];
  const className = cn(
    "block rounded-xl border-2 border-white/50 p-6 shadow-card transition-colors duration-200 md:p-8",
    styles.card,
    href ? undefined : "cursor-default opacity-95",
  );

  const content = (
    <>
      <h2
        className={cn(
          "mb-4 font-display text-2xl font-bold tracking-tight md:text-3xl",
          styles.title,
        )}
      >
        {title}
      </h2>
      <p className={cn("text-lg leading-relaxed md:text-xl", styles.body)}>
        {description}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function composeDescription(writerOpenCount: number, atLimit: boolean): string {
  if (atLimit) {
    return homeCopy.compose.limitReached(writerOpenCount);
  }

  if (writerOpenCount > 0) {
    return homeCopy.compose.descriptionWithCount(writerOpenCount);
  }

  return homeCopy.compose.description;
}

function inboxDescription(writerOpenCount: number): string {
  if (writerOpenCount >= MAX_WRITER_OPEN_THREADS) {
    return homeCopy.inbox.descriptionAtLimit(writerOpenCount);
  }

  return homeCopy.inbox.description;
}

export function HomeMindMap({
  showRespond,
  canCompose,
  canStartNewConversation,
  writerOpenCount,
  activeResponderThreadId,
}: HomeMindMapProps) {
  const hasActiveResponse = Boolean(activeResponderThreadId);
  const atWriterLimit = writerOpenCount >= MAX_WRITER_OPEN_THREADS;

  return (
    <div className="flex w-full flex-col gap-10 md:gap-12">
      <PawHeader />
      <GlassPanel className="md:p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {showRespond ? (
          <div className="md:col-span-2 md:mx-auto md:w-full md:max-w-2xl">
            <MindMapCard
              href={
                hasActiveResponse
                  ? `/thread/${activeResponderThreadId}`
                  : "/respond"
              }
              title={
                hasActiveResponse
                  ? homeCopy.respond.finishTitle
                  : homeCopy.respond.title
              }
              description={
                hasActiveResponse
                  ? homeCopy.respond.finishDescription
                  : homeCopy.respond.description
              }
              tone="respond"
            />
          </div>
        ) : null}

        {canCompose ? (
          <MindMapCard
            href={canStartNewConversation ? "/compose" : undefined}
            title={homeCopy.compose.title}
            description={composeDescription(writerOpenCount, atWriterLimit)}
            tone="compose"
          />
        ) : null}

        {showRespond ? (
          <MindMapCard
            href="/inbox"
            title={homeCopy.inbox.title}
            description={inboxDescription(writerOpenCount)}
            tone="inbox"
          />
        ) : null}
        </div>
      </GlassPanel>
    </div>
  );
}

type HomeGuestProps = Record<string, never>;

export function HomeGuest(_props: HomeGuestProps) {
  return (
    <GlassPanel className="mx-auto flex w-full max-w-lg flex-col items-center gap-10 text-center md:p-10">
      <PawHeader />
      <nav className="flex w-full flex-col gap-4">
        <Button href="/login" className="min-h-14 text-lg">
          {authCopy.login.submit}
        </Button>
        <TextLink href="/signup" className="text-center text-lg">
          {authCopy.signup.submit}
        </TextLink>
      </nav>
    </GlassPanel>
  );
}
