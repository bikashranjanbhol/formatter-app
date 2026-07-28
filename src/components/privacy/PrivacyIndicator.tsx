import Link from 'next/link';

/**
 * Always-visible reassurance that processing is local. Links to the privacy
 * page for the full architecture explanation.
 */
export function PrivacyIndicator() {
  return (
    <Link
      href="/privacy"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
      title="Your documents are processed entirely in your browser"
    >
      <span aria-hidden>🔒</span>
      Processed locally in your browser
    </Link>
  );
}
