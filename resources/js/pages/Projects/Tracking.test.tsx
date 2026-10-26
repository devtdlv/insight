import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectTracking from './Tracking.tsx';

const writeKey = `iw_${'a'.repeat(32)}`;

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
  useForm: () => ({
    processing: false,
    post: vi.fn(),
  }),
  usePage: () => ({
    url: '/workspaces/4/projects/8/tracking',
    props: {
      name: 'Insight',
      auth: { user: { id: 1, name: 'Ada Lovelace' } },
      flash: { status: null },
      workspaces: [{ id: 4, name: 'Northwind Notes', role: 'owner' }],
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
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

it('explains that the write key is public and can be copied', () => {
  render(
    <ProjectTracking
      endpoint="http://127.0.0.1:8000/api/v1/events"
      workspace={{
        id: 4,
        name: 'Northwind Notes',
        role: 'owner',
        canManage: true,
      }}
      project={{
        id: 8,
        name: 'Field notes',
        timezone: 'UTC',
        archivedAt: null,
        writeKey,
        canManage: true,
      }}
    />,
  );

  expect(
    screen.getByRole('heading', { level: 1, name: 'Tracking setup' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/visible in the browser code/i)).toBeInTheDocument();
  expect(screen.getByText(writeKey)).toBeInTheDocument();
  expect(screen.getByText(/note_created/)).toBeInTheDocument();
  expect(screen.getByText(/does not set a cookie/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Copy key' }));

  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(writeKey);
});
