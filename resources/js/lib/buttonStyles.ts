export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-foreground hover:bg-accent-strong',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink hover:bg-surface-muted',
  inverse: 'bg-transparent text-sidebar-ink hover:bg-sidebar-active',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  extra = '',
): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export const textLinkClass =
  'font-semibold text-accent underline-offset-4 hover:underline';
