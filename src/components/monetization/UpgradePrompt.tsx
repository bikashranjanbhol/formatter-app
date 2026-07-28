import Link from 'next/link';

/** Small, non-intrusive Pro upsell. Never overlays the editor or controls. */
export function UpgradePrompt({ feature }: { feature?: string }) {
  return (
    <div className="dark:bg-brand-950/30 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-900">
      <p className="font-medium text-brand-900 dark:text-brand-200">
        {feature ? `${feature} is a Pro feature.` : 'Upgrade to Pro'}
      </p>
      <p className="mt-1 text-brand-800/80 dark:text-brand-300/80">
        Remove ads, raise file-size limits, and unlock advanced schema and diff tools.
      </p>
      <Link href="/pricing" className="btn btn-primary mt-3">
        See pricing
      </Link>
    </div>
  );
}

/** Inline notice shown when a free-tier limit is reached. */
export function FeatureLimitNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <p className="font-medium">⚠ {message}</p>
      <Link href="/pricing" className="mt-1 inline-block underline">
        Upgrade for higher limits
      </Link>
    </div>
  );
}
