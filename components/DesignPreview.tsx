"use client";

import { DesignState, OLD_CTA, Section } from "@/lib/model";

/** A tiny rendering of the demo design file: real state (sections, headline, CTA), drawn simply. */
export default function DesignPreview({ d, selected, onSelect, size = "sm" }: { d: DesignState; selected?: Section | null; onSelect?: (s: Section) => void; size?: "sm" | "lg" }) {
  const lg = size === "lg";
  const ring = (s: Section) => (selected === s ? "ring-2 ring-accent ring-offset-2 ring-offset-raised" : "");
  const state = (s: Section) => d.sections[s];
  const Block = ({ s, children, className = "" }: { s: Section; children: React.ReactNode; className?: string }) => {
    const st = state(s);
    const Tag = onSelect ? "button" : "div";
    return (
      <Tag
        {...(onSelect ? { type: "button" as const, onClick: () => onSelect(s), "aria-pressed": selected === s } : {})}
        className={`relative block w-full rounded-lg text-left transition ${ring(s)} ${st === "todo" ? "border border-dashed border-line-strong bg-bg/40 opacity-70" : "bg-surface shadow-sm"} ${className}`}
      >
        {st !== "todo" && (
          <span className={`mb-1.5 flex justify-end`}>
            <span className={`rounded-full px-1.5 text-[10px] font-semibold text-surface ${st === "done" ? "bg-ok" : "bg-warn"}`}>{st === "done" ? "Done" : "In progress"}</span>
          </span>
        )}
        {children}
      </Tag>
    );
  };
  const cta = (text: string, small?: boolean) => (
    <span className={`inline-block rounded-full font-semibold ${text === OLD_CTA ? "bg-line-strong text-text" : "bg-accent text-accent-fg"} ${small ? "px-2 py-0.5 text-[9px]" : lg ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}>{text}</span>
  );

  return (
    <div className={`grid items-start gap-4 ${lg ? "grid-cols-[1fr_170px]" : "grid-cols-[1fr_96px]"}`}>
      <div>
        <p className="mb-1.5 text-xs font-medium text-mute">Desktop</p>
        <div className="space-y-2 rounded-xl border border-line bg-raised p-2">
          <Block s="desktopHero" className={lg ? "p-5" : "p-3"}>
            <p className={`max-w-[80%] font-display font-semibold leading-tight ${lg ? "text-xl" : "text-xs"}`}>{d.headline}</p>
            <p className={`mt-1 text-mute ${lg ? "text-xs" : "text-[9px]"}`}>Plan, build and ship with your whole team.</p>
            <div className="mt-2 flex items-center gap-2">
              {cta(d.cta)}
              <span className={`${lg ? "h-16 w-28" : "h-6 w-12"} ml-auto rounded-md ${d.screenshots ? "bg-review-soft" : "bg-line"}`} title={d.screenshots ? "API screenshot" : "Screenshot placeholder"} />
            </div>
          </Block>
          <Block s="desktopPricing" className={lg ? "p-4" : "p-2"}>
            <p className={`font-semibold ${lg ? "text-sm" : "text-[10px]"}`}>Pricing</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {["Starter", "Team", "Scale"].map((t) => (
                <span key={t} className={`rounded-md border border-line ${lg ? "px-2 py-3 text-[11px]" : "px-1 py-1 text-[8px]"} text-mute`}>{t}</span>
              ))}
            </div>
          </Block>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-mute">Mobile</p>
        <div className="rounded-[18px] border-4 border-line-strong bg-raised p-1.5">
          <Block s="mobileHero" className={lg ? "px-2.5 py-4" : "px-1.5 py-2"}>
            <p className={`font-display font-semibold leading-tight ${lg ? "text-sm" : "text-[8px]"}`}>{d.headline}</p>
            <span className={`mt-1.5 block rounded ${lg ? "h-12" : "h-4"} ${d.screenshots ? "bg-review-soft" : "bg-line"}`} />
            <div className="mt-1.5">{cta(d.cta, !lg)}</div>
          </Block>
          <div className={`mt-1.5 rounded-lg border border-dashed border-line ${lg ? "h-16" : "h-5"}`} />
        </div>
      </div>
    </div>
  );
}
