import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.tsx';

vi.mock('@inertiajs/react', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

it('lists the signed-in workspaces and a way back to all of them', () => {
  render(
    <WorkspaceSwitcher
      path="/workspaces/2/projects"
      workspaces={[
        { id: 2, name: 'Ada Lab', role: 'owner' },
        { id: 9, name: 'Other Lab', role: 'member' },
      ]}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));

  expect(screen.getByRole('menuitem', { name: /Ada Lab/ })).toHaveAttribute(
    'href',
    '/workspaces/2',
  );
  expect(screen.getByRole('menuitem', { name: /Other Lab/ })).toHaveAttribute(
    'href',
    '/workspaces/9',
  );
  expect(
    screen.getByRole('menuitem', { name: 'All workspaces' }),
  ).toHaveAttribute('href', '/workspaces');
});
