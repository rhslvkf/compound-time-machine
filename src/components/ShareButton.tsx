import { useState } from 'react';
import { createAppLink, haptic, shareMessage } from '../lib/sdk';

interface Props {
  /** 공유할 본문을 만든다 — 링크는 뒤에 붙인다 */
  buildMessage: () => string;
}

type Status = 'idle' | 'busy' | 'done' | 'failed';

export function ShareButton({ buildMessage }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  const onShare = async () => {
    if (status === 'busy') return;
    setStatus('busy');
    void haptic('tap');
    const link = await createAppLink();
    const message = link ? `${buildMessage()}\n\n${link}` : buildMessage();
    const result = await shareMessage(message);
    setStatus(result === 'shared' ? 'done' : 'failed');
    window.setTimeout(() => setStatus('idle'), 2000);
  };

  const label =
    status === 'busy' ? '공유 준비 중' : status === 'done' ? '공유했어요' : status === 'failed' ? '이 환경에서는 공유할 수 없어요' : '결과 공유하기';

  return (
    <button type="button" className="button-primary" onClick={onShare} disabled={status === 'busy'}>
      {label}
    </button>
  );
}
