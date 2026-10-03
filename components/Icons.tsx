type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
const I = (d: React.ReactNode) =>
  function Icon({ className = "h-4 w-4" }: P) {
    return (
      <svg {...base} className={className}>
        {d}
      </svg>
    );
  };

export const RewindIcon = I(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4.5h4.5" /><path d="M12 7.5V12l3 2" /></>);
export const CheckIcon = I(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const PlusIcon = I(<path d="M12 5v14M5 12h14" />);
export const CloseIcon = I(<path d="M6 6l12 12M18 6 6 18" />);
export const ArrowRight = I(<path d="M5 12h14M13 6l6 6-6 6" />);
export const ArrowLeft = I(<path d="M19 12H5M11 6l-6 6 6 6" />);
export const ArrowDown = I(<path d="M12 5v14M6 13l6 6 6-6" />);
export const ChevronDown = I(<path d="m6 9 6 6 6-6" />);
export const MicIcon = I(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
/** Breadcrumb: a dotted trail ending in a pin. */
export const CrumbIcon = I(<><circle cx="5" cy="18" r="1.2" fill="currentColor" /><circle cx="9" cy="14.5" r="1.2" fill="currentColor" /><path d="M17 3a4 4 0 0 0-4 4c0 3 4 7 4 7s4-4 4-7a4 4 0 0 0-4-4Z" /><circle cx="17" cy="7" r="1.2" /></>);
export const FlagIcon = I(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>);
export const LockIcon = I(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const FileIcon = I(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" /><path d="M14 3v5h5" /></>);
export const LinkIcon = I(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>);
export const SunIcon = I(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const MoonIcon = I(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />);
export const MonitorIcon = I(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>);
export const PaletteIcon = I(<><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.5 1-2 2-2h2a3 3 0 0 0 3-3c0-6-4-11-9-11Z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" /><circle cx="10" cy="7" r="1" fill="currentColor" /><circle cx="15" cy="7" r="1" fill="currentColor" /></>);
export const SearchIcon = I(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>);
export const BlockIcon = I(<><circle cx="12" cy="12" r="8" /><path d="m6.5 6.5 11 11" /></>);
export const RepeatIcon = I(<><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></>);
export const SparkIcon = I(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />);
export const HandoffIcon = I(<><path d="M4 12h12" /><path d="m12 6 6 6-6 6" /><path d="M20 5v14" /></>);
export const UsersIcon = I(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>);
export const ResetIcon = I(<><path d="M4 4v6h6" /><path d="M5 15a8 8 0 1 0 2-8.5L4 10" /></>);
export const EyeIcon = I(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>);
export const DesignIcon = I(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>);
export const FormIcon = I(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>);
export const ClockIcon = I(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
