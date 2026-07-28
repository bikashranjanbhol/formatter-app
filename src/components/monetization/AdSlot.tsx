import { ADS_ENABLED } from '@/lib/config';

type AdSize = 'leaderboard' | 'rectangle' | 'skyscraper';

const dimensions: Record<AdSize, { w: number; h: number; label: string }> = {
  leaderboard: { w: 728, h: 90, label: '728 × 90' },
  rectangle: { w: 300, h: 250, label: '300 × 250' },
  skyscraper: { w: 160, h: 600, label: '160 × 600' },
};

/**
 * Advertising placeholder. No real ad network is integrated. Slots reserve
 * their dimensions to avoid layout shift and are hidden entirely unless
 * NEXT_PUBLIC_ENABLE_ADS is set, so they never appear during development or
 * cover the editor, output, or controls.
 */
export function AdSlot({
  size = 'leaderboard',
  className = '',
}: {
  size?: AdSize;
  className?: string;
}) {
  if (!ADS_ENABLED) return null;
  const { w, h, label } = dimensions[size];
  return (
    <aside
      aria-label="Advertisement"
      className={`mx-auto flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900 ${className}`}
      style={{ width: '100%', maxWidth: w, height: h, minHeight: h }}
    >
      Ad placeholder ({label})
    </aside>
  );
}
