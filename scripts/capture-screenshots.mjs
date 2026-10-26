/**
 * Captures the README screenshots from a locally running Insight app.
 *
 *   npm run screenshots
 *
 * You sign in by hand in a visible Chromium window. Nothing about the session
 * is saved: the browser context lives in memory only, no cookies, tokens, or
 * storage-state files are written, and credentials are never read or logged.
 *
 * Optional environment variables (none are secrets):
 *   INSIGHT_URL           default http://127.0.0.1:8000
 *   INSIGHT_WORKSPACE_ID  default 3
 *   INSIGHT_PROJECT_ID    default 3
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE_URL = (process.env.INSIGHT_URL ?? 'http://127.0.0.1:8000').replace(
    /\/$/,
    '',
);
const WORKSPACE_ID = process.env.INSIGHT_WORKSPACE_ID ?? '3';
const PROJECT_ID = process.env.INSIGHT_PROJECT_ID ?? '3';

const VIEWPORT = { width: 1440, height: 900 };
const OUTPUT_DIR = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'docs',
    'screenshots',
);

const ROUTES = {
    login: '/login',
    dashboard: '/dashboard',
    workspaces: '/workspaces',
    project: `/workspaces/${WORKSPACE_ID}/projects/${PROJECT_ID}`,
    events: `/workspaces/${WORKSPACE_ID}/projects/${PROJECT_ID}/events`,
    tracking: `/workspaces/${WORKSPACE_ID}/projects/${PROJECT_ID}/tracking`,
};

const WRITE_KEY = /iw_[A-Za-z0-9]{8,}/;
const UNFINISHED = /coming soon|coming later|not available yet|\bplanned\b/i;
const PLACEHOLDER_NAMES = /\b(demo|test)\b/i;

/**
 * Optional: capture only some images, for example
 *   npm run screenshots -- --only=workspaces
 * Files that are not listed are neither opened nor overwritten.
 */
const ONLY = (() => {
    const flag = process.argv.find((arg) => arg.startsWith('--only='));

    if (!flag) {
        return null;
    }

    return new Set(
        flag
            .slice('--only='.length)
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => (name.endsWith('.png') ? name : `${name}.png`)),
    );
})();

const results = [];

function log(message) {
    console.log(message);
}

async function settle(page) {
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
}

async function visibleText(page) {
    return page.evaluate(() => document.body.innerText);
}

async function assertSafe(page, { allowPasswordField = false } = {}) {
    const text = await visibleText(page);

    if (WRITE_KEY.test(text)) {
        throw new Error('A write key is still visible on the page.');
    }

    const html = await page.evaluate(() => document.body.innerHTML);

    if (WRITE_KEY.test(html)) {
        throw new Error('A write key is still present in the page markup.');
    }

    if (!allowPasswordField) {
        return;
    }

    const filled = await page.evaluate(() =>
        Array.from(
            document.querySelectorAll(
                'input[type="password"], input[type="email"]',
            ),
        ).some((input) => input.value !== ''),
    );

    if (filled) {
        throw new Error('A sign-in field is pre-filled.');
    }
}

async function assertNoPlaceholderNames(page) {
    const text = await visibleText(page);
    const match = text.match(PLACEHOLDER_NAMES);

    if (match) {
        throw new Error(`The page shows the word "${match[0]}".`);
    }
}

async function assertNoErrorState(page) {
    const text = await visibleText(page);

    if (/Server Error|Page Expired|Whoops|Not Found/i.test(text)) {
        throw new Error('The page looks like an error screen.');
    }

    if (/Updating analytics|Refreshing\.\.\./.test(text)) {
        throw new Error('A loading message is still visible.');
    }
}

/**
 * Replaces every write key in the rendered page with an opaque placeholder
 * of the same shape, before anything is written to disk. A mutation observer
 * keeps it masked if the page re-renders.
 */
async function maskWriteKeys(page) {
    await page.evaluate((source) => {
        const global = new RegExp(source, 'g');
        const mask = (value) =>
            value.replace(
                global,
                (key) => `iw_${'\u2022'.repeat(key.length - 3)}`,
            );

        function maskTree(root) {
            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
            );
            const nodes = [];

            while (walker.nextNode()) {
                nodes.push(walker.currentNode);
            }

            for (const node of nodes) {
                const value = node.nodeValue ?? '';
                const masked = mask(value);

                if (masked !== value) {
                    node.nodeValue = masked;
                }
            }
        }

        maskTree(document.body);

        new MutationObserver(() => maskTree(document.body)).observe(
            document.body,
            {
                childList: true,
                subtree: true,
                characterData: true,
            },
        );
    }, WRITE_KEY.source);
}

async function shoot(page, name, { maxHeight = 2400 } = {}) {
    const path = join(OUTPUT_DIR, name);
    const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
    );

    if (height > maxHeight) {
        await page.screenshot({
            path,
            fullPage: true,
            clip: { x: 0, y: 0, width: VIEWPORT.width, height: maxHeight },
        });
    } else {
        await page.screenshot({ path, fullPage: true });
    }

    return path;
}

function wanted(name) {
    return ONLY === null || ONLY.has(name);
}

async function capture(name, work) {
    if (!wanted(name)) {
        return;
    }

    try {
        const path = await work();

        results.push({ name, ok: true, path });
        log(`  captured ${name}`);
    } catch (error) {
        results.push({ name, ok: false, error: error.message });
        log(`  FAILED   ${name}: ${error.message}`);
    }
}

async function setTheme(page, theme) {
    const label = theme === 'dark' ? 'Dark' : 'Light';

    await page.getByRole('radio', { name: label }).first().click();
    await page.waitForFunction(
        (expected) => document.documentElement.dataset.theme === expected,
        theme,
    );
    await page.waitForTimeout(300);
}

async function go(page, route) {
    const response = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
    });

    if (!response || !response.ok()) {
        throw new Error(
            `${route} responded with ${response ? response.status() : 'no response'}.`,
        );
    }

    await settle(page);
}

async function waitForSignIn(page) {
    log('');
    log('Sign in to Insight in the browser window that just opened.');
    log('Type your email and password there. They are never read or saved by');
    log('this script. The script continues by itself once you reach the app,');
    log('and waits for as long as you need.');
    log('');

    await page.waitForURL(
        (url) =>
            url.origin === BASE_URL &&
            url.pathname !== ROUTES.login &&
            !url.pathname.startsWith('/login'),
        { timeout: 0 },
    );
    await settle(page);
    log('Signed in. Capturing screenshots (the window will move on its own).');
}

async function main() {
    await mkdir(OUTPUT_DIR, { recursive: true });

    let browser;

    try {
        browser = await chromium.launch({ headless: false });
    } catch (error) {
        console.error(
            `Could not launch Chromium: ${error.message}\nRun "npx playwright install chromium" and try again.`,
        );
        process.exitCode = 1;

        return;
    }

    try {
        // 1. Authentication page: a fresh, unauthenticated, in-memory context.
        log('Capturing the sign-in page from a clean browser context...');
        const guestContext = await browser.newContext({
            viewport: VIEWPORT,
            deviceScaleFactor: 1,
            colorScheme: 'light',
        });
        const guest = await guestContext.newPage();

        await capture('authentication.png', async () => {
            await go(guest, ROUTES.login);
            await guest
                .getByRole('heading', { name: 'Log in', level: 1 })
                .waitFor();
            await setTheme(guest, 'light');
            await assertNoErrorState(guest);
            await assertSafe(guest, { allowPasswordField: true });
            await assertNoPlaceholderNames(guest);

            return shoot(guest, 'authentication.png');
        });
        await guestContext.close();

        // 2. Manual sign-in, in memory only.
        const context = await browser.newContext({
            viewport: VIEWPORT,
            deviceScaleFactor: 1,
            colorScheme: 'light',
        });
        const page = await context.newPage();

        await go(page, ROUTES.login);
        await waitForSignIn(page);

        // 3. Dashboards, light then dark, from the same page load and range.
        const needsDashboard =
            wanted('dashboard-light.png') || wanted('dashboard-dark.png');

        if (needsDashboard) {
            await go(page, ROUTES.project);
            await setTheme(page, 'light');
        }

        let dashboardReady = true;

        try {
            if (!needsDashboard) {
                throw new Error('skipped');
            }

            await page.getByText('Last 90 days', { exact: true }).click();
            await page.waitForFunction(() => {
                const results = document.querySelector(
                    '[data-testid="analytics-results"]',
                );
                const status = document.querySelector(
                    '[data-testid="analytics-status"]',
                );

                return (
                    results?.getAttribute('aria-busy') === 'false' &&
                    (status?.textContent ?? '').trim() === '' &&
                    document.body.innerText.includes('Last 90 days (')
                );
            });
            await page.locator('svg[role="img"]').first().waitFor();
            await page.getByText('API connected').waitFor();
            await settle(page);
        } catch (error) {
            dashboardReady = false;

            if (needsDashboard) {
                log(`  FAILED   dashboard setup: ${error.message}`);
            }
        }

        const verifyDashboard = async () => {
            if (!dashboardReady) {
                throw new Error(
                    'The 90 day analytics view did not finish loading.',
                );
            }

            const text = await visibleText(page);

            for (const expected of [
                'Northstar Analytics',
                'Atlas',
                'Ada Lovelace',
                'Last 90 days',
                'Total events',
                'Top events',
            ]) {
                if (!text.includes(expected)) {
                    throw new Error(`Expected to see "${expected}".`);
                }
            }

            if (UNFINISHED.test(text)) {
                throw new Error('Unfinished-feature text is visible.');
            }

            const topEvents = await page
                .locator('section[aria-labelledby] ol li')
                .count();

            if (topEvents === 0) {
                throw new Error('Top events shows no events.');
            }

            await assertNoErrorState(page);
            await assertSafe(page);
            await assertNoPlaceholderNames(page);
        };

        await capture('dashboard-light.png', async () => {
            await setTheme(page, 'light');
            await verifyDashboard();

            return shoot(page, 'dashboard-light.png');
        });

        await capture('dashboard-dark.png', async () => {
            await setTheme(page, 'dark');
            await verifyDashboard();

            return shoot(page, 'dashboard-dark.png');
        });

        if (needsDashboard) {
            await setTheme(page, 'light');
        }

        // 4. Events.
        await capture('events.png', async () => {
            await go(page, ROUTES.events);
            await page
                .getByRole('heading', { name: 'Recent events', level: 1 })
                .waitFor();
            await page.locator('ul li time').first().waitFor();
            await assertNoErrorState(page);
            await assertSafe(page);
            await assertNoPlaceholderNames(page);

            return shoot(page, 'events.png', { maxHeight: 1800 });
        });

        // 5. Workspaces.
        await capture('workspaces.png', async () => {
            await go(page, ROUTES.workspaces);

            const text = await visibleText(page);

            if (!text.includes('Northstar Analytics')) {
                throw new Error('Northstar Analytics is not listed.');
            }

            await assertNoErrorState(page);
            await assertSafe(page);
            await assertNoPlaceholderNames(page);

            return shoot(page, 'workspaces.png');
        });

        // 6. Tracking setup: the key is masked before the image exists.
        await capture('tracking-setup.png', async () => {
            await go(page, ROUTES.tracking);
            await page
                .getByRole('heading', { name: 'Tracking setup', level: 1 })
                .waitFor();
            await maskWriteKeys(page);
            await page.waitForTimeout(200);
            await assertNoErrorState(page);
            await assertSafe(page);
            await assertNoPlaceholderNames(page);

            return shoot(page, 'tracking-setup.png');
        });

        await context.close();
    } catch (error) {
        results.push({ name: 'run', ok: false, error: error.message });
        console.error(`Stopped: ${error.message}`);
    } finally {
        await browser.close();
    }

    const failed = results.filter((result) => !result.ok);
    const saved = results.filter((result) => result.ok);

    log('');
    log(
        `Saved ${saved.length} screenshot(s) to ${relative(process.cwd(), OUTPUT_DIR)}:`,
    );

    for (const result of saved) {
        log(`  ${result.name}`);
    }

    if (failed.length > 0) {
        log('');
        log('Not captured (no substitute images were created):');

        for (const result of failed) {
            log(`  ${result.name}: ${result.error}`);
        }

        process.exitCode = 1;
    }
}

await main();
