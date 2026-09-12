/**
 * 과거 타임머신용 월별 가격 데이터를 받아 src/data/prices.json으로 굽는다.
 * 앱은 이 파일만 읽는다 — 런타임 네트워크 호출은 없다. 재배포 전에 `npm run data:prices`로 갱신한다.
 *
 * 출처: Yahoo Finance 차트 엔드포인트(비공식) 월봉 종가(분할 조정, 배당 미반영).
 * 달러 자산은 같은 달 말 원/달러 환율(FRED DEXKOUS, 미 연준)로 환산한다 — Yahoo의 KRW=X는
 * 2015년 일부 달에 0.11 같은 오류값이 섞여 있어 쓰지 않는다.
 */
import { writeFile } from 'node:fs/promises';

const RANGE = '15y';
const UA = 'Mozilla/5.0';

/** id, 이름, 야후 심볼, 통화, 분류 */
const ASSETS = [
  { id: 'gold', name: '금', symbol: 'GC=F', currency: 'USD', group: '원자재', note: '금 선물(COMEX)' },
  { id: 'silver', name: '은', symbol: 'SI=F', currency: 'USD', group: '원자재', note: '은 선물(COMEX)' },
  { id: 'sp500', name: '미국 S&P500', symbol: 'SPY', currency: 'USD', group: '지수', note: 'SPY ETF' },
  { id: 'nasdaq100', name: '나스닥100', symbol: 'QQQ', currency: 'USD', group: '지수', note: 'QQQ ETF' },
  { id: 'kospi200', name: '코스피200', symbol: '069500.KS', currency: 'KRW', group: '지수', note: 'KODEX 200 ETF' },
  { id: 'bitcoin', name: '비트코인', symbol: 'BTC-USD', currency: 'USD', group: '코인' },
  { id: 'ethereum', name: '이더리움', symbol: 'ETH-USD', currency: 'USD', group: '코인' },
  { id: 'apple', name: '애플', symbol: 'AAPL', currency: 'USD', group: '미국 주식' },
  { id: 'microsoft', name: '마이크로소프트', symbol: 'MSFT', currency: 'USD', group: '미국 주식' },
  { id: 'nvidia', name: '엔비디아', symbol: 'NVDA', currency: 'USD', group: '미국 주식' },
  { id: 'tesla', name: '테슬라', symbol: 'TSLA', currency: 'USD', group: '미국 주식' },
  { id: 'amazon', name: '아마존', symbol: 'AMZN', currency: 'USD', group: '미국 주식' },
  { id: 'google', name: '구글', symbol: 'GOOGL', currency: 'USD', group: '미국 주식' },
  { id: 'samsung', name: '삼성전자', symbol: '005930.KS', currency: 'KRW', group: '국내 주식' },
  { id: 'hynix', name: 'SK하이닉스', symbol: '000660.KS', currency: 'KRW', group: '국내 주식' },
  { id: 'hyundai', name: '현대차', symbol: '005380.KS', currency: 'KRW', group: '국내 주식' },
  { id: 'usd', name: '달러', symbol: 'FRED:DEXKOUS', currency: 'KRW', group: '통화', note: '원/달러 환율' },
];

/** FRED 일별 환율 CSV → 월별 마지막 거래일 값 */
async function fetchFredMonthly(seriesId) {
  const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const text = await res.text();
  const out = new Map();
  for (const line of text.trim().split('\n').slice(1)) {
    const [date, value] = line.split(',');
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) continue;
    out.set(date.slice(0, 7), v); // 같은 달의 뒤 날짜가 앞을 덮어써 월말 값이 남는다
  }
  return out;
}

/** 한 달 급등·급락 뒤 바로 되돌아오는 값은 데이터 오류로 보고 버린다 */
function dropGlitches(map) {
  const keys = [...map.keys()].sort();
  const cleaned = new Map(map);
  for (let i = 1; i < keys.length - 1; i++) {
    const prev = map.get(keys[i - 1]);
    const cur = map.get(keys[i]);
    const next = map.get(keys[i + 1]);
    const r1 = cur / prev;
    const r2 = next / cur;
    if ((r1 > 3 && r2 < 1 / 3) || (r1 < 1 / 3 && r2 > 3)) cleaned.delete(keys[i]);
  }
  return cleaned;
}

async function fetchMonthly(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=${RANGE}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const json = await res.json();
  const r = json.chart?.result?.[0];
  if (!r) throw new Error(`${symbol}: ${JSON.stringify(json.chart?.error ?? json).slice(0, 200)}`);
  const closes = r.indicators.quote[0].close;
  const out = new Map();
  r.timestamp.forEach((ts, i) => {
    const d = new Date(ts * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const c = closes[i];
    if (typeof c === 'number' && Number.isFinite(c)) out.set(key, c);
  });
  return out;
}

function monthRange(from, to) {
  const keys = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return keys;
}

const fx = await fetchFredMonthly('DEXKOUS');
const fxKeys = [...fx.keys()].sort();
const asOf = fxKeys[fxKeys.length - 1];

const assets = [];
for (const a of ASSETS) {
  try {
    const raw = a.symbol.startsWith('FRED:') ? new Map(fx) : dropGlitches(await fetchMonthly(a.symbol));
    // 15년치로 자른다 — FRED 환율은 1981년부터 있다
    const cutoff = `${Number(asOf.slice(0, 4)) - 15}-${asOf.slice(5)}`;
    for (const k of raw.keys()) if (k < cutoff) raw.delete(k);
    const keys = [...raw.keys()].sort();
    const all = monthRange(keys[0], asOf);
    // 결손 달은 직전 달 값으로 채운다
    let last = null;
    let filled = 0;
    const series = [];
    for (const k of all) {
      let price = raw.get(k);
      if (price == null) {
        if (last == null) continue;
        price = last;
        filled++;
      }
      last = price;
      const rate = a.currency === 'USD' ? (fx.get(k) ?? fx.get(fxKeys.filter((f) => f <= k).at(-1))) : 1;
      if (!rate) continue;
      series.push([k, Math.round(price * rate * 100) / 100]);
    }
    assets.push({ id: a.id, name: a.name, group: a.group, note: a.note ?? null, symbol: a.symbol, from: series[0][0], series });
    console.log(`${a.name.padEnd(8)} ${a.symbol.padEnd(10)} ${series.length}개월 (${series[0][0]}~) 보정 ${filled}`);
  } catch (e) {
    console.error(`SKIP ${a.name}: ${e.message}`);
  }
}

await writeFile(
  new URL('../src/data/prices.json', import.meta.url),
  JSON.stringify({ asOf, source: 'Yahoo Finance 월봉 종가(분할 조정, 배당 미반영), 환율은 미 연준 FRED', assets }),
);
console.log(`\nasOf ${asOf}, ${assets.length} assets → src/data/prices.json`);
