// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // The canonical URL for the site. Used by:
  //  - <link rel="canonical"> in Layout.astro
  //  - Open Graph / Twitter meta tags
  //  - @astrojs/sitemap to build absolute URLs in sitemap.xml
  // If you point a different domain at the site, change this and redeploy.
  site: 'https://pfo.org.uk',

  // Trailing-slash URLs are friendlier for static hosts but we standardise
  // on no-trailing-slash to match the existing PFO URL style. Keep this
  // consistent with how internal <a href> values are written.
  trailingSlash: 'never',

  integrations: [
    sitemap({
      // Drop the CMS admin and the search page from the sitemap — neither
      // is useful to search engines.
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/search'),

      // Sensible defaults; engines treat these as hints, not commands.
      changefreq: 'weekly',
      priority: 0.7,

      // Per-URL overrides — homepage gets top priority.
      serialize(item) {
        if (item.url === 'https://pfo.org.uk/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }
        if (item.url.includes('/events')) {
          item.changefreq = 'daily';
          item.priority = 0.9;
        }
        if (item.url.includes('/news')) {
          item.changefreq = 'weekly';
          item.priority = 0.8;
        }
        return item;
      },
    }),
  ],

  // Keep image optimisation enabled (default in Astro 5+) — runs at build,
  // does nothing at runtime, makes the deployed site faster.
});
