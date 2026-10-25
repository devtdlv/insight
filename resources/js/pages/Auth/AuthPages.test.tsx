import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword.tsx';
import Login from './Login.tsx';
import Register from './Register.tsx';
import ResetPassword from './ResetPassword.tsx';

const harness = vi.hoisted(() => ({
  errors: {} as Record<string, string>,
  processing: false,
  status: null as string | null,
  post: vi.fn(),
}));

vi.mock('@inertiajs/react', async () => {
  const React = await import('react');

  return {
    Head: ({ title }: { title?: string }) =>
      React.createElement('title', null, title),
    Link: ({
      href,
      children,
      className,
    }: {
      href: string;
      children: ReactNode;
      className?: string;
    }) => React.createElement('a', { href, className }, children),
    usePage: () => ({
      url: window.location.pathname,
      props: {
        name: 'Insight',
        auth: { user: null },
        flash: { status: harness.status },
      },
    }),
    useForm: (initial: Record<string, string>) => {
      const [data, setData] = React.useState(initial);

      return {
        data,
        setData: (key: string, value: string) => {
          setData((current) => ({ ...current, [key]: value }));
        },
        post: harness.post,
        processing: harness.processing,
        errors: harness.errors,
        reset: () => undefined,
      };
    },
  };
});

afterEach(() => {
  harness.errors = {};
  harness.processing = false;
  harness.status = null;
  harness.post.mockReset();
});

it('shows login validation feedback and posts the form', () => {
  harness.errors = {
    email: 'These credentials do not match our records.',
  };

  render(<Login />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Log in' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'These credentials do not match our records.',
  );
  expect(
    screen.getByRole('link', { name: 'Forgot your password?' }),
  ).toHaveAttribute('href', '/forgot-password');
  expect(
    screen.getByRole('link', { name: 'Create an account' }),
  ).toHaveAttribute('href', '/register');

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'Correct-password-1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

  expect(harness.post).toHaveBeenCalledWith('/login', expect.any(Object));
});

it('disables the login button while the request is in progress', () => {
  harness.processing = true;

  render(<Login />);

  expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
});

it('shows registration errors and posts the account form', () => {
  harness.errors = {
    password: 'The password field confirmation does not match.',
  };

  render(<Register />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Create an account' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'The password field confirmation does not match.',
  );
  expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
    'href',
    '/login',
  );

  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Ada Lovelace' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'Correct-password-1' },
  });
  fireEvent.change(screen.getByLabelText('Password confirmation'), {
    target: { value: 'Correct-password-1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

  expect(harness.post).toHaveBeenCalledWith('/register', expect.any(Object));
});

it('shows the same password reset confirmation for a submitted email', () => {
  harness.status =
    'If an account exists for that email, we sent password reset instructions.';

  render(<ForgotPassword />);

  expect(screen.getByRole('status')).toHaveTextContent(
    'If an account exists for that email, we sent password reset instructions.',
  );
  expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute(
    'href',
    '/login',
  );

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ada@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

  expect(harness.post).toHaveBeenCalledWith('/forgot-password');
});

it('posts a new password with the reset token kept in the form', () => {
  harness.errors = {
    email: 'This password reset link is invalid or has expired.',
  };

  render(<ResetPassword token="reset-token" email="ada@example.com" />);

  expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'This password reset link is invalid or has expired.',
  );

  fireEvent.change(screen.getByLabelText('New password'), {
    target: { value: 'Replacement-22' },
  });
  fireEvent.change(screen.getByLabelText('Password confirmation'), {
    target: { value: 'Replacement-22' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));

  expect(harness.post).toHaveBeenCalledWith(
    '/reset-password',
    expect.any(Object),
  );
});
