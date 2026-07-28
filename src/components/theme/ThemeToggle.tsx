'use client';

import { useTheme, type ThemePreference } from './ThemeProvider';

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light theme', icon: '☀️' },
  { value: 'dark', label: 'Dark theme', icon: '🌙' },
  { value: 'system', label: 'System theme', icon: '💻' },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex items-center rounded-md border border-slate-300 p-0.5 dark:border-slate-700"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setPreference(opt.value)}
            className={`rounded px-2 py-1 text-sm transition ${
              active
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <span aria-hidden>{opt.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
