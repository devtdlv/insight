import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { compareMetric } from '../lib/analytics.ts';
import { DeltaBadge } from './DeltaBadge.tsx';

it('shows an increase with an arrow, text, and a full screen reader sentence', () => {
  const { container } = render(
    <DeltaBadge comparison={compareMetric(125, 100)} previous={100} />,
  );

  expect(container.firstChild).toHaveAttribute('data-comparison', 'increase');
  expect(container).toHaveTextContent('↑');
  expect(container).toHaveTextContent('25%');
  expect(
    screen.getByText(
      'Up 25% compared with the previous period (previous period: 100).',
    ),
  ).toHaveClass('sr-only');
});

it('shows a decrease', () => {
  const { container } = render(
    <DeltaBadge comparison={compareMetric(50, 100)} />,
  );

  expect(container.firstChild).toHaveAttribute('data-comparison', 'decrease');
  expect(container).toHaveTextContent('↓');
  expect(
    screen.getByText('Down 50% compared with the previous period.'),
  ).toBeInTheDocument();
});

it('shows no change as a real result', () => {
  const { container } = render(<DeltaBadge comparison={compareMetric(0, 0)} />);

  expect(container.firstChild).toHaveAttribute('data-comparison', 'unchanged');
  expect(container).toHaveTextContent('→');
  expect(
    screen.getByText('No change compared with the previous period.'),
  ).toBeInTheDocument();
});

it('shows an unavailable comparison without an arrow or a percentage', () => {
  const { container } = render(
    <DeltaBadge comparison={compareMetric(null, 2)} />,
  );

  expect(container.firstChild).toHaveAttribute(
    'data-comparison',
    'unavailable',
  );
  expect(container).not.toHaveTextContent('%');
  expect(container).not.toHaveTextContent(/[↑↓→]/);
  expect(container).toHaveTextContent('No comparison');
});

it('describes a change from zero without Infinity or NaN', () => {
  const { container } = render(
    <DeltaBadge comparison={compareMetric(5, 0)} previous={0} />,
  );

  expect(container).toHaveTextContent('No baseline');
  expect(container).not.toHaveTextContent(/Infinity|NaN/);
});

it('uses neutral styling for both directions', () => {
  const { container, rerender } = render(
    <DeltaBadge comparison={compareMetric(2, 1)} />,
  );
  const increase = (container.firstChild as HTMLElement).className;

  rerender(<DeltaBadge comparison={compareMetric(1, 2)} />);

  expect((container.firstChild as HTMLElement).className).toBe(increase);
  expect(increase).not.toMatch(/success|danger|warning/);
});
