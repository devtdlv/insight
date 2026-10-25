import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { TextField } from '../../components/TextField.tsx';
import { AuthLayout } from '../../layouts/AuthLayout.tsx';

export default function ResetPassword({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const form = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.post('/reset-password', {
      onFinish: () => form.reset('password', 'password_confirmation'),
    });
  }

  return (
    <AuthLayout
      title="Choose a new password"
      footer={
        <p>
          <Link
            href="/login"
            className="font-semibold text-teal-800 hover:text-teal-900"
          >
            Back to log in
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
          label="New password"
          type="password"
          value={form.data.password}
          error={form.errors.password}
          autoComplete="new-password"
          onChange={(value) => form.setData('password', value)}
        />
        <TextField
          id="password_confirmation"
          label="Password confirmation"
          type="password"
          value={form.data.password_confirmation}
          error={form.errors.password_confirmation}
          autoComplete="new-password"
          onChange={(value) => form.setData('password_confirmation', value)}
        />
        <button
          type="submit"
          disabled={form.processing}
          className="inline-flex justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {form.processing ? 'Saving password...' : 'Save password'}
        </button>
      </form>
    </AuthLayout>
  );
}
