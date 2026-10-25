import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Head title={title} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow"
      >
        Skip to content
      </a>
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12"
      >
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-md bg-teal-800 text-sm font-semibold text-white"
          >
            In
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight text-slate-950">
              Insight
            </span>
            <span className="block text-sm text-slate-600">
              Product analytics
            </span>
          </span>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-6 text-sm text-slate-600">{footer}</div>
      </main>
    </div>
  );
}
