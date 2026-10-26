import { plannedCapabilities } from '../lib/plannedCapabilities.ts';
import { Badge } from './Badge.tsx';
import { Card } from './Card.tsx';

export function PlannedCapabilities() {
  return (
    <section aria-labelledby="planned-heading">
      <h2 id="planned-heading" className="text-2xl text-ink">
        Planned
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Funnels, retention, journeys, and engagement are a later release. Event
        collection is available on a project. None of these cards show product
        metrics.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plannedCapabilities.map((item) => (
          <li key={item.title}>
            <Card className="h-full">
              <Badge tone={item.badge === 'Available' ? 'accent' : 'neutral'}>
                {item.badge}
              </Badge>
              <h3 className="mt-3 text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
