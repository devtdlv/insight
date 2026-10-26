import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const root = process.cwd();

function phpFiles(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        return phpFiles(path);
      }

      return entry.name.endsWith('.php') ? [path] : [];
    },
  );
}

it('keeps the Inertia resolver glob at the exact on-disk directory name', () => {
  const dirs = readdirSync(join(root, 'resources/js'));
  const app = readFileSync(join(root, 'resources/js/app.tsx'), 'utf8');

  expect(dirs).toContain('pages');
  expect(dirs).not.toContain('Pages');
  expect(app).toContain("'./pages/**/*.tsx'");
  expect(app).toContain('`./pages/${name}.tsx`');
});

it('has a page file, with exact casing, for every rendered Inertia component', () => {
  const sources = [...phpFiles('app/Http'), 'routes/web.php'];
  const names = new Set<string>();

  for (const file of sources) {
    const code = readFileSync(join(root, file), 'utf8');

    for (const match of code.matchAll(
      /(?:Inertia::render|inertia)\(\s*'([A-Za-z]+(?:\/[A-Za-z]+)+)'/g,
    )) {
      names.add(match[1]);
    }
  }

  expect(names.size).toBeGreaterThan(5);

  for (const name of names) {
    const segments = name.split('/');
    let dir = join(root, 'resources/js/pages');

    for (const segment of segments.slice(0, -1)) {
      expect(readdirSync(dir)).toContain(segment);
      dir = join(dir, segment);
    }

    const file = `${segments.at(-1)}.tsx`;

    expect(readdirSync(dir), `${name} page file`).toContain(file);
    expect(existsSync(join(dir, file))).toBe(true);
  }
});
