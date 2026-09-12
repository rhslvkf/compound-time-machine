import type { PastResult } from '../lib/backtest';
import { formatWon } from '../lib/format';

interface Props {
  /** 첫 항목이 지금 보고 있는 자산 */
  results: PastResult[];
  /** 기준 개월 수 — 가장 긴 축 */
  months: number;
  yearsLabel: string;
  /** 돋보이게 그릴 자산 id — 이 선은 맨 위에 굵게, 나머지는 흐리게 */
  highlightId?: string;
}

const W = 320;
const H = 168;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 28;

/** 여러 자산의 평가액 추이를 같은 축에 선으로 겹친다. 선 색은 .compare-line-N 클래스가 정한다. */
export function CompareChart({ results, months, yearsLabel, highlightId }: Props) {
  const maxY = Math.max(1, ...results.flatMap((r) => r.points.map((p) => p.total)));
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const x = (monthsAgo: number) => PAD_L + (1 - monthsAgo / months) * innerW;
  const y = (v: number) => PAD_T + innerH - (v / maxY) * innerH;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="자산별 평가액 비교">
      {results
        .map((r, i) => ({ r, i }))
        // 돋보일 선을 마지막에 그려 다른 선 위에 올린다
        .sort((a, b) => Number(a.r.asset.id === highlightId) - Number(b.r.asset.id === highlightId))
        .map(({ r, i }) => {
          const line = r.points
            .map((p) => {
              const monthsAgo = r.months - Math.min(p.year * 12, r.months);
              return `${x(monthsAgo).toFixed(1)},${y(p.total).toFixed(1)}`;
            })
            .join(' ');
          const state = !highlightId ? '' : r.asset.id === highlightId ? ' compare-line-hot' : ' compare-line-dim';
          return <polyline key={r.asset.id} className={`compare-line compare-line-${i}${state}`} points={line} />;
        })}
      <text className="chart-tick" x={PAD_L} y={H - 8} textAnchor="start">
        {yearsLabel}
      </text>
      <text className="chart-tick" x={W - PAD_R} y={H - 8} textAnchor="end">
        지금
      </text>
      <text className="chart-tick" x={PAD_L} y={PAD_T - 2} textAnchor="start">
        {formatWon(maxY)}
      </text>
    </svg>
  );
}
