import { Link } from '@inertiajs/react';
import { Dropdown } from './Dropdown.tsx';

export function AccountMenu({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'I';

  return (
    <Dropdown
      label={`Account menu for ${name}`}
      menu={
        <Link
          href="/logout"
          method="post"
          as="button"
          type="button"
          role="menuitem"
          className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface-muted"
        >
          Log out
        </Link>
      }
    >
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
      >
        {initial}
      </span>
      <span className="max-w-36 truncate">{name}</span>
    </Dropdown>
  );
}
