interface Option<T> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function Chips<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === value ? 'chip chip-on' : 'chip'}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
