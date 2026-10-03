import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import Shell from "@/components/Shell";
import { THEME_BOOT } from "@/lib/store";

export const metadata: Metadata = {
  title: "Where Was I? Enterprise",
  description: "Shared work continuity: what's unfinished, who owns the next action, where work stopped, what you were thinking, and whether it was actually verified.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-accent="indigo" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
