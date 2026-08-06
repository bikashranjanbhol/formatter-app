import type { ReactNode } from 'react';
import { Breadcrumbs } from '../layout/Breadcrumbs';
import { UpgradePrompt } from '../monetization/UpgradePrompt';
import { AdSlot } from '../monetization/AdSlot';
import {
  JsonLd,
  webAppStructuredData,
  breadcrumbStructuredData,
  faqStructuredData,
} from '../seo/JsonLd';
import { getTool, type ToolMode } from '@/lib/tools';
import { TOOL_CONTENT } from '@/lib/content';

interface ToolPageShellProps {
  mode: ToolMode;
  /** The interactive editor for this tool — a Client Component. */
  children: ReactNode;
  /**
   * Tool-specific wording for the privacy card. Defaults to a generic
   * statement that holds for every tool.
   */
  privacyNote?: string;
}

/**
 * Server-rendered shell shared by every tool page. The interactive workbench is
 * passed in as a child (a Client Component), while all SEO content — headings,
 * instructions, example, FAQ, and structured data — renders on the server for
 * fast first paint and crawling.
 *
 * Tools whose editor is the generic `Workbench` should use `ToolPage`; tools
 * with a bespoke editor (anonymizer, diff) compose this shell directly.
 */
export function ToolPageShell({ mode, children, privacyNote }: ToolPageShellProps) {
  const tool = getTool(mode);
  const content = TOOL_CONTENT[mode];

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: tool.nav, path: `/${tool.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[
          webAppStructuredData(tool.title, tool.description, `/${tool.slug}`),
          breadcrumbStructuredData(crumbs),
          faqStructuredData(content.faq),
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 pt-6">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{tool.title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">{tool.intro}</p>
      </div>

      <div className="mt-4">{children}</div>

      {/* SEO / explanatory content (server rendered) */}
      <div className="mx-auto mt-12 max-w-7xl px-4">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div className="space-y-10">
            <section aria-labelledby="how-to">
              <h2 id="how-to" className="text-xl font-semibold">
                How to use the {tool.nav.toLowerCase()}
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
                {content.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="example">
              <h2 id="example" className="text-xl font-semibold">
                Example: {content.example.title}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <figure>
                  <figcaption className="mb-1 text-xs font-medium uppercase text-slate-500">
                    Input
                  </figcaption>
                  <pre className="card overflow-x-auto p-3 text-xs">
                    <code>{content.example.input}</code>
                  </pre>
                </figure>
                <figure>
                  <figcaption className="mb-1 text-xs font-medium uppercase text-slate-500">
                    Output
                  </figcaption>
                  <pre className="card overflow-x-auto p-3 text-xs">
                    <code>{content.example.output}</code>
                  </pre>
                </figure>
              </div>
              {content.example.note && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {content.example.note}
                </p>
              )}
            </section>

            <section aria-labelledby="faq">
              <h2 id="faq" className="text-xl font-semibold">
                Frequently asked questions
              </h2>
              <dl className="mt-3 space-y-4">
                {content.faq.map((item) => (
                  <div key={item.q} className="card p-4">
                    <dt className="font-medium">{item.q}</dt>
                    <dd className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <aside className="space-y-6">
            <AdSlot size="rectangle" />
            <UpgradePrompt />
            <div className="card p-4 text-sm text-slate-600 dark:text-slate-400">
              <h2 className="font-semibold text-slate-800 dark:text-slate-200">
                Private by design
              </h2>
              <p className="mt-1">
                {privacyNote ??
                  'Every operation on this page runs locally in your browser. Your documents are never uploaded, logged, or stored.'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
