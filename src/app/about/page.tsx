import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SITE_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: 'About',
  description: `About ${SITE_NAME} — a fast, private, browser-based JSON and YAML developer toolkit.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
      />
      <h1 className="mt-3 text-3xl font-bold">About {SITE_NAME}</h1>

      <div className="mt-6 space-y-6 text-slate-700 dark:text-slate-300">
        <p>
          {SITE_NAME} is a collection of JSON and YAML developer tools that run entirely in your
          browser. It exists because working with configuration and API payloads should not require
          pasting potentially sensitive data into a remote server.
        </p>
        <section>
          <h2 className="text-xl font-semibold">Principles</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Privacy first.</strong> Your documents never leave your device.
            </li>
            <li>
              <strong>Honesty over magic.</strong> We never silently repair or transform your data —
              lossy operations are always flagged.
            </li>
            <li>
              <strong>Correctness.</strong> Standards-based parsing, precise error locations, and
              well-tested conversion.
            </li>
            <li>
              <strong>Speed.</strong> Heavy work runs in a Web Worker so the interface stays smooth.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Built with</h2>
          <p className="mt-2">
            Next.js, React, TypeScript, Tailwind CSS, CodeMirror 6, the <code>yaml</code> library,
            and AJV for JSON Schema Draft 2020-12 validation.
          </p>
        </section>
        <p>
          Ready to try it?{' '}
          <Link href="/json-formatter" className="text-brand-600 underline dark:text-brand-400">
            Open the JSON formatter
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
