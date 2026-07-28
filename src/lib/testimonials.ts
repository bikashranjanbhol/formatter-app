/**
 * Social-proof content for the landing page.
 *
 * ⚠️ IMPORTANT: The entries below are PLACEHOLDER copy shipped with the
 * template. They are intentionally attributed by role only (no real names,
 * companies, or logos) so nothing reads as a fabricated endorsement. Before
 * launch, replace them with REAL, permissioned quotes from actual users — and
 * only then add real names/companies with their consent. Do not present
 * invented quotes as genuine reviews.
 */

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  /** Initials shown in the avatar bubble. */
  initials: string;
  placeholder?: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'The one JSON tool I can actually paste a production payload into — nothing leaves the browser, so I don’t have to think twice.',
    author: 'Sample review',
    role: 'Backend Engineer',
    initials: 'BE',
    placeholder: true,
  },
  {
    quote:
      'Schema validation with Draft 2020-12 and errors grouped by path saved our team an afternoon of guesswork.',
    author: 'Sample review',
    role: 'Platform Team Lead',
    initials: 'PL',
    placeholder: true,
  },
  {
    quote:
      'YAML → JSON that actually warns me when anchors get expanded. Finally a converter that’s honest about what it changes.',
    author: 'Sample review',
    role: 'DevOps Engineer',
    initials: 'DE',
    placeholder: true,
  },
];

/** Honest, verifiable product facts — safe to display as-is (not user quotes). */
export const TRUST_FACTS: { value: string; label: string }[] = [
  { value: '0', label: 'bytes uploaded to a server' },
  { value: '10 MB+', label: 'documents handled smoothly' },
  { value: '2020-12', label: 'JSON Schema draft supported' },
  { value: '9', label: 'JSON & YAML tools in one place' },
];
