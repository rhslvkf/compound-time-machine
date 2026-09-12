import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Close } from './icons';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** 바텀시트 — 닫기 버튼과 배경 탭 두 가지 닫기 경로를 둔다. */
export function Sheet({ title, onClose, children, footer }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="sheet-root">
      <button type="button" className="sheet-dim" aria-label="닫기" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
            <Close size={22} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}
