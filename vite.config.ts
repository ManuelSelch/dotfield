import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dotfield',
        short_name: 'Dotfield',
        description: 'A small, tactical territory game.',
        start_url: '/',
        display: 'standalone',
        theme_color: '#f6f7f3',
        background_color: '#f6f7f3',
        orientation: 'portrait',
        icons: [
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: {
    rolldownOptions: {
      onLog(level, log, defaultHandler) {
        // This is a client-only SPA; Mantine's RSC boundary markers are redundant.
        if (log.code === 'MODULE_LEVEL_DIRECTIVE' && log.message.includes('"use client"')) return;
        defaultHandler(level, log);
      },
    },
  },
});
