import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { TextField } from '../../components/TextField.tsx';
import { AuthLayout } from '../../layouts/AuthLayout.tsx';

export default function Login() {
  const form = useForm({
    email: '',
    password: '',
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.post('/login', {
      onFinish: () => form.reset('password'),
    });
  }

  return (
    <AuthLayout
      title="Log in"
      footer={
        <p>
          New to Insight?{' '}
          <Link
            href="/register"
            className="font-semibold text-teal-800 hover:text-teal-900"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          value={form.data.email}
          error={form.errors.email}
          autoComplete="email"
          onChange={(value) => form.setData('email', value)}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          value={form.data.password}
          error={form.errors.password}
          autoComplete="current-password"
          onChange={(value) => form.setData('password', value)}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-teal-800 hover:text-teal-900"
          >
            Forgot your password?
          </Link>
          <button
            type="submit"
            disabled={form.processing}
            className="inline-flex justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {form.processing ? 'Signing in...' : 'Log in'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
