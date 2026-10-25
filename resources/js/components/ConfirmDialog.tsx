import { useEffect, useRef } from 'react';
import { Button } from './Button.tsx';

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    return () => {
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onClose={onClose}
    >
      <h2 id="confirm-title" className="text-xl text-ink">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? 'Working...' : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
