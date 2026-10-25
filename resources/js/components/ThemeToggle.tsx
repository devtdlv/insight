import { useEffect, useState } from 'react';
import {
  applyTheme,
  readThemePreference,
  subscribeToSystemTheme,
  type ThemePreference,
} from '../lib/theme.ts';
import { Icon, type IconName } from './Icon.tsx';

const options: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readThemePreference(),
  );

  useEffect(() => {
    applyTheme(preference);

    if (preference !== 'system') {
      return;
    }

    return subscribeToSystemTheme(() => applyTheme('system'));
  }, [preference]);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex rounded-lg bg-surface-muted p-0.5"
    >
      {options.map((option) => {
        const selected = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            onClick={() => setPreference(option.value)}
            className={`inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold motion-safe:transition-colors ${
              selected
                ? 'bg-surface text-ink shadow-[var(--shadow)]'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Icon name={option.icon} className="size-3.5 sm:hidden" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
