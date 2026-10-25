import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';
import { AuthLayout } from '../../layouts/AuthLayout.tsx';
import { textLinkClass } from '../../lib/buttonStyles.ts';

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
      description="Use the email and password for your Insight account."
      footer={
        <p>
          New to Insight?{' '}
          <Link href="/register" className={textLinkClass}>
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
          <Link href="/forgot-password" className={textLinkClass}>
            Forgot your password?
          </Link>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={form.processing}
          >
            {form.processing ? 'Signing in...' : 'Log in'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
