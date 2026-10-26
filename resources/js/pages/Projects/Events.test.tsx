import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectEvents from './Events.tsx';

const reload = vi.fn();

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
  router: {
    reload: (...args: unknown[]) => reload(...args),
  },
  usePage: () => ({
    url: '/workspaces/4/projects/8/events',
    props: {
      name: 'Insight',
      auth: { user: { id: 1, name: 'Ada Lovelace' } },
      flash: { status: null },
      workspaces: [{ id: 4, name: 'Northwind Notes', role: 'member' }],
    },
  }),
}));

beforeEach(() => {
  reload.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', service: 'insight-api' }),
    }),
  );
});

it('shows stored events and an empty state without sample metrics', () => {
  const { rerender } = render(
    <ProjectEvents
      workspace={{
        id: 4,
        name: 'Northwind Notes',
        role: 'member',
        canManage: false,
      }}
      project={{
        id: 8,
        name: 'Field notes',
        timezone: 'UTC',
        archivedAt: null,
        canManage: false,
      }}
      events={[]}
      previousPage={null}
      nextPage={null}
    />,
  );

  expect(
    screen.getByRole('heading', { name: 'No events yet' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/does not invent sample events/i),
  ).toBeInTheDocument();

  rerender(
    <ProjectEvents
      workspace={{
        id: 4,
        name: 'Northwind Notes',
        role: 'member',
        canManage: false,
      }}
      project={{
        id: 8,
        name: 'Field notes',
        timezone: 'UTC',
        archivedAt: null,
        canManage: false,
      }}
      events={[
        {
          id: 3,
          name: 'note_created',
          anonymousId: 'anon_reader001',
          identifiedUserId: null,
          properties: { notebook: 'Field notes' },
          occurredAt: '2026-10-26T00:00:00.000Z',
        },
      ]}
      previousPage={null}
      nextPage={2}
    />,
  );

  expect(
    screen.getByRole('heading', { name: 'note_created' }),
  ).toBeInTheDocument();
  expect(screen.getByText('anon_reader001')).toBeInTheDocument();
  expect(screen.getByText(/Field notes/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
    'href',
    '/workspaces/4/projects/8/events?page=2',
  );

  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(reload).toHaveBeenCalledOnce();
});
