import { plannedCapabilities } from '../lib/plannedCapabilities.ts';

export function PlannedCapabilities() {
  return (
    <section aria-labelledby="planned-heading">
      <h2
        id="planned-heading"
        className="text-sm font-semibold tracking-wide text-slate-700 uppercase"
      >
        Planned
      </h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plannedCapabilities.map((item) => (
          <li
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase">
              Planned
            </p>
            <h3 className="mt-3 text-lg font-semibold text-slate-950">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
