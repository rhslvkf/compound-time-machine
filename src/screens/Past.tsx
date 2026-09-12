import { useMemo, useState } from 'react';
import { AmountField } from '../components/AmountField';
import { AssetPicker } from '../components/AssetPicker';
import { CompareChart } from '../components/CompareChart';
import { GrowthChart } from '../components/GrowthChart';
import { ShareButton } from '../components/ShareButton';
import { ChevronRight } from '../components/icons';
import { MAX_COMPARE, backtest, backtestMany, maxYearsFor, type PastInputs } from '../lib/backtest';
import { formatSignedPercent, formatSignedWon, formatWon, formatWonFull } from '../lib/format';
import { formatMonthKey, type PriceData } from '../lib/prices';
import { haptic } from '../lib/sdk';

interface Props {
  prices: PriceData;
  inputs: PastInputs;
  onChange: (next: PastInputs) => void;
}

type Picker = 'asset' | 'compare' | null;

export function Past({ prices, inputs, onChange }: Props) {
  const set = <K extends keyof PastInputs>(key: K, value: PastInputs[K]) => onChange({ ...inputs, [key]: value });
  const [picker, setPicker] = useState<Picker>(null);
  /** 비교 그래프에서 돋보이게 볼 자산. null이면 전체 선을 같은 굵기로 보여준다 */
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const maxYears = maxYearsFor(prices, inputs.assetId);
  const years = Math.min(inputs.years, maxYears);
  const effective = useMemo(() => ({ ...inputs, years }), [inputs, years]);
  const result = useMemo(() => backtest(prices, effective), [prices, effective]);
  // 이전 버전에서 저장된 상태에는 compareIds가 없을 수 있다
  const compareIds = useMemo(() => (inputs.compareIds ?? []).filter((id) => id !== inputs.assetId), [inputs.compareIds, inputs.assetId]);
  const compared = useMemo(
    () => backtestMany(prices, { initial: effective.initial, monthly: effective.monthly, years: effective.years, compareIds: [] }, compareIds),
    [prices, effective, compareIds],
  );

  if (!result) return null;
  const isGain = result.gain >= 0;
  const usedYears = Math.floor(result.months / 12);
  const usedRest = result.months % 12;
  const periodLabel = usedRest === 0 ? `${usedYears}년` : `${usedYears}년 ${usedRest}개월`;
  // 색은 선택 순서(현재 자산이 0번)로 고정하고, 목록은 수익률 순으로 보여준다
  const allResults = [result, ...compared].map((r, colorIndex) => ({ r, colorIndex }));
  const ranked = [...allResults].sort((a, b) => b.r.returnRate - a.r.returnRate);
  const hot = highlightId && allResults.some((x) => x.r.asset.id === highlightId) ? highlightId : null;

  return (
    <main className="screen canvas">
      <header className="screen-header">
        <p className="eyebrow">복리 타임머신</p>
        <h1 className="title">
          {periodLabel} 전부터 {result.asset.name}에 넣었다면
        </h1>
      </header>

      <section className="hero" aria-live="polite">
        <p className="hero-number tabular">{formatWon(result.total)}</p>
        <p className="hero-exact tabular">{formatWonFull(result.total)}</p>
        <div className="split">
          <div className="split-item">
            <span className="split-dot split-dot-principal" aria-hidden="true" />
            <span className="split-label">내가 넣은 돈</span>
            <span className="split-value tabular">{formatWon(result.principal)}</span>
          </div>
          <div className="split-item">
            <span className={isGain ? 'split-dot split-dot-interest' : 'split-dot split-dot-loss'} aria-hidden="true" />
            <span className="split-label">{isGain ? '불어난 돈' : '줄어든 돈'}</span>
            <span className={isGain ? 'split-value tabular' : 'split-value split-value-loss tabular'}>
              {formatSignedWon(result.gain)}
            </span>
          </div>
        </div>
        <p className="hero-rate tabular">
          총 {formatSignedPercent(result.returnRate)} · 연평균 {formatSignedPercent(result.cagr)}
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">조건</h2>
        <div className="field">
          <span className="field-label">어떤 자산에</span>
          <button
            type="button"
            className="row-button"
            onClick={() => {
              void haptic('tap');
              setPicker('asset');
            }}
          >
            <span className="row-button-text">
              <span className="row-button-value">{result.asset.name}</span>
              {result.asset.note && <span className="row-button-meta">{result.asset.note}</span>}
            </span>
            <span className="row-button-icon" aria-hidden="true">
              <ChevronRight size={20} />
            </span>
          </button>
        </div>
        <div className="field">
          <div className="slider-head">
            <span className="field-label">몇 년 전부터</span>
            <span className="slider-value tabular">{years}년 전</span>
          </div>
          <input
            className="slider"
            type="range"
            min={1}
            max={maxYears}
            step={1}
            value={years}
            aria-label="몇 년 전부터"
            onChange={(e) => {
              void haptic('tickWeak');
              set('years', Number(e.target.value));
            }}
          />
          <div className="slider-scale">
            <span>1년 전</span>
            <span>{maxYears}년 전</span>
          </div>
          {maxYears < 15 && (
            <p className="card-note">
              {result.asset.name} 데이터는 {formatMonthKey(result.asset.from)}부터 있어서 최대 {maxYears}년까지 볼 수 있어요.
            </p>
          )}
        </div>
        <AmountField
          id="past-monthly"
          label="매월 투자"
          value={inputs.monthly}
          unit="원"
          hint="예: 300,000"
          onChange={(v) => set('monthly', v)}
        />
        <AmountField
          id="past-initial"
          label="처음에 한 번 넣는 돈"
          value={inputs.initial}
          unit="원"
          hint="없으면 비워두세요"
          onChange={(v) => set('initial', v)}
        />
      </section>

      <section className="card">
        <h2 className="card-title">
          {formatMonthKey(result.startKey)}부터 {formatMonthKey(result.endKey)}까지
        </h2>
        <GrowthChart
          points={result.points}
          tickLabel={(p) => (p.year === 0 ? `${usedYears}년 전` : p.year * 12 >= result.months ? '지금' : `${usedYears - p.year}년 전`)}
        />
        <div className="legend">
          <span className="legend-item">
            <span className="split-dot split-dot-principal" aria-hidden="true" />
            넣은 돈
          </span>
          <span className="legend-item">
            <span className="split-dot split-dot-interest" aria-hidden="true" />
            불어난 돈
          </span>
          <span className="legend-item">
            <span className="split-dot split-dot-loss" aria-hidden="true" />
            줄어든 돈
          </span>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">같은 돈을 다른 자산에 넣었다면</h2>
        {compared.length > 0 && (
          <CompareChart
            results={allResults.map((x) => x.r)}
            months={result.months}
            yearsLabel={`${usedYears}년 전`}
            highlightId={hot ?? undefined}
          />
        )}
        <ul className="compare-list">
          {ranked.map(({ r, colorIndex }, i) => (
            <li key={r.asset.id}>
              <button
                type="button"
                className={[
                  'compare-row',
                  r.asset.id === hot ? 'compare-row-on' : '',
                  r.asset.id === inputs.assetId ? 'compare-row-mine' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={r.asset.id === hot}
                onClick={() => {
                  void haptic('tickWeak');
                  // 같은 자산을 다시 누르면 해제한다
                  setHighlightId((prev) => (prev === r.asset.id ? null : r.asset.id));
                }}
              >
                <span className="rank tabular">{i + 1}</span>
                <span className={`split-dot compare-dot-${colorIndex}`} aria-hidden="true" />
                <span className="compare-name">
                  {r.asset.name}
                  {r.months < result.months && <span className="scenario-meta tabular"> · {Math.floor(r.months / 12)}년치</span>}
                </span>
                <span className="compare-figures">
                  <span className={r.gain >= 0 ? 'scenario-total tabular' : 'scenario-total scenario-total-loss tabular'}>
                    {formatWon(r.total)}
                  </span>
                  <span className={r.gain >= 0 ? 'compare-rate tabular' : 'compare-rate compare-rate-loss tabular'}>
                    {formatSignedPercent(r.returnRate)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            void haptic('tap');
            setPicker('compare');
          }}
        >
          {compared.length === 0 ? '비교할 자산 고르기' : '비교 자산 바꾸기'}
        </button>
        <p className="card-note">
          수익률 높은 순이에요. 테두리가 있는 행이 지금 보고 있는 자산이에요. 자산을 누르면 그래프에서 그 선이 돋보이고, 다시 누르면 돌아와요.{compared.some((r) => r.months < result.months) && ' 데이터가 짧은 자산은 있는 기간만큼만 계산해요.'}
        </p>
      </section>

      <ShareButton
        buildMessage={() =>
          [
            `${periodLabel} 전부터 ${result.asset.name}에 매월 ${formatWon(effective.monthly)}씩 넣었다면`,
            `지금 ${formatWon(result.total)} (${formatSignedPercent(result.returnRate)})`,
            `넣은 돈 ${formatWon(result.principal)} → ${isGain ? '불어난' : '줄어든'} 돈 ${formatSignedWon(result.gain)}`,
            '복리 타임머신으로 계산했어요',
          ].join('\n')
        }
      />

      <footer className="notice">
        <p>{formatMonthKey(prices.asOf)} 기준 월별 종가로 계산한 가상 시뮬레이션이에요. 과거 성과가 앞으로의 수익을 보장하지 않아요.</p>
        <p>매월 그 달 종가에 사서 마지막 달 종가로 평가했어요. 배당·이자·수수료·세금·환전 비용은 반영하지 않았고, 달러 자산은 그 달 환율로 원화 환산했어요.</p>
        <p>출처: {prices.source}</p>
      </footer>

      {picker === 'asset' && (
        <AssetPicker
          mode="single"
          data={prices}
          selected={inputs.assetId}
          onSelect={(id) => {
            set('assetId', id);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'compare' && (
        <AssetPicker
          mode="multi"
          data={prices}
          selected={compareIds}
          exclude={inputs.assetId}
          max={MAX_COMPARE}
          onDone={(ids) => {
            set('compareIds', ids);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </main>
  );
}
