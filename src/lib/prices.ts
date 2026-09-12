import { Storage } from '@apps-in-toss/web-framework';
import raw from '../data/prices.json';

export interface Asset {
  id: string;
  name: string;
  group: string;
  note: string | null;
  symbol: string;
  /** 첫 데이터 달 (YYYY-MM) */
  from: string;
  /** [YYYY-MM, 원화 가격] 월 종가, 오름차순 */
  series: [string, number][];
}

export interface PriceData {
  asOf: string;
  source: string;
  assets: Asset[];
}

/** 번들에 포함된 사본 — 네트워크가 안 될 때의 최후 폴백 */
export const BUNDLED_PRICES = raw as PriceData;

/**
 * 최신 데이터 위치. GitHub Actions가 매월 main 브랜치의 파일을 갱신하고, jsDelivr가 CDN으로 서빙한다
 * (CORS 허용, 브랜치 참조는 12시간 캐시 — 워크플로가 갱신 뒤 purge를 호출한다).
 */
export const REMOTE_PRICES_URL = 'https://cdn.jsdelivr.net/gh/rhslvkf/compound-time-machine@main/src/data/prices.json';

const CACHE_KEY = 'compound-time-machine:prices:v1';
const FETCH_TIMEOUT_MS = 6000;

function isPriceData(v: unknown): v is PriceData {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.asOf !== 'string' || !Array.isArray(o.assets) || o.assets.length === 0) return false;
  return o.assets.every((a) => {
    if (!a || typeof a !== 'object') return false;
    const x = a as Record<string, unknown>;
    return typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.series) && x.series.length > 1;
  });
}

async function readCache(): Promise<PriceData | null> {
  try {
    const rawText = (await Storage.getItem(CACHE_KEY)) ?? window.localStorage.getItem(CACHE_KEY);
    if (!rawText) return null;
    const parsed: unknown = JSON.parse(rawText);
    return isPriceData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(data: PriceData): Promise<void> {
  const text = JSON.stringify(data);
  try {
    await Storage.setItem(CACHE_KEY, text);
  } catch {
    try {
      window.localStorage.setItem(CACHE_KEY, text);
    } catch {
      /* 저장 불가 환경 */
    }
  }
}

async function fetchRemote(): Promise<PriceData | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(REMOTE_PRICES_URL, { signal: controller.signal, cache: 'no-cache' });
    if (!res.ok) return null;
    const parsed: unknown = await res.json();
    return isPriceData(parsed) ? parsed : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** 로컬 캐시·번들 중 더 새 것을 먼저 돌려주는 즉시 값 */
export async function loadInitialPrices(): Promise<PriceData> {
  const cached = await readCache();
  return cached && cached.asOf > BUNDLED_PRICES.asOf ? cached : BUNDLED_PRICES;
}

/** 원격에서 더 새 데이터를 받으면 캐시에 저장하고 돌려준다. 아니면 null. */
export async function refreshPrices(current: PriceData): Promise<PriceData | null> {
  const remote = await fetchRemote();
  if (!remote || remote.asOf <= current.asOf) return null;
  await writeCache(remote);
  return remote;
}

export function assetGroups(data: PriceData): string[] {
  return [...new Set(data.assets.map((a) => a.group))];
}

export function findAsset(data: PriceData, id: string): Asset | undefined {
  return data.assets.find((a) => a.id === id);
}

/** "2026-09" → "2026년 9월" */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${y}년 ${m}월`;
}
