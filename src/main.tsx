import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { App } from './App';
import { theme } from './ui/theme';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { createAppUpdates } from './pwa/appUpdates';

const updates = createAppUpdates({
  events: window,
  isOnline: () => navigator.onLine,
  reload: () => window.location.reload(),
});
updates.start(import.meta.env.PROD ? registerSW : undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light"><App updates={updates} /></MantineProvider>
  </StrictMode>,
);
