import { useEffect, useId, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { RISK_THRESHOLDS, type CalculatorId } from '@asktill/calculators';

import { useRiskThresholds } from '../../context/RiskThresholdContext';
import { CUSTOMIZABLE_RISK_IDS } from '../../lib/riskThresholdPrefs';
import styles from './CustomRiskControl.module.css';

type Props = {
  calculatorId: CalculatorId;
  /** Smaller chip for health rows */
  compact?: boolean;
};

const POP_WIDTH = 228;
const POP_EST_HEIGHT = 220;

function computePopPos(chip: HTMLElement): { top: number; left: number } {
  const r = chip.getBoundingClientRect();
  const left = Math.min(
    Math.max(8, r.right - POP_WIDTH),
    Math.max(8, window.innerWidth - POP_WIDTH - 8),
  );
  const below = r.bottom + 6;
  const above = r.top - POP_EST_HEIGHT - 6;
  const fitsBelow = below + POP_EST_HEIGHT <= window.innerHeight - 8;
  const top = fitsBelow ? below : Math.max(8, above);
  return { top, left };
}

export default function CustomRiskControl({ calculatorId, compact }: Props) {
  const { prefs, setThreshold, resetThreshold, isCustom } = useRiskThresholds();
  const base = RISK_THRESHOLDS[calculatorId];
  const canCustomize = CUSTOMIZABLE_RISK_IDS.includes(calculatorId) && Boolean(base);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideRef = useRef(false);
  const labelId = useId();
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const custom = isCustom(calculatorId);
  const [highRisk, setHighRisk] = useState('');
  const [lowRisk, setLowRisk] = useState('');

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    if (!open || !base) return;
    const row = prefsRef.current[calculatorId];
    setHighRisk(String(row?.highRisk ?? base.highRisk));
    setLowRisk(String(row?.lowRisk ?? base.lowRisk));
    setError(null);
  }, [open, base, calculatorId]);

  useLayoutEffect(() => {
    if (!open || !chipRef.current) return;
    const place = () => {
      if (!chipRef.current) return;
      setPopPos(computePopPos(chipRef.current));
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onOutside = (e: Event) => {
      if (ignoreOutsideRef.current) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (rootRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    // Wait until after the opening pointer/click finishes so we never close immediately.
    const timer = window.setTimeout(() => {
      ignoreOutsideRef.current = false;
      document.addEventListener('pointerdown', onOutside, true);
    }, 0);

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!canCustomize || !base) return null;

  const stopRowClick = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  const openPopover = () => {
    if (chipRef.current) {
      setPopPos(computePopPos(chipRef.current));
    }
    ignoreOutsideRef.current = true;
    setOpen(true);
  };

  const onChipClick = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    openPopover();
  };

  const applySave = () => {
    const high = Number(highRisk);
    const low = Number(lowRisk);
    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      setError('Enter valid numbers.');
      return;
    }
    if (base.direction === 'higher_better' && !(high < low)) {
      setError(`At risk must be less than healthy (${base.unit}).`);
      return;
    }
    if (base.direction === 'lower_better' && !(low < high)) {
      setError(`Healthy must be less than at risk (${base.unit}).`);
      return;
    }
    setThreshold(calculatorId, high, low);
    setError(null);
    setOpen(false);
  };

  const popover = open
    ? createPortal(
        <div
          ref={popRef}
          className={styles.pop}
          id={labelId}
          role="dialog"
          aria-label={`Custom risk for ${base.metricLabel}`}
          style={{ top: popPos.top, left: popPos.left }}
          onClick={stopRowClick}
          onMouseDown={stopRowClick}
          onPointerDown={stopRowClick}
        >
          <div className={styles.popHead}>
            <div className={styles.popTitle}>{base.metricLabel}</div>
            <button
              type="button"
              className={styles.popClose}
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <p className={styles.popHint}>
            AskTill default: {base.highLabel} · {base.lowLabel}
            {custom ? ' · Editing your levels' : ''}
          </p>
          <div className={styles.fields}>
            <label>
              At risk at
              <span className={styles.inputRow}>
                <input
                  type="number"
                  value={highRisk}
                  onChange={(e) => {
                    setHighRisk(e.target.value);
                    setError(null);
                  }}
                />
                <span>{base.unit}</span>
              </span>
            </label>
            <label>
              Healthy beyond
              <span className={styles.inputRow}>
                <input
                  type="number"
                  value={lowRisk}
                  onChange={(e) => {
                    setLowRisk(e.target.value);
                    setError(null);
                  }}
                />
                <span>{base.unit}</span>
              </span>
            </label>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.save} onClick={applySave}>
              {custom ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              className={styles.reset}
              disabled={!custom}
              onClick={() => {
                resetThreshold(calculatorId);
                setHighRisk(String(base.highRisk));
                setLowRisk(String(base.lowRisk));
                setError(null);
                setOpen(false);
              }}
            >
              AskTill default
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      className={`${styles.root} ${compact ? styles.compact : ''}`}
      ref={rootRef}
      onClick={stopRowClick}
      onMouseDown={stopRowClick}
      onPointerDown={stopRowClick}
      onKeyDown={stopRowClick}
    >
      <button
        ref={chipRef}
        type="button"
        className={`${styles.chip} ${custom ? styles.chipCustom : ''} ${open ? styles.chipOpen : ''}`}
        aria-expanded={open}
        aria-controls={labelId}
        onClick={onChipClick}
        onMouseDown={stopRowClick}
        onPointerDown={stopRowClick}
      >
        Custom risk
        {custom ? <span className={styles.dot} aria-hidden /> : null}
      </button>
      {popover}
    </div>
  );
}
