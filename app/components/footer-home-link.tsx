"use client";

import { usePathname } from "next/navigation";

import { TextLink } from "@/app/components/ui/page-shell";
import { navigationCopy } from "@/lib/copy/navigation";

export function FooterHomeLink() {
  const pathname = usePathname();

  if (pathname === "/") {
    return <span aria-hidden="true" />;
  }

  return (
    <TextLink href="/" className="text-ink-tertiary">
      {navigationCopy.homeLink}
    </TextLink>
  );
}
