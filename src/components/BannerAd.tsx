import { TossAds } from '@apps-in-toss/web-framework';
import { useEffect, useRef, useState } from 'react';

/**
 * 배너 광고 그룹 ID.
 * 지금은 테스트 ID다 — 콘솔에서 운영 광고 그룹을 발급받으면 이 값을 바꾼다.
 * 검수·출시 번들에는 반드시 운영 ID를 쓴다(테스트 ID로 출시하면 정책 위반).
 */
const BANNER_AD_GROUP_ID = 'ait-ad-test-banner-id';

let initState: 'idle' | 'pending' | 'ready' | 'failed' = 'idle';
const waiters: Array<(ok: boolean) => void> = [];

function ensureInitialized(): Promise<boolean> {
  if (initState === 'ready') return Promise.resolve(true);
  if (initState === 'failed') return Promise.resolve(false);
  return new Promise((resolve) => {
    waiters.push(resolve);
    if (initState === 'pending') return;
    initState = 'pending';
    try {
      if (!TossAds.initialize.isSupported()) {
        initState = 'failed';
        waiters.splice(0).forEach((w) => w(false));
        return;
      }
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            initState = 'ready';
            waiters.splice(0).forEach((w) => w(true));
          },
          onInitializationFailed: (error) => {
            console.warn('배너 광고 초기화 실패', error);
            initState = 'failed';
            waiters.splice(0).forEach((w) => w(false));
          },
        },
      });
    } catch {
      initState = 'failed';
      waiters.splice(0).forEach((w) => w(false));
    }
  });
}

/**
 * 스크롤 화면 중간에 놓는 배너 하나. 광고가 실제로 그려졌을 때만 자리를 차지하고,
 * 미지원 환경·no-fill·실패에서는 아무것도 그리지 않아 빈 공간이 남지 않는다.
 */
export function BannerAd() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let attached: { destroy: () => void } | undefined;
    let cancelled = false;
    ensureInitialized().then((ok) => {
      if (cancelled || !ok || !ref.current) return;
      try {
        if (!TossAds.attachBanner.isSupported()) return;
        attached = TossAds.attachBanner(BANNER_AD_GROUP_ID, ref.current, {
          theme: 'light',
          tone: 'blackAndWhite',
          variant: 'expanded',
          callbacks: {
            onAdRendered: () => setVisible(true),
            onNoFill: () => setVisible(false),
            onAdFailedToRender: () => setVisible(false),
          },
        });
      } catch {
        setVisible(false);
      }
    });
    return () => {
      cancelled = true;
      attached?.destroy();
    };
  }, []);

  return (
    <div className={`banner-ad${visible ? ' is-visible' : ''}`}>
      <div ref={ref} style={{ width: '100%', height: '96px' }} />
    </div>
  );
}
