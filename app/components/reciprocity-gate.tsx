import { Button } from "@/app/components/ui/button";
import { reciprocityCopy } from "@/lib/copy/reciprocity";

type ReciprocityGateProps = {
  className?: string;
};

export function ReciprocityGate({ className }: ReciprocityGateProps) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-md border border-white/60 bg-surface-muted/55 p-6 text-center shadow-card backdrop-blur-sm ${className ?? ""}`}
    >
      <h2 className="font-display text-lg font-semibold text-ink-primary">
        {reciprocityCopy.gateTitle}
      </h2>
      <p className="text-sm text-ink-secondary">{reciprocityCopy.gateBody}</p>
      <Button href="/respond" className="self-center">
        {reciprocityCopy.gateCta}
      </Button>
    </div>
  );
}
