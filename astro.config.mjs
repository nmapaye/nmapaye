import { defineConfig } from 'astro/config';

// Deployed to GitHub Pages as a project site: https://nmapaye.github.io/nmapaye
// If you later move to a custom domain (e.g. nmapaye.com), set `site` to it and
// remove `base` (or set it to '/').
export default defineConfig({
  site: 'https://nmapaye.github.io',
  base: '/nmapaye',
  output: 'static',
  trailingSlash: 'ignore',
});
