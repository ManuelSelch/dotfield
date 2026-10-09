import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createCrossingBattle } from '../helpers/crossingBattle';
import { createClock } from '../../src/game/clock';
import { advanceRound } from '../../src/game/round';
import { drawBoard } from '../../src/board/drawBoard';
import { TerritoryDetails } from '../../src/board/TerritoryDetails';
import { TransferDetails } from '../../src/board/TransferDetails';
import '../../src/styles.css';

// Actual simulation/renderer with deterministic orders; no production debug API.
function CrossingBattle() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState(createCrossingBattle);
  useEffect(() => {
    let state = createCrossingBattle();
    let frame = 0;
    const clock = createClock();
    const redraw = () => {
      const element = canvas.current!;
      const bounds = element.getBoundingClientRect();
      drawBoard(element, state, bounds.width, bounds.height, window.devicePixelRatio);
    };
    const tick = (time: number) => {
      state = advanceRound(state, clock.advance(time));
      redraw();
      setSnapshot(state);
      if (state.roundStatus === 'playing') frame = requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas.current!);
    redraw();
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return (
    <main className="app-safe-area flex h-full min-h-0 flex-col">
      <p data-testid="elapsed">{snapshot.elapsedMs}</p>
      <div className="relative min-h-0 flex-1">
        <canvas ref={canvas} className="block h-full w-full rounded-[20px] bg-field" role="img" aria-label="Territory board" />
      </div>
      <TerritoryDetails territories={snapshot.territories} />
      <TransferDetails state={snapshot} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<CrossingBattle />);
