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

export const PRICES = raw as PriceData;

export const ASSET_GROUPS: string[] = [...new Set(PRICES.assets.map((a) => a.group))];

export function findAsset(id: string): Asset | undefined {
  return PRICES.assets.find((a) => a.id === id);
}

/** "2026-09" → "2026년 9월" */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${y}년 ${m}월`;
}
