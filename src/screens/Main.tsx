import { useMemo } from 'react';
import { AmountField } from '../components/AmountField';
import { Chips } from '../components/Chips';
import { GrowthChart } from '../components/GrowthChart';
import { ShareButton } from '../components/ShareButton';
import { MAX_YEARS, monthsToGoal, project, requiredMonthly, summarize, type Inputs } from '../lib/compound';
import { formatMonths, formatPercent, formatWon, formatWonFull } from '../lib/format';

interface Props {
  inputs: Inputs;
  onChange: (next: Inputs) => void;
}

const RATE_PRESETS = [3, 5, 7, 10].map((v) => ({ value: v, label: `${v}%` }));

/** 만원 단위로 올림 — 역산한 월 투자금을 사람이 쓸 만한 숫자로 */
function ceilToMan(n: number): number {
  return Math.ceil(n / 10_000) * 10_000;
}

export function Main({ inputs, onChange }: Props) {
  const set = <K extends keyof Inputs>(key: K, value: Inputs[K]) => onChange({ ...inputs, [key]: value });

  const summary = useMemo(() => summarize(inputs), [inputs]);
  const points = useMemo(() => project(inputs), [inputs]);
  const goalMonths = useMemo(() => monthsToGoal(inputs), [inputs]);
  const needMonthly = useMemo(() => requiredMonthly(inputs), [inputs]);
  const scenarios = useMemo(
    () =>
      [Math.max(0, inputs.rate - 2), inputs.rate, inputs.rate + 2].map((rate) => ({
        rate,
        total: summarize({ ...inputs, rate }).total,
      })),
    [inputs],
  );

  const rateIsPreset = RATE_PRESETS.some((p) => p.value === inputs.rate);
  const interestPct = Math.round(summary.interestShare * 100);
  const needMonthlyRounded = ceilToMan(needMonthly);
  const goalReachedInHorizon = goalMonths !== null && goalMonths <= inputs.years * 12;

  return (
    <main className="screen canvas">
      <header className="screen-header">
        <p className="eyebrow">복리 타임머신</p>
        <h1 className="title">{inputs.years}년 뒤 내 자산</h1>
      </header>

      <section className="hero" aria-live="polite">
        <p className="hero-number tabular">{formatWon(summary.total)}</p>
        <p className="hero-exact tabular">{formatWonFull(summary.total)}</p>
        <div className="split">
          <div className="split-item">
            <span className="split-dot split-dot-principal" aria-hidden="true" />
            <span className="split-label">내가 넣은 돈</span>
            <span className="split-value tabular">{formatWon(summary.principal)}</span>
          </div>
          <div className="split-item">
            <span className="split-dot split-dot-interest" aria-hidden="true" />
            <span className="split-label">복리가 벌어준 돈</span>
            <span className="split-value tabular">{formatWon(summary.interest)}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="slider-head">
          <span className="card-label">기간</span>
          <span className="slider-value tabular">{inputs.years}년</span>
        </div>
        <input
          className="slider"
          type="range"
          min={1}
          max={MAX_YEARS}
          step={1}
          value={inputs.years}
          aria-label="기간(년)"
          onChange={(e) => set('years', Number(e.target.value))}
        />
        <div className="slider-scale">
          <span>1년</span>
          <span>{MAX_YEARS}년</span>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">조건</h2>
        <AmountField
          id="initial"
          label="현재 자산"
          value={inputs.initial}
          unit="원"
          hint="없으면 비워두세요"
          onChange={(v) => set('initial', v)}
        />
        <AmountField
          id="monthly"
          label="매월 투자"
          value={inputs.monthly}
          unit="원"
          hint="예: 500,000"
          onChange={(v) => set('monthly', v)}
        />
        <div className="field">
          <span className="field-label">연 수익률</span>
          <Chips label="연 수익률" options={RATE_PRESETS} value={inputs.rate} onChange={(v) => set('rate', v)} />
          <span className="field-input-wrap">
            <input
              className="field-input tabular"
              type="number"
              inputMode="decimal"
              min={0}
              max={30}
              step={0.1}
              aria-label="연 수익률 직접 입력"
              value={rateIsPreset ? inputs.rate : inputs.rate || ''}
              placeholder="직접 입력"
              onChange={(e) => {
                const n = Number(e.target.value);
                set('rate', Number.isFinite(n) ? Math.max(0, Math.min(30, n)) : 0);
              }}
            />
            <span className="field-unit">%</span>
          </span>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">자산이 자라는 모습</h2>
        <GrowthChart points={points} />
        <div className="legend">
          <span className="legend-item">
            <span className="split-dot split-dot-principal" aria-hidden="true" />
            넣은 돈
          </span>
          <span className="legend-item">
            <span className="split-dot split-dot-interest" aria-hidden="true" />
            복리 수익
          </span>
        </div>
        <div className="ratio" role="img" aria-label={`복리 수익 비율 ${interestPct}%`}>
          <div className="ratio-interest" style={{ width: `${interestPct}%` }} />
        </div>
        <p className="card-note">
          {inputs.years}년 뒤 자산의 <strong className="tabular">{interestPct}%</strong>는 복리가 벌어준 돈이에요.
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">목표 금액</h2>
        <AmountField id="goal" label="목표" value={inputs.goal} unit="원" hint="예: 100,000,000" onChange={(v) => set('goal', v)} />
        {inputs.goal <= 0 ? (
          <p className="card-note">목표 금액을 넣으면 도달 시점과 필요한 월 투자금을 계산해요.</p>
        ) : goalMonths === 0 ? (
          <p className="goal-result">이미 목표 금액을 갖고 있어요.</p>
        ) : (
          <div className="goal-result">
            <p className="goal-headline">
              {goalMonths !== null ? (
                <>
                  지금 조건이면 약 <strong className="tabular">{formatMonths(goalMonths)}</strong> 뒤 {formatWon(inputs.goal)}에 도달해요
                </>
              ) : (
                <>지금 조건으로는 100년 안에 도달하지 않아요</>
              )}
            </p>
            {!goalReachedInHorizon && needMonthlyRounded > 0 && (
              <>
                <p className="card-note">
                  {inputs.years}년 안에 도달하려면 매월 <strong className="tabular">{formatWon(needMonthlyRounded)}</strong>이 필요해요.
                </p>
                <button type="button" className="button-secondary" onClick={() => set('monthly', needMonthlyRounded)}>
                  매월 {formatWon(needMonthlyRounded)}으로 바꾸기
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">수익률에 따라 달라지는 결과</h2>
        <ul className="scenarios">
          {scenarios.map((s) => (
            <li key={s.rate} className={s.rate === inputs.rate ? 'scenario scenario-on' : 'scenario'}>
              <span className="scenario-rate tabular">연 {formatPercent(s.rate)}</span>
              <span className="scenario-total tabular">{formatWon(s.total)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ShareButton
        buildMessage={() =>
          [
            `매월 ${formatWon(inputs.monthly)}씩 연 ${formatPercent(inputs.rate)}로 ${inputs.years}년 굴리면`,
            `${formatWon(summary.total)}`,
            `넣은 돈 ${formatWon(summary.principal)} + 복리 수익 ${formatWon(summary.interest)}`,
            '복리 타임머신으로 계산했어요',
          ].join('\n')
        }
      />

      <footer className="notice">
        <p>입력한 수익률로 계산한 가상 시뮬레이션이에요. 투자 권유나 수익 보장이 아니에요.</p>
        <p>매월 투자금은 월말 납입, 수익은 매월 복리로 계산하며 세금·수수료는 반영하지 않아요.</p>
      </footer>
    </main>
  );
}
