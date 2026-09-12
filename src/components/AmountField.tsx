import { useState } from 'react';
import type { FocusEvent } from 'react';
import { formatDigits, parseDigits } from '../lib/format';

interface Props {
  id: string;
  label: string;
  value: number;
  unit: string;
  hint?: string;
  onChange: (v: number) => void;
}

/** 키보드가 올라온 뒤 입력란을 화면 가운데로 옮긴다 — 웹뷰의 자동 스크롤이 입력란을 가리는 경우가 있다. */
function scrollIntoCenter(e: FocusEvent<HTMLElement>) {
  const el = e.currentTarget;
  window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
}

export function AmountField({ id, label, value, unit, hint, onChange }: Props) {
  const [text, setText] = useState<string>(() => (value > 0 ? formatDigits(value) : ''));
  const [lastValue, setLastValue] = useState(value);
  // 바깥에서 값이 바뀌면(칩 등) 표시 문자열을 따라간다
  if (value !== lastValue) {
    setLastValue(value);
    setText(value > 0 ? formatDigits(value) : '');
  }

  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="field-input-wrap">
        <input
          id={id}
          className="field-input tabular"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={hint ?? '0'}
          value={text}
          onFocus={scrollIntoCenter}
          onChange={(e) => {
            const n = parseDigits(e.target.value);
            setText(n > 0 ? formatDigits(n) : '');
            setLastValue(n);
            onChange(n);
          }}
        />
        <span className="field-unit">{unit}</span>
      </span>
    </label>
  );
}
