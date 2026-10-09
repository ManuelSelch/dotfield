import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
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
