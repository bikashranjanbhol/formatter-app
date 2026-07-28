import { TESTIMONIALS, TRUST_FACTS } from '@/lib/testimonials';

/**
 * Trust bar (honest, verifiable facts) plus a testimonials grid. Testimonial
 * content is placeholder template copy — see src/lib/testimonials.ts — and is
 * visibly labelled as sample content until real, permissioned quotes are added.
 */
export function SocialProof() {
  const hasPlaceholders = TESTIMONIALS.some((t) => t.placeholder);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12" aria-labelledby="social-proof">
      <h2 id="social-proof" className="sr-only">
        Why developers choose the workbench
      </h2>

      {/* Trust bar */}
      <div className="card grid grid-cols-2 divide-x divide-y divide-slate-200/70 overflow-hidden dark:divide-slate-800 md:grid-cols-4 md:divide-y-0">
        {TRUST_FACTS.map((fact) => (
          <div key={fact.label} className="p-6 text-center">
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-3xl font-extrabold text-transparent">
              {fact.value}
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{fact.label}</div>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div className="mt-10">
        <div className="flex items-center justify-center gap-3">
          <h3 className="text-center text-xl font-semibold">Loved by developers</h3>
          {hasPlaceholders && (
            <span
              className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              title="Replace these with real, permissioned quotes before launch"
            >
              Sample content
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="card flex flex-col p-6">
              <div className="text-2xl leading-none text-brand-500" aria-hidden>
                “
              </div>
              <blockquote className="mt-2 flex-1 text-sm text-slate-700 dark:text-slate-300">
                {t.quote}
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white"
                  aria-hidden
                >
                  {t.initials}
                </span>
                <span className="text-sm">
                  <span className="block font-medium">{t.author}</span>
                  <span className="block text-slate-500 dark:text-slate-400">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
