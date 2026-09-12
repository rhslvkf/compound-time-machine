import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Segmented } from './components/Segmented';
import { clampInputs } from './lib/compound';
import { closeApp, haptic, readSafeArea, subscribeBack, subscribeSafeArea } from './lib/sdk';
import { loadState, saveState, type AppState, type Mode } from './lib/storage';
import { Main } from './screens/Main';
import { Past } from './screens/Past';

const MODES: { value: Mode; label: string }[] = [
  { value: 'future', label: '미래로' },
  { value: 'past', label: '과거로' },
];

function applySafeArea() {
  const insets = readSafeArea();
  const root = document.documentElement;
  root.style.setProperty('--safe-top', `${insets.top}px`);
  root.style.setProperty('--safe-bottom', `${insets.bottom}px`);
}

function App() {
  const [state, setState] = useState<AppState | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    applySafeArea();
    const unsubSafe = subscribeSafeArea(() => applySafeArea());
    loadState().then((v) => {
      if (alive) setState(v);
    });
    return () => {
      alive = false;
      unsubSafe();
    };
  }, []);

  // 단일 화면이라 시스템 백버튼은 곧 미니앱 종료다
  useEffect(() => subscribeBack(() => void closeApp()), []);

  const update = useCallback((patch: Partial<AppState>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: AppState = { ...prev, ...patch };
      if (patch.future) next.future = clampInputs(patch.future);
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void saveState(next), 400);
      return next;
    });
  }, []);

  if (state === null) {
    return (
      <div className="screen canvas" aria-busy="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-hero" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="mode-bar">
        <Segmented
          label="시간 방향"
          options={MODES}
          value={state.mode}
          onChange={(mode) => {
            void haptic('tickWeak');
            update({ mode });
            window.scrollTo(0, 0);
          }}
        />
      </div>
      {state.mode === 'past' ? (
        <Past inputs={state.past} onChange={(past) => update({ past })} />
      ) : (
        <Main inputs={state.future} onChange={(future) => update({ future })} />
      )}
    </div>
  );
}

export default App;
