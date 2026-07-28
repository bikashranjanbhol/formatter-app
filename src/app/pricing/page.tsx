import type { Metadata } from 'next';
import { PricingCard, type PricingPlan } from '@/components/monetization/PricingCard';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Free in-browser JSON and YAML tools, with Pro, Developer/API, and Team plans planned. Honest “coming soon” labels for features still in development.',
  alternates: { canonical: '/pricing' },
};

const PLANS: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    tagline: 'Everything you need for everyday JSON and YAML work.',
    features: [
      { text: 'Formatting and validation (JSON & YAML)' },
      { text: 'Standard local file-size limit (10 MB)' },
      { text: 'Collapsible tree view' },
      { text: 'Basic JSON ⇄ YAML conversion' },
      { text: 'JSON Schema validation (Draft 2020-12)' },
      { text: 'Supported by unobtrusive advertising' },
    ],
    cta: 'Start using it',
    ctaHref: '/json-formatter',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$6',
    cadence: 'mo',
    tagline: 'For power users who want more headroom and no ads.',
    features: [
      { text: 'No advertising' },
      { text: 'Higher local file-size limits' },
      { text: 'Advanced schema tooling', soon: true },
      { text: 'Batch processing', soon: true },
      { text: 'Advanced diff and querying', soon: true },
      { text: 'Saved private preferences', soon: true },
      { text: 'Future encrypted sharing', soon: true },
    ],
    cta: 'Coming soon',
    ctaHref: '/pricing',
    ctaDisabled: true,
  },
  {
    name: 'Developer / API',
    price: '$29',
    cadence: 'mo',
    tagline: 'Programmatic access for automation and CI/CD.',
    features: [
      { text: 'Future REST API access', soon: true },
      { text: 'API keys and usage limits', soon: true },
      { text: 'Batch validation and conversion', soon: true },
      { text: 'CI/CD integration', soon: true },
    ],
    cta: 'Coming soon',
    ctaHref: '/pricing',
    ctaDisabled: true,
  },
  {
    name: 'Team',
    price: 'Custom',
    tagline: 'Shared standards and governance for organizations.',
    features: [
      { text: 'Future shared schemas', soon: true },
      { text: 'Private workspaces', soon: true },
      { text: 'Roles and audit history', soon: true },
    ],
    cta: 'Coming soon',
    ctaHref: '/pricing',
    ctaDisabled: true,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ]}
      />
      <h1 className="mt-3 text-3xl font-bold">Simple, honest pricing</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
        The core tools are free and run entirely in your browser. Paid plans add headroom and team
        features. Anything not yet built is clearly marked{' '}
        <span className="font-medium">“Coming soon”</span> — there is no fake checkout.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Prices are indicative and not yet billable. Payments will be handled by Stripe Checkout once
        available; no payment information is collected today.
      </p>
    </div>
  );
}
