import { Link } from '@inertiajs/react';
import { paths, roleLabel } from '../lib/paths.ts';
import type { WorkspaceSummary } from '../types/index.ts';
import { Dropdown } from './Dropdown.tsx';

export function WorkspaceSwitcher({
  workspaces,
  path,
  onNavigate,
}: {
  workspaces: WorkspaceSummary[];
  path: string;
  onNavigate?: () => void;
}) {
  if (workspaces.length === 0) {
    return null;
  }

  const currentId = Number(path.match(/^\/workspaces\/(\d+)/)?.[1] ?? 0);
  const current = workspaces.find((workspace) => workspace.id === currentId);

  return (
    <div className="px-3 pb-2">
      <Dropdown
        label="Switch workspace"
        align="left"
        menu={
          <div className="grid">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={paths.workspace(workspace.id)}
                role="menuitem"
                onClick={onNavigate}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-muted"
              >
                <span className="truncate">{workspace.name}</span>
                <span className="text-xs text-muted">
                  {roleLabel(workspace.role)}
                </span>
              </Link>
            ))}
            <Link
              href={paths.workspaces()}
              role="menuitem"
              onClick={onNavigate}
              className="rounded-lg px-3 py-2 text-sm font-medium text-accent hover:bg-surface-muted"
            >
              All workspaces
            </Link>
          </div>
        }
      >
        <span className="max-w-36 truncate">
          {current?.name ?? 'Workspaces'}
        </span>
      </Dropdown>
    </div>
  );
}
