import { useMemo, useState } from 'react';
import {
  RISK_THRESHOLDS,
  type CalculatorId,
} from '@asktill/calculators';

import { useRiskThresholds } from '../../context/RiskThresholdContext';
import { CUSTOMIZABLE_RISK_IDS } from '../../lib/riskThresholdPrefs';
import styles from './RiskThresholdSettings.module.css';

type Draft = { highRisk: string; lowRisk: string };

function draftsFromPrefs(
  prefs: ReturnType<typeof useRiskThresholds>['prefs'],
): Partial<Record<CalculatorId, Draft>> {
  const out: Partial<Record<CalculatorId, Draft>> = {};
  for (const id of CUSTOMIZABLE_RISK_IDS) {
    const base = RISK_THRESHOLDS[id]!;
    const custom = prefs[id];
    out[id] = {
      highRisk: String(custom?.highRisk ?? base.highRisk),
      lowRisk: String(custom?.lowRisk ?? base.lowRisk),
    };
  }
  return out;
}

export default function RiskThresholdSettings() {
  const { prefs, setThreshold, resetThreshold, resetAll, isCustom, customCount } =
    useRiskThresholds();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState(() => draftsFromPrefs(prefs));

  const toggle = () => {
    if (!open) setDrafts(draftsFromPrefs(prefs));
    setOpen((v) => !v);
  };

  const rows = useMemo(
    () =>
      CUSTOMIZABLE_RISK_IDS.map((id) => {
        const base = RISK_THRESHOLDS[id]!;
        return { id, base };
      }),
    [],
  );

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={toggle}
        aria-expanded={open}
      >
        Set my risk levels
        {customCount > 0 ? (
          <span className={styles.badge}>{customCount} custom</span>
        ) : (
          <span className={styles.badgeMuted}>AskTill defaults</span>
        )}
        <span className={styles.chevron} aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open ? (
        <div className={styles.inline} role="region" aria-label="Custom risk levels">
          <p className={styles.hint}>
            Keep AskTill defaults, or set your own (e.g. runway At risk at 45 days instead of 30).
          </p>
          <div className={styles.legend}>
            <span>
              <i className={styles.dotRed} /> At risk
            </span>
            <span>
              <i className={styles.dotGreen} /> Healthy
            </span>
          </div>

          <ul className={styles.list}>
            {rows.map(({ id, base }) => {
              const draft = drafts[id] ?? {
                highRisk: String(base.highRisk),
                lowRisk: String(base.lowRisk),
              };
              const custom = isCustom(id);
              return (
                <li key={id} className={styles.row}>
                  <div className={styles.rowHead}>
                    <div>
                      <div className={styles.metric}>{base.metricLabel}</div>
                      <div className={styles.default}>
                        Default: {base.highLabel} / {base.lowLabel}
                      </div>
                    </div>
                    {custom ? (
                      <span className={styles.customPill}>Yours</span>
                    ) : (
                      <span className={styles.defaultPill}>Default</span>
                    )}
                  </div>
                  <div className={styles.fields}>
                    <label>
                      At risk at
                      <span className={styles.inputWrap}>
                        <input
                          type="number"
                          value={draft.highRisk}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [id]: { ...draft, highRisk: e.target.value },
                            }))
                          }
                        />
                        <span className={styles.unit}>{base.unit}</span>
                      </span>
                    </label>
                    <label>
                      Healthy beyond
                      <span className={styles.inputWrap}>
                        <input
                          type="number"
                          value={draft.lowRisk}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [id]: { ...draft, lowRisk: e.target.value },
                            }))
                          }
                        />
                        <span className={styles.unit}>{base.unit}</span>
                      </span>
                    </label>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.save}
                      onClick={() => {
                        const high = Number(draft.highRisk);
                        const low = Number(draft.lowRisk);
                        if (!Number.isFinite(high) || !Number.isFinite(low)) return;
                        if (base.direction === 'higher_better' && !(high < low)) return;
                        if (base.direction === 'lower_better' && !(low < high)) return;
                        setThreshold(id, high, low);
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.reset}
                      disabled={!custom}
                      onClick={() => {
                        resetThreshold(id);
                        setDrafts((d) => ({
                          ...d,
                          [id]: {
                            highRisk: String(base.highRisk),
                            lowRisk: String(base.lowRisk),
                          },
                        }));
                      }}
                    >
                      AskTill default
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.resetAll}
              disabled={customCount === 0}
              onClick={() => {
                resetAll();
                setDrafts(draftsFromPrefs({}));
              }}
            >
              Reset all to defaults
            </button>
            <button type="button" className={styles.done} onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
