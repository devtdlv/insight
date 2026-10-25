import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import Welcome from './Welcome.tsx';

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
  window.history.replaceState({}, '', '/');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', service: 'insight-api' }),
    }),
  );
});

it('renders the Insight landing page', async () => {
  render(<Welcome />);

  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Product analytics for the software you ship',
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/does not show product metrics/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/does not collect events yet/i)).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Open the dashboard' }),
  ).toHaveAttribute('href', '/dashboard');
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(await screen.findByText('API connected')).toBeInTheDocument();
});
