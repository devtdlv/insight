import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';
import { AuthLayout } from '../../layouts/AuthLayout.tsx';
import { textLinkClass } from '../../lib/buttonStyles.ts';

const passwordHint =
  'Use at least 12 characters, with upper and lower case letters and a number.';

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
      description="Choose a new password for your Insight account."
      footer={
        <p>
          <Link href="/login" className={textLinkClass}>
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
          hint={passwordHint}
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
        <Button type="submit" className="w-full" disabled={form.processing}>
          {form.processing ? 'Saving password...' : 'Save password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
