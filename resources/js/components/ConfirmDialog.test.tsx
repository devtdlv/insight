import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.tsx';

it('asks for confirmation before continuing', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  render(
    <ConfirmDialog
      title="Archive Marketing site?"
      description="The project can be restored."
      confirmLabel="Archive project"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );

  expect(
    screen.getByRole('heading', { name: 'Archive Marketing site?' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Archive project' }));
  expect(onConfirm).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalledOnce();
});
