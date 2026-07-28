'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A lightweight, looping "watch it work" demo for the landing page: messy
 * minified JSON on the left is formatted line-by-line on the right. It only
 * animates while visible, and respects prefers-reduced-motion by showing the
 * finished state immediately. No real engine is invoked — this is illustrative.
 */

const INPUT = `{"user":{"name":"Ada","roles":["admin","editor"],"active":true},"count":42}`;

const OUTPUT_LINES = [
  '{',
  '  "user": {',
  '    "name": "Ada",',
  '    "roles": [',
  '      "admin",',
  '      "editor"',
  '    ],',
  '    "active": true',
  '  },',
  '  "count": 42',
  '}',
];

// Very small tokenizer purely for display coloring of the demo output.
function colorize(line: string): React.ReactNode {
  const keyMatch = line.match(/^(\s*)("[^"]+")(:\s*)(.*)$/);
  if (keyMatch) {
    const [, indent, key, colon, rest] = keyMatch;
    return (
      <>
        {indent}
        <span className="text-sky-600 dark:text-sky-400">{key}</span>
        {colon}
        {colorValue(rest ?? '')}
      </>
    );
  }
  return colorValue(line);
}

function colorValue(text: string): React.ReactNode {
  if (/^\s*"/.test(text))
    return <span className="text-emerald-600 dark:text-emerald-400">{text}</span>;
  if (/^\s*(true|false|null)/.test(text))
    return <span className="text-purple-600 dark:text-purple-400">{text}</span>;
  if (/^\s*-?\d/.test(text))
    return <span className="text-amber-600 dark:text-amber-400">{text}</span>;
  return <span className="text-slate-600 dark:text-slate-300">{text}</span>;
}

export function BeforeAfterDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisibleLines(OUTPUT_LINES.length);
      setDone(true);
      return;
    }

    let inView = false;
    let lineTimer: ReturnType<typeof setInterval> | null = null;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const startCycle = () => {
      setVisibleLines(0);
      setDone(false);
      let n = 0;
      lineTimer = setInterval(() => {
        n += 1;
        setVisibleLines(n);
        if (n >= OUTPUT_LINES.length) {
          if (lineTimer) clearInterval(lineTimer);
          setDone(true);
          resetTimer = setTimeout(() => {
            if (inView) startCycle();
          }, 2600);
        }
      }, 130);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !inView) {
          inView = true;
          startCycle();
        } else if (!entry?.isIntersecting) {
          inView = false;
          if (lineTimer) clearInterval(lineTimer);
          if (resetTimer) clearTimeout(resetTimer);
        }
      },
      { threshold: 0.4 },
    );

    const node = containerRef.current;
    if (node) observer.observe(node);
    return () => {
      observer.disconnect();
      if (lineTimer) clearInterval(lineTimer);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  return (
    <div ref={containerRef} className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
      {/* Before */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Before
          </span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          <code>{INPUT}</code>
        </pre>
      </div>

      {/* After */}
      <div className="card overflow-hidden ring-1 ring-brand-500/20">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full transition-colors ${done ? 'bg-emerald-500' : 'bg-brand-500'}`}
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              After
            </span>
          </div>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-opacity ${
              done
                ? 'bg-emerald-100 text-emerald-700 opacity-100 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'opacity-0'
            }`}
          >
            ● Valid
          </span>
        </div>
        <pre
          className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed"
          aria-label="Formatted JSON output"
        >
          <code>
            {OUTPUT_LINES.map((line, i) => (
              <div
                key={i}
                className={`transition-opacity duration-200 ${i < visibleLines ? 'opacity-100' : 'opacity-0'}`}
              >
                {colorize(line) ?? ' '}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
