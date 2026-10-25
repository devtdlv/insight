import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { AccountMenu } from '../components/AccountMenu.tsx';
import { ApiStatus } from '../components/ApiStatus.tsx';
import { Brand } from '../components/Brand.tsx';
import { MobileNav } from '../components/MobileNav.tsx';
import { SidebarNav } from '../components/SidebarNav.tsx';
import { SkipLink } from '../components/SkipLink.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { buttonClass } from '../lib/buttonStyles.ts';
import type { SharedProps } from '../types/index.ts';

export function AppLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { url, props } = usePage<SharedProps>();
  const path = url.split('?')[0] ?? url;
  const user = props.auth.user;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Head title={title} />
      <SkipLink />
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="on-sidebar sticky top-0 hidden h-screen flex-col border-r border-sidebar-line bg-sidebar text-sidebar-ink lg:flex">
          <div className="px-4 py-5">
            <Brand href="/dashboard" tone="inverse" />
          </div>
          <SidebarNav
            path={path}
            className="flex-1 overflow-y-auto px-3 pb-6"
          />
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <MobileNav path={path} />
              <Brand href="/dashboard" className="lg:hidden" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <ApiStatus />
              <ThemeToggle />
              {user ? (
                <AccountMenu name={user.name} />
              ) : (
                <Link href="/login" className={buttonClass('primary')}>
                  Log in
                </Link>
              )}
            </div>
          </header>
          <main id="main" className="flex-1 px-4 py-8 sm:px-8 lg:px-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
