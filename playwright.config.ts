import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for gökberk bank's E2E regression suite.
 *
 * The app is a pure client SPA (ssr=false): the gok-* design-system elements are Lit
 * web components that register and render only in a real browser, so E2E (real Chromium)
 * is the only valid test layer — there is no SSR/DOM output to snapshot.
 *
 * Auth: the demo app boots already signed in (session.signedIn defaults to true and is
 * never persisted — see src/lib/state/session.svelte.ts), so specs navigate straight to
 * (app) routes with no login step and no storageState. Determinism that DOES matter (the
 * plan tier, which moves FX margins) is seeded per-test in e2e/support/fixtures.ts.
 *
 * Local: runs against the dev server (`npm run dev`, :5173) and reuses an already-running
 * one. CI: set CI=1 to run a production-shaped build+preview on :4173 instead.
 */

const CI = !!process.env.CI;
const PORT = CI ? 4173 : 5173;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: 'e2e',
	// Per-domain specs live under e2e/<domain>/; e2e/support holds fixtures + helpers (not tests).
	testMatch: '**/*.spec.ts',
	fullyParallel: true,
	forbidOnly: CI,
	retries: CI ? 2 : 0,
	workers: CI ? 1 : undefined,
	reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		// First paint is blank until the custom elements register — give actions room.
		actionTimeout: 10_000,
		navigationTimeout: 30_000
	},

	projects: [
		// The domain happy-path / regression specs are written desktop-first (they assume the
		// full rail and desktop layout), so the desktop project runs everything EXCEPT the
		// *.mobile.spec.ts files.
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
			testIgnore: '**/*.mobile.spec.ts'
		},
		// Mobile target is iPhone / Mobile Safari (WebKit) — the real device class the app
		// ships to. It runs only the explicitly mobile-shaped specs (*.mobile.spec.ts), where
		// the bottom tab bar replaces the rail and reachability differs.
		{
			name: 'mobile',
			use: { ...devices['iPhone 13'] },
			testMatch: '**/*.mobile.spec.ts'
		}
	],

	webServer: {
		command: CI ? 'npm run build && npm run preview' : 'npm run dev',
		port: PORT,
		reuseExistingServer: !CI,
		timeout: 120_000
	}
});
