/**
 * Social-proof content for the landing page.
 *
 * The placeholder testimonials were removed — we do not ship invented quotes.
 * When you have REAL, permissioned reviews from actual users, add them back as
 * a `TESTIMONIALS` array here (with their consent to be named) and render them
 * in `SocialProof`. Until then, only the verifiable trust facts below are shown.
 *
 * Template for a real testimonial, for when you have one:
 *
 *   export interface Testimonial {
 *     quote: string;
 *     author: string;   // real name, with permission
 *     role: string;     // e.g. "Backend Engineer, Acme"
 *     initials: string;
 *   }
 *   export const TESTIMONIALS: Testimonial[] = [ ... ];
 */

/** Honest, verifiable product facts — safe to display as-is (not user quotes). */
export const TRUST_FACTS: { value: string; label: string }[] = [
  { value: '0', label: 'bytes uploaded to a server' },
  { value: '10 MB+', label: 'documents handled smoothly' },
  { value: '2020-12', label: 'JSON Schema draft supported' },
  { value: '11', label: 'JSON & YAML tools in one place' },
];
