import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are offline.',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="text-4xl" aria-hidden>
        📴
      </div>
      <h1 className="mt-4 text-2xl font-bold">You’re offline</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        This page isn’t cached yet. The good news: once a tool page has loaded, it keeps working
        offline — your documents are always processed locally anyway.
      </p>
      <Link href="/" className="btn btn-primary mt-6">
        Go to the home page
      </Link>
    </div>
  );
}
