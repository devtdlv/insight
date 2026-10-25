import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Dropdown } from './Dropdown.tsx';

it('opens the menu and closes it from the keyboard', () => {
  render(
    <Dropdown
      label="Account menu for Ada Lovelace"
      menu={
        <button type="button" role="menuitem">
          Log out
        </button>
      }
    >
      Ada Lovelace
    </Dropdown>,
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Account menu for Ada Lovelace' }),
  );
  expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Account menu for Ada Lovelace' }),
  ).toHaveFocus();
});
