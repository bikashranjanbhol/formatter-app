import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SITE_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: `Terms of use for ${SITE_NAME}, a browser-based JSON and YAML toolkit.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Terms', path: '/terms' },
        ]}
      />
      <h1 className="mt-3 text-3xl font-bold">Terms of use</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 2026</p>

      <div className="mt-8 space-y-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-xl font-semibold">Acceptance</h2>
          <p className="mt-2">
            By using {SITE_NAME} you agree to these terms. If you do not agree, please do not use
            the service.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">The service is provided “as is”</h2>
          <p className="mt-2">
            The tools are provided without warranties of any kind. While we strive for correctness,
            you are responsible for verifying any output before relying on it in production systems.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Your data</h2>
          <p className="mt-2">
            Documents you process are handled entirely within your browser and are not transmitted
            to us. See the{' '}
            <a className="text-brand-600 underline dark:text-brand-400" href="/privacy">
              privacy page
            </a>{' '}
            for details.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Acceptable use</h2>
          <p className="mt-2">
            Do not use the service to violate any law, infringe intellectual property, or attempt to
            disrupt its operation.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Limitation of liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, we are not liable for any damages arising from
            your use of the service.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Changes</h2>
          <p className="mt-2">
            We may update these terms over time. Continued use after changes constitutes acceptance
            of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
