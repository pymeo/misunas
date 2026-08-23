import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { SITE_URL } from './src/config/site';

export default defineConfig({
  site: SITE_URL,
  output: 'server',
  adapter: cloudflare({ imageService: 'compile' }),
  session: false,
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
