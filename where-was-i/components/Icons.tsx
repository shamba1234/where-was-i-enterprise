type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const MailIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>
);
export const CourseIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M2 9.5 12 5l10 4.5-10 4.5L2 9.5Z" /><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" /></svg>
);
export const BrowserIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><circle cx="6.5" cy="6.5" r=".6" fill="currentColor" /><circle cx="9" cy="6.5" r=".6" fill="currentColor" /></svg>
);
export const PromiseIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M8 3h8l3 3v15H5V3h3" /><path d="M9 12l2 2 4-4" /></svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const RewindIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4.5h4.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const ArrowLeft = ({ className }: P) => (
  <svg {...base} className={className}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const UploadIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 15V4M7 9l5-5 5 5" /><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg>
);
export const FileIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" /><path d="M14 3v5h5" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const CircleIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="7" /></svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
/** Speech bubble: something the user told Where Was I? directly. */
export const ToldIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></svg>
);
export const ChevronDown = ({ className }: P) => (
  <svg {...base} className={className}><path d="m6 9 6 6 6-6" /></svg>
);
