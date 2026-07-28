/**
 * Small, crisp inline SVG icons for toolbar actions. Kept stroke-based and
 * sized via `currentColor` so they inherit button text color and theme.
 */
type IconProps = { className?: string };

const base = 'h-4 w-4';

function Svg({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className ?? ''}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const FormatIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="18" y2="18" />
  </Svg>
);

export const MinifyIcon = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="4 8 8 12 4 16" />
    <polyline points="20 8 16 12 20 16" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <polyline points="8 11 12 15 16 11" />
    <path d="M5 21h14" />
  </Svg>
);

export const UploadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21V9" />
    <polyline points="8 13 12 9 16 13" />
    <path d="M5 3h14" />
  </Svg>
);

export const SampleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
  </Svg>
);

export const ClearIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-4" />
  </Svg>
);

export const RedoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h4" />
  </Svg>
);

export const HelpIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" />
    <line x1="12" y1="17" x2="12" y2="17" />
  </Svg>
);

export const CancelIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="9" y1="9" x2="15" y2="15" />
    <line x1="15" y1="9" x2="9" y2="15" />
  </Svg>
);
