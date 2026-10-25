import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function Dropdown({
  label,
  children,
  menu,
}: {
  label: string;
  children: ReactNode;
  menu: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      setOpen(false);
      triggerRef.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;

        if (next && !event.currentTarget.contains(next)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-10 max-w-full items-center gap-2 rounded-lg py-1 pr-2 pl-1 text-sm font-medium text-ink hover:bg-surface-muted motion-safe:transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        {children}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-30 mt-2 min-w-44 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow)]"
        >
          {menu}
        </div>
      ) : null}
    </div>
  );
}
