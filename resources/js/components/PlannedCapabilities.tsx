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
        These parts of Insight are a later release. They are listed so the
        dashboard has a clear destination. None of them are active.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plannedCapabilities.map((item) => (
          <li key={item.title}>
            <Card className="h-full">
              <Badge>Planned</Badge>
              <h3 className="mt-3 text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
