import { Storage } from '@apps-in-toss/web-framework';
import type { PastInputs } from './backtest';
import { clampInputs, type Inputs } from './compound';

const KEY = 'compound-time-machine:state:v2';

export type Mode = 'future' | 'past';

export interface AppState {
  mode: Mode;
  future: Inputs;
  past: PastInputs;
}

export const DEFAULT_STATE: AppState = {
  mode: 'future',
  future: { initial: 10_000_000, monthly: 500_000, rate: 7, years: 20, goal: 100_000_000 },
  past: { assetId: 'sp500', initial: 0, monthly: 300_000, years: 10, compareIds: ['gold', 'bitcoin'] },
};

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function normalize(v: unknown): AppState {
  if (!v || typeof v !== 'object') return DEFAULT_STATE;
  const o = v as Record<string, unknown>;
  const f = (o.future ?? {}) as Record<string, unknown>;
  const p = (o.past ?? {}) as Record<string, unknown>;
  const d = DEFAULT_STATE;
  return {
    mode: o.mode === 'past' ? 'past' : 'future',
    future: clampInputs({
      initial: num(f.initial, d.future.initial),
      monthly: num(f.monthly, d.future.monthly),
      rate: num(f.rate, d.future.rate),
      years: num(f.years, d.future.years),
      goal: num(f.goal, d.future.goal),
    }),
    past: {
      assetId: typeof p.assetId === 'string' ? p.assetId : d.past.assetId,
      initial: Math.max(0, num(p.initial, d.past.initial)),
      monthly: Math.max(0, num(p.monthly, d.past.monthly)),
      years: Math.max(1, Math.min(15, Math.round(num(p.years, d.past.years)))),
      compareIds: Array.isArray(p.compareIds) ? p.compareIds.filter((x): x is string => typeof x === 'string').slice(0, 4) : d.past.compareIds,
    },
  };
}

async function readRaw(): Promise<string | null> {
  try {
    return await Storage.getItem(KEY);
  } catch {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
}

async function writeRaw(value: string): Promise<void> {
  try {
    await Storage.setItem(KEY, value);
  } catch {
    try {
      window.localStorage.setItem(KEY, value);
    } catch {
      /* 저장 불가 환경 — 세션 동안만 유지 */
    }
  }
}

export async function loadState(): Promise<AppState> {
  const raw = await readRaw();
  if (!raw) return DEFAULT_STATE;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveState(s: AppState): Promise<void> {
  await writeRaw(JSON.stringify(s));
}
