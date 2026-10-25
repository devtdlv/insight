export function TextField({
  id,
  label,
  type = 'text',
  value,
  error,
  hint,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  error?: string;
  hint?: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-base text-ink shadow-[var(--shadow)] ${
          error ? 'border-danger' : 'border-line'
        }`}
      />
      {hint ? (
        <p id={hintId} className="mt-2 text-sm leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
