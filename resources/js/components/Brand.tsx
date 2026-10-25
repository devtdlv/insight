import { Link } from '@inertiajs/react';

export function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4 fill-none" focusable="false">
        <circle cx="12" cy="12" r="2.4" className="fill-current" />
        <path
          d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7"
          className="stroke-current"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Brand({
  href,
  tone = 'default',
  className = '',
}: {
  href: string;
  tone?: 'default' | 'inverse';
  className?: string;
}) {
  const title = tone === 'inverse' ? 'text-sidebar-ink' : 'text-ink';
  const subtitle = tone === 'inverse' ? 'text-sidebar-muted' : 'text-muted';

  return (
    <Link
      href={href}
      aria-label="Insight"
      className={`flex items-center gap-2.5 rounded-lg ${className}`}
    >
      <BrandMark />
      <span aria-hidden="true" className="min-w-0">
        <span
          className={`block font-serif text-lg leading-none font-semibold ${title}`}
        >
          Insight
        </span>
        <span className={`mt-1 block text-xs ${subtitle}`}>
          Product analytics
        </span>
      </span>
    </Link>
  );
}
