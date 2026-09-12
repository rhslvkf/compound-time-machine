import type { Point } from './compound';
import { findAsset, type Asset, type PriceData } from './prices';

export interface PastInputs {
  assetId: string;
  /** 시작 시점에 한 번 넣는 돈(원) */
  initial: number;
  /** 매월 투자금(원) */
  monthly: number;
  /** 몇 년 전부터 */
  years: number;
  /** 비교할 자산 id (최대 4개) */
  compareIds: string[];
}

export const MAX_COMPARE = 4;

export interface PastResult {
  asset: Asset;
  /** 실제로 계산에 쓴 개월 수 (데이터가 짧으면 줄어든다) */
  months: number;
  startKey: string;
  endKey: string;
  principal: number;
  total: number;
  gain: number;
  /** 총 수익률 (0.5 = +50%) */
  returnRate: number;
  /** 연환산 수익률 */
  cagr: number;
  /** 연 단위 시계열 — 그래프용 */
  points: Point[];
}

export const MAX_PAST_YEARS = 15;

/** 시작 시점 목돈 + 매월 정액 매수(그 달 종가 기준)를 마지막 달 종가로 평가한다. */
export function backtest(data: PriceData, inputs: PastInputs): PastResult | null {
  const asset = findAsset(data, inputs.assetId);
  if (!asset) return null;
  const series = asset.series;
  if (series.length < 2) return null;

  const wantMonths = Math.max(1, Math.round(inputs.years * 12));
  // 마지막 달은 평가 시점이고 매수는 그 앞 달들에서 일어난다
  const months = Math.min(wantMonths, series.length - 1);
  const startIdx = series.length - 1 - months;
  const lastPrice = series[series.length - 1][1];

  let units = 0;
  let principal = 0;
  const points: Point[] = [];
  for (let i = startIdx; i < series.length; i++) {
    const [, price] = series[i];
    const offset = i - startIdx;
    if (offset === 0) {
      units += inputs.initial / price;
      principal += inputs.initial;
    }
    if (offset < months) {
      units += inputs.monthly / price;
      principal += inputs.monthly;
    }
    if (offset % 12 === 0 || offset === months) {
      points.push({ year: offset / 12, principal, total: units * price });
    }
  }
  const total = units * lastPrice;
  const gain = total - principal;
  const yearsUsed = months / 12;
  return {
    asset,
    months,
    startKey: series[startIdx][0],
    endKey: series[series.length - 1][0],
    principal,
    total,
    gain,
    returnRate: principal > 0 ? gain / principal : 0,
    cagr: principal > 0 && yearsUsed > 0 ? Math.pow(total / principal, 1 / yearsUsed) - 1 : 0,
    points,
  };
}

/** 같은 조건을 주어진 자산들에 적용한다(입력 순서 유지). */
export function backtestMany(data: PriceData, inputs: Omit<PastInputs, 'assetId'>, ids: string[]): PastResult[] {
  return ids.map((id) => backtest(data, { ...inputs, assetId: id })).filter((r): r is PastResult => r !== null);
}

/** 이 자산으로 고를 수 있는 최대 기간(년) */
export function maxYearsFor(data: PriceData, assetId: string): number {
  const asset = findAsset(data, assetId);
  if (!asset) return MAX_PAST_YEARS;
  return Math.max(1, Math.min(MAX_PAST_YEARS, Math.floor((asset.series.length - 1) / 12)));
}
