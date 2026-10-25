import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ApiStatus } from '../components/ApiStatus.tsx';

const links = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
] as const;

export function AppLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { url } = usePage();
  const path = url.split('?')[0] ?? url;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Head title={title} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b border-slate-800 bg-slate-950 text-white lg:border-r lg:border-b-0">
          <div className="flex items-center gap-3 px-5 py-5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-md bg-teal-800 text-sm font-semibold text-white"
            >
              In
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">
                Insight
              </span>
              <span className="block text-sm text-slate-300">
                Product analytics
              </span>
            </span>
          </div>
          <nav
            aria-label="Primary"
            className="flex gap-2 px-3 pb-4 lg:flex-col lg:px-3"
          >
            {links.map((link) => {
              const active = path === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-sm text-slate-600">Product analytics</p>
            <ApiStatus />
          </header>
          <main id="main" className="flex-1 px-4 py-8 sm:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
