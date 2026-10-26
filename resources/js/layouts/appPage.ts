import type { ReactNode } from 'react';

/**
 * Inertia replaces the page component on each visit. The shared application
 * shell has to live in the persistent layout, with only the document title
 * supplied from the page. Returning a props object here keeps that shell
 * mounted. Returning an element would build a new shell for the visit.
 */
export function appPage<P>(
  page: (props: P) => ReactNode,
  title: string | ((props: P) => string),
): void {
  const layout =
    typeof title === 'string'
      ? { title }
      : (props: P) => ({
          title: title(props),
        });

  Object.assign(page, { layout });
}
