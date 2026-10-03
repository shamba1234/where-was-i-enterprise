import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import { DemoProvider } from "@/lib/state";

export const metadata: Metadata = {
  title: "Where Was I?",
  description: "Remembers unfinished tasks, restores your context, and checks that the important things actually got done.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
