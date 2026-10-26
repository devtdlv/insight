import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppLayout } from '../layouts/AppLayout.tsx';
import Dashboard from './Dashboard.tsx';

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title?: string }) => <title>{title}</title>,
  Link: ({
    href,
    children,
    as,
    className,
    method,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    as?: string;
    className?: string;
    method?: string;
  }) => {
    void method;

    return as === 'button' ? (
      <button type="button" className={className} {...rest}>
        {children}
      </button>
    ) : (
      <a href={href} className={className} {...rest}>
        {children}
      </a>
    );
  },
  usePage: () => ({
    url: window.location.pathname,
    props: {
      name: 'Insight',
      auth: { user: { id: 1, name: 'Ada Lovelace' } },
      flash: { status: null },
      workspaces: [],
    },
  }),
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
  render(
    <AppLayout title="Dashboard">
      <Dashboard />
    </AppLayout>,
  );

  expect(
    screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Workspace-wide reporting is not available yet/i),
  ).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/coming later|No chart/i);
  expect(
    screen.getByRole('heading', {
      level: 2,
      name: 'Find your product data in each project',
    }),
  ).toBeInTheDocument();

  for (const title of [
    'Event tracking',
    'Project analytics',
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
  expect(
    screen.getByRole('navigation', { name: 'Primary' }),
  ).toBeInTheDocument();

  expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute(
    'href',
    '/workspaces',
  );
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
    'href',
    '/workspaces',
  );

  expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
    'href',
    '/workspaces',
  );

  for (const label of ['Funnels', 'Retention', 'Settings']) {
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
  }

  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Account menu for Ada Lovelace' }),
  );
  expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
  expect(await screen.findByText('API connected')).toBeInTheDocument();
});
