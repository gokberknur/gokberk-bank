import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// gökberk bank is a pure client SPA (see src/routes/+layout.ts: ssr=false).
			// The gok-* design-system elements are web components that register in the
			// browser, so adapter-static with a fallback serves every route — including
			// future dynamic params — as one shell. Output goes to ./build for Cloudflare Pages.
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html',
				precompress: false,
				strict: false
			})
		})
	],
	resolve: {
		// The gok-* components are Lit elements. When the design system is linked
		// locally (npm link, for dogfooding) two copies of Lit can break custom-element
		// registration ("already defined"). Deduping keeps a single Lit instance.
		dedupe: ['lit']
	}
});
