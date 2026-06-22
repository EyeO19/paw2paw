import type { Metadata } from "next";
import { Red_Hat_Display, Red_Hat_Text } from "next/font/google";

import { PageFooter } from "@/app/components/page-footer";
import "./globals.css";

const redHatText = Red_Hat_Text({
  variable: "--font-red-hat-text",
  subsets: ["latin"],
});

const redHatDisplay = Red_Hat_Display({
  variable: "--font-red-hat-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paw2Paw",
  description:
    "Anonymous peer support for Princeton students — matched one-to-one conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${redHatText.variable} ${redHatDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface-muted font-sans text-ink-primary">
        <main className="flex flex-1 flex-col">{children}</main>
        <PageFooter />
      </body>
    </html>
  );
}
