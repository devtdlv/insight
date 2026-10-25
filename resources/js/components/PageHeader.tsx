export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="max-w-3xl">
      {eyebrow ? (
        <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 text-3xl text-ink sm:text-4xl">{title}</h1>
      {description ? (
        <p className="mt-3 text-base leading-7 text-muted">{description}</p>
      ) : null}
    </header>
  );
}
