import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import {
  filterUsStates,
  findUsState,
  stateDisplayLabel,
  type UsStateOption,
} from '../../lib/usaBetaLocation';
import styles from './BusinessStateSelect.module.css';

type Props = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  name?: string;
};

export default function BusinessStateSelect({
  value,
  onChange,
  disabled = false,
  name = 'location',
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = findUsState(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => (open ? filterUsStates(query) : []), [open, query]);
  const showSuggestions = open && query.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function pick(state: UsStateOption) {
    onChange(state.value);
    setQuery('');
    setOpen(false);
  }

  function onInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    if (value) onChange('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const hit = matches[activeIndex];
      if (hit) pick(hit);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  const shown =
    open && query.length > 0 ? query : selected ? stateDisplayLabel(selected) : query;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input type="hidden" name={name} value={value} />
      <input
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex].value}` : undefined}
        autoComplete="off"
        placeholder="Start typing a state"
        value={shown}
        disabled={disabled}
        onFocus={(e) => {
          if (disabled) return;
          setOpen(true);
          setQuery('');
          e.currentTarget.select();
        }}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {showSuggestions && !disabled ? (
        <ul className={styles.list} id={listId} role="listbox">
          {matches.length === 0 ? (
            <li className={styles.empty}>No matching state</li>
          ) : (
            matches.map((state, index) => (
              <li
                id={`${listId}-${state.value}`}
                key={state.value}
                role="option"
                aria-selected={state.value === value || index === activeIndex}
                className={index === activeIndex ? styles.optionActive : styles.option}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(state);
                }}
              >
                {state.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
