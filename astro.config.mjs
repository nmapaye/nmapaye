import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nmapaye.com',
  integrations: [sitemap()],
  output: 'static',
  trailingSlash: 'ignore',
});
