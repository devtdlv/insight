import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { plannedCapabilities } from '../lib/plannedCapabilities.ts';
import { PlannedCapabilities } from './PlannedCapabilities.tsx';

it('lists the planned analytics capabilities without metrics', () => {
  render(<PlannedCapabilities />);

  expect(plannedCapabilities).toHaveLength(6);

  for (const item of plannedCapabilities) {
    expect(
      screen.getByRole('heading', { level: 3, name: item.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(item.detail)).toBeInTheDocument();
  }

  expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
});
