import { useState } from 'react';
import { assetGroups, type PriceData } from '../lib/prices';
import { haptic } from '../lib/sdk';
import { Sheet } from './Sheet';

interface SingleProps {
  mode: 'single';
  data: PriceData;
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

interface MultiProps {
  mode: 'multi';
  data: PriceData;
  selected: string[];
  /** 목록에서 빼는 자산(예: 지금 보고 있는 자산) */
  exclude?: string;
  max: number;
  onDone: (ids: string[]) => void;
  onClose: () => void;
}

type Props = SingleProps | MultiProps;

export function AssetPicker(props: Props) {
  const [draft, setDraft] = useState<string[]>(props.mode === 'multi' ? props.selected : []);
  const exclude = props.mode === 'multi' ? props.exclude : undefined;

  const isOn = (id: string) => (props.mode === 'single' ? props.selected === id : draft.includes(id));
  const toggle = (id: string) => {
    void haptic('tap');
    if (props.mode === 'single') {
      props.onSelect(id);
      return;
    }
    setDraft((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= props.max) return prev;
      return [...prev, id];
    });
  };

  const full = props.mode === 'multi' && draft.length >= props.max;

  return (
    <Sheet
      title={props.mode === 'single' ? '어떤 자산에 넣었다면' : `비교할 자산 (최대 ${props.max}개)`}
      onClose={props.onClose}
      footer={
        props.mode === 'multi' ? (
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              void haptic(draft.length > 0 ? 'success' : 'tap');
              props.onDone(draft);
            }}
          >
            {draft.length === 0 ? '선택 없이 닫기' : `${draft.length}개 비교하기`}
          </button>
        ) : undefined
      }
    >
      {assetGroups(props.data).map((group) => {
        const items = props.data.assets.filter((a) => a.group === group && a.id !== exclude);
        if (items.length === 0) return null;
        return (
          <div key={group} className="asset-group">
            <span className="field-label">{group}</span>
            <div className="asset-chips" role="group" aria-label={group}>
              {items.map((a) => {
                const on = isOn(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={on ? 'chip chip-on' : 'chip'}
                    aria-pressed={on}
                    disabled={!on && full}
                    onClick={() => toggle(a.id)}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}
