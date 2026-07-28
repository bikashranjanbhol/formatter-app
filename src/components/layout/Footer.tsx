import Link from 'next/link';
import { TOOLS, STATIC_PAGES } from '@/lib/tools';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/config';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span aria-hidden>🧰</span> {SITE_NAME}
          </div>
          <p className="mt-2 max-w-xs text-sm text-slate-600 dark:text-slate-400">{SITE_TAGLINE}</p>
        </div>
        <nav aria-label="JSON tools">
          <h2 className="text-sm font-semibold">JSON</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {TOOLS.filter((t) => t.group === 'JSON').map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/${t.slug}`}
                  className="hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {t.nav}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="YAML and schema tools">
          <h2 className="text-sm font-semibold">YAML &amp; Schema</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {TOOLS.filter((t) => t.group !== 'JSON').map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/${t.slug}`}
                  className="hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {t.nav}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="text-sm font-semibold">Company</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {STATIC_PAGES.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {p.nav}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
        © {year} {SITE_NAME}. Your documents are processed locally and never uploaded.
      </div>
    </footer>
  );
}
