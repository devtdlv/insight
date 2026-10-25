import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard.tsx';

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title?: string }) => <title>{title}</title>,
  Link: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
  usePage: () => ({ url: window.location.pathname }),
}));

beforeEach(() => {
  window.history.replaceState({}, '', '/dashboard');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', service: 'insight-api' }),
    }),
  );
});

it('renders the dashboard shell and planned capabilities', async () => {
  render(<Dashboard />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/coming later/i)).toBeInTheDocument();
  expect(
    screen.getByText(/does not show product metrics/i),
  ).toBeInTheDocument();

  for (const title of [
    'Event tracking',
    'Conversion funnels',
    'Retention analytics',
    'User journeys',
    'Product engagement',
    'Workspaces and projects',
  ]) {
    expect(
      screen.getByRole('heading', { level: 3, name: title }),
    ).toBeInTheDocument();
  }

  expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(await screen.findByText('API connected')).toBeInTheDocument();
});
