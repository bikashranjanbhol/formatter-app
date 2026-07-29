import { TRUST_FACTS } from '@/lib/testimonials';

/**
 * Trust bar — honest, verifiable product facts. The testimonials grid was
 * removed for launch; add real, permissioned quotes here later (the data lives
 * in src/lib/testimonials.ts).
 */
export function SocialProof() {
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
    </section>
  );
}
