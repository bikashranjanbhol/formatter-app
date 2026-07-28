'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '../theme/ThemeToggle';
import { TOOLS, STATIC_PAGES } from '@/lib/tools';
import { SITE_NAME, GITHUB_URL } from '@/lib/config';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="group flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 font-mono text-sm text-white shadow-sm shadow-brand-600/30 transition-transform group-hover:scale-105"
          >
            {'{}'}
          </span>
          <span className="hidden bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400 sm:inline">
            {SITE_NAME}
          </span>
          <span className="sm:hidden">Workbench</span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 lg:flex">
          <ToolsMenu />
          {STATIC_PAGES.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className={`rounded px-2.5 py-1.5 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                isActive(`/${p.slug}`) ? 'font-semibold text-brand-600 dark:text-brand-400' : ''
              }`}
            >
              {p.nav}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn hidden sm:inline-flex"
            aria-label="View source on GitHub (placeholder)"
          >
            GitHub
          </a>
          <ThemeToggle />
          <button
            type="button"
            className="btn lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Toggle navigation</span>
            <span aria-hidden>☰</span>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 lg:hidden"
        >
          <div className="grid grid-cols-2 gap-1">
            {TOOLS.map((t) => (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.nav}
              </Link>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-200 pt-2 dark:border-slate-800">
            {STATIC_PAGES.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {p.nav}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function ToolsMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="rounded px-2.5 py-1.5 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
      >
        Tools ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          {TOOLS.map((t) => (
            <Link
              key={t.slug}
              role="menuitem"
              href={`/${t.slug}`}
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.nav}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
