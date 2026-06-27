// Pure client SPA: the gok-* design-system web components register and render in
// the browser, so server-side rendering is disabled. adapter-static + fallback
// (vite.config.ts) serves every route, including future dynamic params.
export const ssr = false;
export const prerender = false;
