import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLayout } from './layouts/AppLayout.tsx';

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
  layout: (name) =>
    name === 'Welcome' || name.startsWith('Auth/') ? null : AppLayout,
  progress: {
    color: '#145c3e',
  },
});
