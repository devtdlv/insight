import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { TextField } from '../../components/TextField.tsx';
import { AuthLayout } from '../../layouts/AuthLayout.tsx';
import type { SharedProps } from '../../types/index.ts';

export default function ForgotPassword() {
  const { flash } = usePage<SharedProps>().props;
  const form = useForm({
    email: '',
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.post('/forgot-password');
  }

  return (
    <AuthLayout
      title="Reset your password"
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
      <p className="mb-5 text-sm leading-6 text-slate-600">
        Enter the email address for your Insight account. If it matches an
        account, we will send reset instructions.
      </p>
      {flash.status ? (
        <p
          role="status"
          className="mb-5 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
        >
          {flash.status}
        </p>
      ) : null}
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
        <button
          type="submit"
          disabled={form.processing}
          className="inline-flex justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {form.processing ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  );
}
