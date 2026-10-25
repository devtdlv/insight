import { Link } from '@inertiajs/react';
import { AppLayout } from '../layouts/AppLayout.tsx';

export default function Welcome() {
  return (
    <AppLayout title="Home">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-teal-800 uppercase">
            Insight
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Product analytics for the software you ship
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Insight is a product analytics platform. This milestone is the
            application shell. It does not show product metrics, and it does not
            collect events yet.
          </p>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Later milestones will add event tracking, conversion funnels,
            retention analytics, user journeys, product engagement, and
            workspaces and projects.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Open the dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
