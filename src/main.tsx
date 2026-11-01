import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import { App } from './app';
import { createAppUpdates } from './pwa/app-updates';
import { theme } from './ui/theme';
import './styles.css';

const updates = createAppUpdates({
  events: window,
  isOnline: () => navigator.onLine,
  reload: () => window.location.reload(),
});
updates.start(import.meta.env.PROD ? registerSW : undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light">
      <App updates={updates} />
    </MantineProvider>
  </StrictMode>,
);
