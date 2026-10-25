import { usePage } from '@inertiajs/react';
import { AuthActions } from '../components/AuthActions.tsx';
import { Badge } from '../components/Badge.tsx';
import { Card } from '../components/Card.tsx';
import { PublicLayout } from '../layouts/PublicLayout.tsx';
import type { SharedProps } from '../types/index.ts';

const topics = [
  {
    title: 'Event tracking',
    body: 'Event tracking records the actions people take in your software, such as opening a screen or finishing a task. Collection is not built yet.',
  },
  {
    title: 'Conversion funnels',
    body: 'A conversion funnel is an ordered set of actions. It will show where people continue and where they stop. Funnel analysis is not available yet.',
  },
  {
    title: 'Retention',
    body: 'Retention asks who returns after a first action, and who does not. Retention views are not available yet.',
  },
  {
    title: 'User journeys',
    body: 'A user journey is the path someone takes across your product. Journey maps are not available yet.',
  },
] as const;

export default function Welcome() {
  const user = usePage<SharedProps>().props.auth.user;

  return (
    <PublicLayout title="Home">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-accent">Insight</p>
            <h1 className="mt-3 text-4xl leading-[1.15] text-ink sm:text-5xl">
              Privacy-first product analytics for understanding how people use
              your software.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Insight is the foundation of a product analytics platform. This
              page does not show product metrics, and Insight does not collect
              events yet. Creating an account only signs you in.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AuthActions user={user} />
            </div>
          </div>
          <section aria-labelledby="future-views-heading">
            <Card>
              <h2 id="future-views-heading" className="text-lg text-ink">
                Future views
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                A later dashboard could list these views. None of them have
                data.
              </p>
              <ul className="mt-5 grid gap-3">
                {topics.map((topic) => (
                  <li
                    key={topic.title}
                    className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2"
                  >
                    <span className="text-sm font-medium text-ink">
                      {topic.title}
                    </span>
                    <Badge tone="neutral">Not available yet</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
        <section className="mt-16" aria-labelledby="understand-heading">
          <h2 id="understand-heading" className="text-3xl text-ink">
            What you will be able to learn
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            These are the questions Insight is being built to answer. They are
            not available yet.
          </p>
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
