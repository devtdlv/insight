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
  usePage: () => ({
    url: window.location.pathname,
    props: {
      name: 'Insight',
      auth: { user: null },
      flash: { status: null },
    },
  }),
}));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  window.localStorage.clear();
});

it('renders the Insight landing page', () => {
  render(<Welcome />);

  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Privacy-first product analytics for understanding how people use your software.',
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/does not show product metrics/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/only when an application calls the SDK/i),
  ).toBeInTheDocument();

  for (const title of [
    'Event tracking',
    'Activity over time',
    'Visitors and users',
    'Top events',
  ]) {
    expect(
      screen.getByRole('heading', { level: 3, name: title }),
    ).toBeInTheDocument();
  }

  for (const link of screen.getAllByRole('link', { name: 'Log in' })) {
    expect(link).toHaveAttribute('href', '/login');
  }

  for (const link of screen.getAllByRole('link', { name: 'Create account' })) {
    expect(link).toHaveAttribute('href', '/register');
  }
});
