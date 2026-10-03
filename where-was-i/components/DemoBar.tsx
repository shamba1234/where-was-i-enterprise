import Link from "next/link";
import { ArrowLeft } from "./Icons";

/** Thin strip on top of every mock app, so nobody mistakes it for a real integration. */
export default function DemoBar({ app }: { app: string }) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-ink px-4 py-2 text-sm text-white">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/20"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Where Was I?
      </Link>
      <span className="truncate text-white/70">
        <span className="font-semibold text-white">{app}</span>
        <span className="hidden sm:inline">: mock app with local demo data, not a real integration</span>
      </span>
    </div>
  );
}
