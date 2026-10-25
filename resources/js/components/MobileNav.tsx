import { useEffect, useId, useRef, useState } from 'react';
import { buttonClass } from '../lib/buttonStyles.ts';
import { Brand } from './Brand.tsx';
import { SidebarNav } from './SidebarNav.tsx';

export function MobileNav({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const navDialog = dialog;

    if (!open) {
      if (navDialog.open) {
        navDialog.close();
      }

      return;
    }

    if (typeof navDialog.showModal === 'function') {
      if (!navDialog.open) {
        navDialog.showModal();
      }
    } else {
      navDialog.setAttribute('open', '');
    }

    navDialog.querySelector<HTMLElement>('[data-close-nav]')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && typeof navDialog.showModal !== 'function') {
        setOpen(false);
      }
    }

    navDialog.addEventListener('keydown', onKeyDown);

    return () => navDialog.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={buttonClass('secondary', 'h-10 lg:hidden')}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Menu
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Primary"
        className="nav-dialog on-sidebar"
        onClose={() => setOpen(false)}
        onMouseDown={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
      >
        {open ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <Brand href="/dashboard" tone="inverse" />
              <button
                type="button"
                data-close-nav
                className={buttonClass('inverse', 'h-10')}
                aria-label="Close menu"
                onClick={() => dialogRef.current?.close()}
              >
                Close
              </button>
            </div>
            <SidebarNav
              path={path}
              onNavigate={() => dialogRef.current?.close()}
              className="flex-1 overflow-y-auto px-3 pb-6"
            />
          </div>
        ) : null}
      </dialog>
    </>
  );
}
