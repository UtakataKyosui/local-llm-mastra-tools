import { useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';

export interface MultiSelectOption {
  value: string;
  label?: string;
  description?: string;
  group?: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  // Shows the selection order on each chip, for lists where order matters.
  ordered?: boolean;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = '選択してください',
  emptyMessage = '候補がありません',
  ordered = false,
}: MultiSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const labelOf = (v: string) => options.find((option) => option.value === v)?.label ?? v;
  const q = query.trim().toLowerCase();
  const filtered = options.filter((option) =>
    [option.value, option.label, option.description, option.group].some((text) => text?.toLowerCase().includes(q)),
  );
  const highlighted = Math.min(activeIndex, filtered.length - 1);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    setQuery('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return setOpen(true);
      if (filtered.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((highlighted + step + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && filtered[highlighted]) toggle(filtered[highlighted].value);
      else setOpen(true);
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = (event: FocusEvent) => {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1" onBlur={handleBlur}>
      <label htmlFor={`${id}-input`} className="text-xs text-[var(--sea-ink-soft)]">
        {label}
      </label>
      <div
        className="flex min-h-[2.5rem] cursor-text flex-wrap items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {value.map((v, i) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] py-0.5 pr-1 pl-2 text-xs text-[var(--sea-ink)]"
          >
            {ordered && <span className="text-[var(--sea-ink-soft)]">{i + 1}.</span>}
            {labelOf(v)}
            <button
              type="button"
              aria-label={`${labelOf(v)} を外す`}
              className="rounded-full px-1 leading-none text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
              onClick={(e) => {
                e.stopPropagation();
                toggle(v);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered.length > 0 ? `${id}-option-${highlighted}` : undefined}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-[var(--sea-ink)] outline-none"
          placeholder={value.length === 0 ? placeholder : ''}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-full left-0 z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-1 shadow-lg"
        >
          {filtered.length === 0 && <li className="px-3 py-1.5 text-sm text-[var(--sea-ink-soft)]">{emptyMessage}</li>}
          {filtered.map((option, i) => {
            const selected = value.includes(option.value);
            return (
              <li
                key={option.value}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => toggle(option.value)}
                className={`flex cursor-pointer items-baseline gap-2 rounded-lg px-3 py-1.5 text-sm text-[var(--sea-ink)] ${
                  i === highlighted ? 'bg-[var(--link-bg-hover)]' : ''
                }`}
              >
                <span aria-hidden="true" className="w-4 shrink-0 text-[var(--lagoon-deep)]">
                  {selected ? '✓' : ''}
                </span>
                <span className="font-medium">{option.label ?? option.value}</span>
                {option.group && <span className="text-xs text-[var(--sea-ink-soft)]">{option.group}</span>}
                {option.description && (
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--sea-ink-soft)]">{option.description}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
