import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import WorkspaceIndex from './Index.tsx';

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
    url: '/workspaces',
    props: {
      name: 'Insight',
      auth: { user: { id: 1, name: 'Ada Lovelace' } },
      flash: { status: null },
      workspaces: [{ id: 4, name: 'Ada Lab', role: 'owner' }],
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

it('links each membership to its workspace', () => {
  render(<WorkspaceIndex />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Your workspaces' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'Organize your products into workspaces and manage their projects, members, and analytics in one place.',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(/does not show product metrics/i)).toBeNull();
  expect(
    screen.getByRole('heading', { level: 2, name: 'Ada Lab' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open workspace' })).toHaveAttribute(
    'href',
    '/workspaces/4',
  );
  expect(
    screen.getByRole('link', { name: 'Create a workspace' }),
  ).toHaveAttribute('href', '/workspaces/create');
});
