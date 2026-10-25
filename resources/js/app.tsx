import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

const appName = 'Insight';

const pages = import.meta.glob<{ default: ComponentType }>([
  './pages/**/*.tsx',
  '!./pages/**/*.test.tsx',
]);

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: async (name) => {
    const load = pages[`./pages/${name}.tsx`];

    if (!load) {
      throw new Error(`Unknown page: ${name}`);
    }

    const page = await load();

    return page.default;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  progress: {
    color: '#145c3e',
  },
});
