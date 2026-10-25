import { Link } from '@inertiajs/react';
import { buttonClass } from '../lib/buttonStyles.ts';
import type { AuthUser } from '../types/index.ts';

export function AuthActions({ user }: { user: AuthUser | null }) {
  if (user) {
    return (
      <Link href="/dashboard" className={buttonClass('primary')}>
        Open the dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className={buttonClass('secondary')}>
        Log in
      </Link>
      <Link href="/register" className={buttonClass('primary')}>
        Create account
      </Link>
    </>
  );
}
