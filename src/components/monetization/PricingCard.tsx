import Link from 'next/link';

export interface PricingPlan {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  features: { text: string; soon?: boolean }[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
  ctaDisabled?: boolean;
}

export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div className={`card flex flex-col p-6 ${plan.featured ? 'ring-2 ring-brand-500' : ''}`}>
      {plan.featured && (
        <span className="mb-2 self-start rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{plan.tagline}</p>
      <div className="mt-4">
        <span className="text-3xl font-bold">{plan.price}</span>
        {plan.cadence && <span className="text-sm text-slate-500"> /{plan.cadence}</span>}
      </div>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden className="text-emerald-600">
              ✓
            </span>
            <span className={f.soon ? 'text-slate-500' : ''}>
              {f.text}
              {f.soon && (
                <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  Coming soon
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {plan.ctaDisabled ? (
        <button
          type="button"
          disabled
          className="btn mt-6 w-full cursor-not-allowed opacity-60"
          title="Not yet available"
        >
          {plan.cta}
        </button>
      ) : (
        <Link
          href={plan.ctaHref}
          className={`btn mt-6 w-full ${plan.featured ? 'btn-primary' : ''}`}
        >
          {plan.cta}
        </Link>
      )}
    </div>
  );
}
