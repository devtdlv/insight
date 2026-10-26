import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import Dashboard from '../pages/Dashboard.tsx';
import ProjectShow from '../pages/Projects/Show.tsx';
import { AppLayout } from './AppLayout.tsx';

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title?: string }) => <title>{title}</title>,
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePage: () => ({
    url: '/dashboard',
    props: {
      name: 'Insight',
      auth: { user: { id: 1, name: 'Ada Lovelace' } },
      flash: { status: null },
      workspaces: [],
    },
  }),
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', service: 'insight-api' }),
    }),
  );
});

it('keeps the API status when the shell rerenders for a new page', async () => {
  const fetchMock = vi.mocked(fetch);
  const { rerender } = render(
    <AppLayout title="Dashboard">
      <p>Dashboard page</p>
    </AppLayout>,
  );

  expect(screen.getByRole('status')).toHaveTextContent('Checking API');
  expect(await screen.findByText('API connected')).toBeInTheDocument();

  rerender(
    <AppLayout title="Workspaces">
      <p>Workspace page</p>
    </AppLayout>,
  );

  expect(screen.getByText('Workspace page')).toBeInTheDocument();
  expect(screen.getByText('API connected')).toBeInTheDocument();
  expect(screen.queryByText('Checking API')).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('gives authenticated pages a title prop instead of a new shell', () => {
  const dashboardLayout = (
    Dashboard as { layout?: { title?: string } | ((props: unknown) => unknown) }
  ).layout;
  const projectLayout = (
    ProjectShow as {
      layout?: (props: { project: { name: string } }) => { title: string };
    }
  ).layout;

  expect(dashboardLayout).toEqual({ title: 'Dashboard' });
  expect(projectLayout?.({ project: { name: 'Field notes' } })).toEqual({
    title: 'Field notes',
  });
  expect(typeof projectLayout).toBe('function');
  expect(projectLayout?.toString()).not.toContain('AppLayout');
});

it('paints the sidebar background on a stretching grid column, not a fixed-height panel', () => {
  render(
    <AppLayout title="Dashboard">
      <p>Long page</p>
    </AppLayout>,
  );

  const column = screen.getByTestId('sidebar-column');

  // The grid cell carries the background and border, so it stretches with the row.
  expect(column).toHaveClass('bg-sidebar', 'border-r', 'hidden', 'lg:block');
  expect(column.parentElement).toHaveClass('lg:grid', 'lg:min-h-screen');
  expect(column).not.toHaveClass('h-screen');

  // The sticky panel keeps navigation in view; it is not what paints the background.
  const panel = column.querySelector('aside');
  expect(panel).toHaveClass('sticky', 'top-0', 'h-screen');
  expect(panel).not.toHaveClass('bg-sidebar');
  expect(panel).toContainElement(
    screen.getAllByRole('navigation', { name: 'Primary' })[0],
  );
});
