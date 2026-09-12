/** 복리 계산 — 월 단위 복리, 월 투자금은 매월 말 납입으로 가정한다. 세금·물가는 반영하지 않는다. */

export interface Inputs {
  /** 현재 자산(원) */
  initial: number;
  /** 매월 투자금(원) */
  monthly: number;
  /** 연 수익률(%) */
  rate: number;
  /** 기간(년) */
  years: number;
  /** 목표 금액(원) */
  goal: number;
}

export interface Point {
  year: number;
  /** 내가 넣은 돈(원금 + 누적 납입) */
  principal: number;
  /** 총 자산 */
  total: number;
}

export const MAX_YEARS = 40;
export const MAX_SEARCH_MONTHS = 100 * 12;

export function monthlyRate(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

/** 특정 개월 시점의 총 자산 */
export function valueAt(initial: number, monthly: number, annualPercent: number, months: number): number {
  const rm = monthlyRate(annualPercent);
  if (months <= 0) return initial;
  const growth = Math.pow(1 + rm, months);
  if (rm === 0) return initial + monthly * months;
  return initial * growth + monthly * ((growth - 1) / rm);
}

/** 연 단위 시계열 (0년 포함) */
export function project(inputs: Inputs): Point[] {
  const points: Point[] = [];
  for (let y = 0; y <= inputs.years; y++) {
    const months = y * 12;
    points.push({
      year: y,
      principal: inputs.initial + inputs.monthly * months,
      total: valueAt(inputs.initial, inputs.monthly, inputs.rate, months),
    });
  }
  return points;
}

export interface Summary {
  total: number;
  principal: number;
  interest: number;
  /** 복리 수익이 총 자산에서 차지하는 비율 0~1 */
  interestShare: number;
}

export function summarize(inputs: Inputs): Summary {
  const months = inputs.years * 12;
  const total = valueAt(inputs.initial, inputs.monthly, inputs.rate, months);
  const principal = inputs.initial + inputs.monthly * months;
  const interest = Math.max(0, total - principal);
  return { total, principal, interest, interestShare: total > 0 ? interest / total : 0 };
}

/** 목표 금액에 처음 도달하는 개월 수. 100년 안에 도달하지 못하면 null. */
export function monthsToGoal(inputs: Inputs): number | null {
  if (inputs.goal <= 0) return null;
  if (inputs.initial >= inputs.goal) return 0;
  if (inputs.monthly <= 0 && inputs.rate <= 0) return null;
  for (let m = 1; m <= MAX_SEARCH_MONTHS; m++) {
    if (valueAt(inputs.initial, inputs.monthly, inputs.rate, m) >= inputs.goal) return m;
  }
  return null;
}

/** 현재 기간 안에 목표에 도달하려면 필요한 월 투자금(원). 이미 도달하면 0. */
export function requiredMonthly(inputs: Inputs): number {
  const months = inputs.years * 12;
  if (months <= 0) return 0;
  const rm = monthlyRate(inputs.rate);
  const growth = Math.pow(1 + rm, months);
  const fromInitial = inputs.initial * growth;
  if (fromInitial >= inputs.goal) return 0;
  const annuity = rm === 0 ? months : (growth - 1) / rm;
  return (inputs.goal - fromInitial) / annuity;
}

export function clampInputs(v: Inputs): Inputs {
  return {
    initial: Math.max(0, Math.min(v.initial, 1e13)),
    monthly: Math.max(0, Math.min(v.monthly, 1e11)),
    rate: Math.max(0, Math.min(v.rate, 30)),
    years: Math.max(1, Math.min(Math.round(v.years), MAX_YEARS)),
    goal: Math.max(0, Math.min(v.goal, 1e14)),
  };
}
