import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import { FounderProvider } from "@/lib/state";

export const metadata: Metadata = {
  title: "Where Was I? for founders",
  description: "Knows what's unresolved, who acts next, where interrupted work stopped, and whether a commitment was actually completed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <FounderProvider>{children}</FounderProvider>
      </body>
    </html>
  );
}
