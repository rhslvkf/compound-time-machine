const KO = new Intl.NumberFormat('ko-KR');

export function formatDigits(n: number): string {
  return KO.format(Math.round(n));
}

export function parseDigits(s: string): number {
  const digits = s.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

/** 1억 2,345만원 / 1,234만원 / 9,900원 — 히어로·카드용 축약 표기 */
export function formatWon(n: number): string {
  const v = Math.round(n);
  if (v < 10_000) return `${KO.format(v)}원`;
  const man = Math.floor(v / 10_000);
  if (man < 10_000) return `${KO.format(man)}만원`;
  const eok = Math.floor(man / 10_000);
  const rest = man % 10_000;
  return rest === 0 ? `${KO.format(eok)}억원` : `${KO.format(eok)}억 ${KO.format(rest)}만원`;
}

/** 원 단위 전체 표기 */
export function formatWonFull(n: number): string {
  return `${KO.format(Math.round(n))}원`;
}

export function formatPercent(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

/** 개월 수 → "12년 3개월" */
export function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}개월`;
  if (m === 0) return `${y}년`;
  return `${y}년 ${m}개월`;
}

/** +52.3% / -8.1% */
export function formatSignedPercent(rate: number): string {
  const pct = rate * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${Math.abs(pct) >= 100 ? Math.round(pct) : pct.toFixed(1)}%`;
}

/** 부호 있는 금액: +1,234만원 / -560만원 */
export function formatSignedWon(n: number): string {
  if (n < 0) return `-${formatWon(-n)}`;
  return `+${formatWon(n)}`;
}
