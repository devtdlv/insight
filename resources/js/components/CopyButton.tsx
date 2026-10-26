import { useState } from 'react';
import { Button } from './Button.tsx';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  const buttonLabel =
    state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label;

  return (
    <Button type="button" variant="secondary" onClick={() => void copy()}>
      {buttonLabel}
    </Button>
  );
}
