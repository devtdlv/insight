import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';
import { AuthLayout } from '../../layouts/AuthLayout.tsx';
import { textLinkClass } from '../../lib/buttonStyles.ts';
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
      description="Enter the email address for your Insight account. If it matches an account, we will send reset instructions."
      footer={
        <p>
          <Link href="/login" className={textLinkClass}>
            Back to log in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-5">
        {flash.status ? (
          <p
            role="status"
            className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success"
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
          <Button type="submit" className="w-full" disabled={form.processing}>
            {form.processing ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
