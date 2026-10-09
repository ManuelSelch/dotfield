import { FieldCanvas } from './board/FieldCanvas';
import { AppHeader } from './ui/AppHeader';
import { FieldHeading } from './ui/FieldHeading';
import { AppFooter } from './ui/AppFooter';

export function App() {
  return (
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="field-title">
        <FieldHeading />
        <FieldCanvas />
      </section>
      <AppFooter />
    </main>
  );
}
