import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle.tsx';

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themePreference;
  vi.unstubAllGlobals();
});

it('applies light, dark, and system themes', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  render(<ThemeToggle />);

  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(window.localStorage.getItem('insight-theme')).toBe('dark');

  fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
  expect(document.documentElement.dataset.theme).toBe('light');

  fireEvent.click(screen.getByRole('radio', { name: 'System' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.dataset.themePreference).toBe('system');
});
