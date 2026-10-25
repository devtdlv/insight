import type { ButtonHTMLAttributes } from 'react';
import { buttonClass, type ButtonVariant } from '../lib/buttonStyles.ts';

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant, className)}
      {...props}
    />
  );
}
