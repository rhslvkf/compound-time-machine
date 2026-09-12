import type { Point } from '../lib/compound';
import { formatWon } from '../lib/format';

interface Props {
  points: Point[];
  /** x축 눈금 라벨. 기본은 "N년" */
  tickLabel?: (p: Point) => string;
}

const W = 320;
const H = 168;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 28;

/**
 * 넣은 돈(아래)과 평가액을 겹친 면적 그래프. 평가액이 넣은 돈보다 크면 브랜드색으로,
 * 작으면(손실) 위험색으로 그 차이를 칠한다. 색은 부모의 CSS 변수를 쓴다.
 */
export function GrowthChart({ points, tickLabel }: Props) {
  const last = points[points.length - 1];
  const maxY = Math.max(...points.map((p) => Math.max(p.total, p.principal)), 1);
  const n = points.length;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (n === 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD_T + innerH - (v / maxY) * innerH;
  const pt = (i: number, v: number) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`;

  const principalLine = points.map((p, i) => pt(i, p.principal));
  const totalLine = points.map((p, i) => pt(i, p.total));
  const upperLine = points.map((p, i) => pt(i, Math.max(p.total, p.principal)));
  const lowerLine = points.map((p, i) => pt(i, Math.min(p.total, p.principal)));
  const baseline = `${x(n - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} ${x(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)}`;

  const principalArea = `${principalLine.join(' ')} ${baseline}`;
  const gainArea = `${upperLine.join(' ')} ${[...principalLine].reverse().join(' ')}`;
  const lossArea = `${principalLine.join(' ')} ${[...lowerLine].reverse().join(' ')}`;
  const hasLoss = points.some((p) => p.total < p.principal);

  const ticks = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];
  const label = tickLabel ?? ((p: Point) => (p.year === 0 ? '지금' : `${p.year}년`));

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`마지막 시점 평가액 ${formatWon(last.total)}, 넣은 돈 ${formatWon(last.principal)}`}
    >
      <polygon className="chart-interest" points={gainArea} />
      <polygon className="chart-principal" points={principalArea} />
      {hasLoss && <polygon className="chart-loss" points={lossArea} />}
      <polyline className="chart-total-line" points={totalLine.join(' ')} />
      {ticks.map((i) => (
        <text
          key={i}
          className="chart-tick"
          x={x(i)}
          y={H - 8}
          textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
        >
          {label(points[i])}
        </text>
      ))}
    </svg>
  );
}
