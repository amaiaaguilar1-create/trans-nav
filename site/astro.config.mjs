// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages for now (https://amaiaaguilar1-create.github.io/trans-nav/). When a custom domain is added,
  // set SITE_URL to the domain and BASE_PATH to '/'.
  site: process.env.SITE_URL ?? 'https://amaiaaguilar1-create.github.io',
  base: process.env.BASE_PATH ?? '/trans-nav',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  // Content lives outside site/ so the whole repo (schemas, pipeline, workers) shares one source of truth.
  vite: { server: { fs: { allow: ['..'] } } },
});
