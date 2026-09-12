import { Device, SafeAreaInsets, Share, closeView, graniteEvent } from '@apps-in-toss/web-framework';
import type { HapticFeedbackType } from '@apps-in-toss/web-framework';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const ZERO: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

export async function haptic(type: HapticFeedbackType = 'tap'): Promise<void> {
  try {
    await Device.triggerHaptic({ type });
  } catch {
    /* 브라우저 등 미지원 환경 */
  }
}

export async function closeApp(): Promise<void> {
  try {
    await closeView();
  } catch {
    /* 브라우저에서는 닫을 화면이 없다 */
  }
}

export function readSafeArea(): Insets {
  try {
    const v = SafeAreaInsets.get();
    return v ? { ...ZERO, ...v } : ZERO;
  } catch {
    return ZERO;
  }
}

export function subscribeSafeArea(onChange: (insets: Insets) => void): () => void {
  try {
    return SafeAreaInsets.subscribe({ onEvent: (v) => onChange({ ...ZERO, ...v }) });
  } catch {
    return () => {};
  }
}

/** 안드로이드 시스템 백버튼. 구독하면 기본 뒤로가기가 차단되므로 핸들러가 직접 처리한다. */
export function subscribeBack(handler: () => void): () => void {
  try {
    return graniteEvent.addEventListener('backEvent', {
      onEvent: handler,
      onError: (error) => console.error('backEvent error', error),
    });
  } catch {
    return () => {};
  }
}

export const APP_SCHEME = 'intoss://compound-time-machine';

export async function createAppLink(): Promise<string | null> {
  try {
    const link = await Share.createLink({ path: APP_SCHEME });
    return typeof link === 'string' && link ? link : null;
  } catch {
    return null;
  }
}

export type ShareResult = 'shared' | 'unsupported';

export async function shareMessage(message: string): Promise<ShareResult> {
  try {
    await Share.sendMessage({ message });
    return 'shared';
  } catch {
    // 브라우저 등 미지원 환경: 클립보드로 대체한다
    try {
      await navigator.clipboard.writeText(message);
      return 'shared';
    } catch {
      return 'unsupported';
    }
  }
}
