import { usePage } from '@inertiajs/react';
import { AuthActions } from '../components/AuthActions.tsx';
import { Card } from '../components/Card.tsx';
import { PublicLayout } from '../layouts/PublicLayout.tsx';
import type { SharedProps } from '../types/index.ts';

const topics = [
  {
    title: 'Event tracking',
    body: 'Applications send the actions they choose, such as finishing a task, through the Insight SDK. Insight does not record page views or clicks on its own.',
  },
  {
    title: 'Activity over time',
    body: 'See how many events arrive each hour or day, in the timezone of your project, with partial periods clearly marked.',
  },
  {
    title: 'Visitors and users',
    body: 'Count unique visitors and identified users, and compare each period with the one before it.',
  },
  {
    title: 'Top events',
    body: 'Find the events your product sends most often and what share of activity each one represents.',
  },
] as const;

export default function Welcome() {
  const user = usePage<SharedProps>().props.auth.user;

  return (
    <PublicLayout title="Home">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-accent">Insight</p>
          <h1 className="mt-3 text-4xl leading-[1.15] text-ink sm:text-5xl">
            Privacy-first product analytics for understanding how people use
            your software.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Insight records an event only when an application calls the SDK.
            This page does not show product metrics. Creating an account only
            signs you in.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AuthActions user={user} />
          </div>
        </div>
        <section className="mt-16" aria-labelledby="understand-heading">
          <h2 id="understand-heading" className="text-3xl text-ink">
            What you can learn
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {topics.map((topic) => (
              <li key={topic.title}>
                <Card className="h-full">
                  <h3 className="text-xl text-ink">{topic.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {topic.body}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PublicLayout>
  );
}
