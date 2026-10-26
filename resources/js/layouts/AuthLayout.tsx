import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Brand } from '../components/Brand.tsx';
import { Card } from '../components/Card.tsx';
import { SkipLink } from '../components/SkipLink.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Head title={title} />
      <SkipLink />
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[minmax(0,1fr)_30rem]">
        <section className="hidden flex-col justify-between border-r border-line bg-surface px-10 py-10 lg:flex">
          <Brand href="/" />
          <div className="max-w-md">
            <p className="text-sm font-semibold text-accent">Insight</p>
            <p className="mt-3 font-serif text-4xl leading-[1.15] font-medium text-ink">
              Privacy-first product analytics for understanding how people use
              your software.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Sign in is available. Event tracking sends only the events an
              application chooses. Funnels, retention, and journeys are not
              available yet.
            </p>
          </div>
          <p className="text-sm text-muted">
            No product metrics are collected in this version.
          </p>
        </section>
        <main
          id="main"
          className="flex flex-col justify-center px-4 py-10 sm:px-8"
        >
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Brand href="/" className="lg:hidden" />
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
            <Card>
              <h1 className="text-2xl text-ink">{title}</h1>
              {description ? (
                <p className="mt-2 text-sm leading-6 text-muted">
                  {description}
                </p>
              ) : null}
              <div className="mt-6">{children}</div>
            </Card>
            <div className="mt-6 text-sm text-muted">{footer}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
