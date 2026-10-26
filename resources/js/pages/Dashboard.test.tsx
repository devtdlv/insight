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

it('renders the dashboard shell without unfinished-feature promotion', async () => {
  render(
    <AppLayout title="Dashboard">
      <Dashboard />
    </AppLayout>,
  );

  expect(
    screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Open a project to see its events/i),
  ).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(
    /coming later|coming soon|not available yet|planned|No chart/i,
  );
  expect(
    screen.getByRole('heading', {
      level: 2,
      name: 'Find your product data in each project',
    }),
  ).toBeInTheDocument();

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
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
  expect(screen.queryByText(/^Soon$/)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Planned' })).toBeNull();
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Account menu for Ada Lovelace' }),
  );
  expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
  expect(await screen.findByText('API connected')).toBeInTheDocument();
});
