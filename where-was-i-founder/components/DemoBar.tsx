import Link from "next/link";
import { ArrowLeft } from "./Icons";

/** Thin strip on every mock app so nobody mistakes it for a real integration. */
export default function DemoBar({ app }: { app: string }) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-2 text-sm text-text">
      <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-accent-deep px-3 py-1 font-medium text-accent hover:brightness-125">
        <ArrowLeft className="h-4 w-4" /> Back to Where Was I?
      </Link>
      <span className="truncate text-mute">
        <span className="font-semibold text-text">{app}</span>
        <span className="hidden sm:inline">: simulated app with local demo data, not a real integration</span>
      </span>
    </div>
  );
}
