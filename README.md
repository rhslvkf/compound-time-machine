# 복리 타임머신

앱인토스 미니앱. 현재 자산·월 투자금·수익률·기간으로 미래 자산을, 실제 과거 가격으로 "그때 넣었다면 지금 얼마"를 보여준다.

## 개발

```bash
npm install
npm run dev     # 브라우저 (devtools mock)
npm run build   # tsc + vite build + ait build → compound-time-machine.ait
```

## 가격 데이터

- `src/data/prices.json` — 자산별 월 종가(원화 환산). `scripts/fetch-prices.mjs`가 만든다.
- 매월 2일 GitHub Actions(`update-prices.yml`)가 자동 갱신해 커밋한다. 수동 갱신은 `npm run data:prices`.
- 앱은 실행 시 jsDelivr CDN(`cdn.jsdelivr.net/gh/<owner>/<repo>@main/src/data/prices.json`)에서 최신 파일을 받고, 실패하면 번들에 포함된 사본을 쓴다. 번들을 다시 올리지 않아도 데이터가 갱신된다.
- 출처: Yahoo Finance 월봉 종가(분할 조정, 배당 미반영), 환율은 미 연준 FRED(DEXKOUS).
