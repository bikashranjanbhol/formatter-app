import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SITE_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy & Architecture',
  description:
    'How the JSON & YAML Workbench keeps your documents private: all processing happens in your browser. Nothing is uploaded, logged, or stored.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Privacy', path: '/privacy' },
        ]}
      />
      <h1 className="mt-3 text-3xl font-bold">Privacy &amp; architecture</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        {SITE_NAME} is built to keep your data on your device. This page explains exactly how.
      </p>

      <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
        <h2 className="text-xl font-semibold">Everything runs in your browser</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          Formatting, validation, minification, conversion, tree building, and JSON Schema
          validation all execute as JavaScript in your browser tab. For large documents, the work is
          moved to a Web Worker — still on your device — so the interface stays responsive. At no
          point is your document sent to a server.
        </p>

        <h2 className="mt-8 text-xl font-semibold">What we never do</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
          <li>We never transmit your document contents to any API.</li>
          <li>We never log or store your documents.</li>
          <li>We never include document contents in analytics or error reports.</li>
          <li>We never persist your content unless you explicitly opt in to saving it.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">What is stored locally</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          Only UI preferences — your theme choice and formatting options such as indentation — are
          saved, and only in your browser’s local storage. These never contain document contents and
          never leave your device.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Uploaded files are treated as untrusted</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          Files you upload or drag in are read as text only, restricted to expected extensions, and
          capped at a configurable size limit to protect your browser’s memory. They are never
          executed.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Server routes</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          The application includes server routes only for future functionality such as a health
          check, payments, or optional encrypted sharing. Document contents are never sent through
          these routes during normal formatting, validation, or conversion.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Content Security Policy</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          A Content Security Policy restricts network connections to the same origin, so the page
          cannot exfiltrate your data even accidentally. Web Workers run from bundled code only.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Offline use</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          After your first visit, the app can be installed and used offline. Your documents are
          never cached by the service worker.
        </p>
      </div>
    </div>
  );
}
