export type ThemePreference = 'light' | 'dark' | 'system';

export const themeStorageKey = 'insight-theme';

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(themeStorageKey);

    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Private browsing can block storage. System theme still applies.
  }

  return 'system';
}

export function systemPrefersDark(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }

  return preference;
}

export function applyTheme(preference: ThemePreference): void {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;

  try {
    localStorage.setItem(themeStorageKey, preference);
  } catch {
    // The theme still applies for this visit when storage is blocked.
  }
}

export function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined;
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
}
