import type { Metadata } from 'next';
import Link from 'next/link';
import { TOOLS } from '@/lib/tools';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/config';
import { JsonLd, webAppStructuredData } from '@/components/seo/JsonLd';
import { PrivacyIndicator } from '@/components/privacy/PrivacyIndicator';

export const metadata: Metadata = {
  title: `${SITE_NAME} — Private JSON & YAML Tools That Run In Your Browser`,
  description: SITE_TAGLINE,
  alternates: { canonical: '/' },
  openGraph: { title: SITE_NAME, description: SITE_TAGLINE, url: SITE_URL },
};

const FEATURES = [
  {
    title: 'Private by default',
    body: 'Formatting, validation, conversion, and tree views run entirely in your browser. Documents are never uploaded.',
    icon: '🔒',
  },
  {
    title: 'Schema-aware',
    body: 'Validate JSON and YAML against JSON Schema Draft 2020-12 with path-grouped, human-readable errors.',
    icon: '✅',
  },
  {
    title: 'Fast on large files',
    body: 'Heavy work moves to a Web Worker so the interface stays smooth, even on multi-megabyte documents.',
    icon: '⚡',
  },
  {
    title: 'Lossless YAML',
    body: 'Comments, anchors, aliases, tags, and key order are preserved. Conversions warn you before anything is lost.',
    icon: '🧬',
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={webAppStructuredData(SITE_NAME, SITE_TAGLINE, '/')} />

      <section className="relative mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <PrivacyIndicator />
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-slate-400">
              Private, schema-aware
            </span>
            <br />
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              JSON &amp; YAML tools
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {SITE_TAGLINE} No sign-up, no uploads — just fast, accurate developer tools that keep
            your data on your device.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/json-formatter" className="btn btn-primary px-5 py-2.5 text-base">
              Format JSON
            </Link>
            <Link href="/yaml-to-json" className="btn px-5 py-2.5 text-base">
              Convert YAML → JSON
            </Link>
            <Link href="/json-schema-validator" className="btn px-5 py-2.5 text-base">
              Validate against a schema
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> 100% in-browser
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> No account required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Works offline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Handles 10 MB+ files
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <div className="text-2xl" aria-hidden>
                {f.icon}
              </div>
              <h2 className="mt-2 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-2xl font-semibold">All tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.slug}
              href={`/${t.slug}`}
              className="card group p-5 transition hover:border-brand-400 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  {t.nav}
                </h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                  {t.group}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
