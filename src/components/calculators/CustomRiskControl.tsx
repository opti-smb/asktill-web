import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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

export default function CustomRiskControl({ calculatorId, compact }: Props) {
  const { prefs, setThreshold, resetThreshold, isCustom } = useRiskThresholds();
  const base = RISK_THRESHOLDS[calculatorId];
  const canCustomize = CUSTOMIZABLE_RISK_IDS.includes(calculatorId) && Boolean(base);
  const [open, setOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);

  const custom = isCustom(calculatorId);
  const [highRisk, setHighRisk] = useState('');
  const [lowRisk, setLowRisk] = useState('');

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // Load drafts when opening so users can edit again anytime after Save.
  useEffect(() => {
    if (!open || !base) return;
    const row = prefsRef.current[calculatorId];
    setHighRisk(String(row?.highRisk ?? base.highRisk));
    setLowRisk(String(row?.lowRisk ?? base.lowRisk));
    setError(null);
  }, [open, base, calculatorId]);

  useLayoutEffect(() => {
    if (!open || !chipRef.current) {
      setPopPos(null);
      return;
    }
    const place = () => {
      const r = chipRef.current!.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, r.right - POP_WIDTH),
        window.innerWidth - POP_WIDTH - 8,
      );
      const below = r.bottom + 6;
      const above = r.top - POP_EST_HEIGHT - 6;
      const fitsBelow = below + POP_EST_HEIGHT <= window.innerHeight - 8;
      const top = fitsBelow ? below : Math.max(8, above);
      setPopPos({ top, left });
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
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Defer so the opening click does not immediately close.
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
    }, 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!savedFlash) return;
    const t = window.setTimeout(() => setSavedFlash(false), 1600);
    return () => window.clearTimeout(t);
  }, [savedFlash]);

  if (!canCustomize || !base) return null;

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
    setSavedFlash(true);
    // Stay open so users can tweak again immediately.
  };

  const popover =
    open && popPos
      ? createPortal(
          <div
            ref={popRef}
            className={styles.pop}
            id={labelId}
            role="dialog"
            aria-label={`Custom risk for ${base.metricLabel}`}
            style={{ top: popPos.top, left: popPos.left }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
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
                      setSavedFlash(false);
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
                      setSavedFlash(false);
                    }}
                  />
                  <span>{base.unit}</span>
                </span>
              </label>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            {savedFlash ? <p className={styles.saved}>Saved — change again anytime</p> : null}
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
                  setSavedFlash(true);
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
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={chipRef}
        type="button"
        className={`${styles.chip} ${custom ? styles.chipCustom : ''} ${open ? styles.chipOpen : ''}`}
        aria-expanded={open}
        aria-controls={labelId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        Custom risk
        {custom ? <span className={styles.dot} aria-hidden /> : null}
      </button>
      {popover}
    </div>
  );
}
