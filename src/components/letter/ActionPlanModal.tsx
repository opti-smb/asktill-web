import { useCallback, useEffect, useState } from 'react';

import {
  fetchActionPlans,
  saveActionPlans,
  type ActionPlanItem,
  type ClosedPriorityItem,
} from '../../lib/api';
import { ASKTILL_MARK_SRC } from '../common/Logo';
import styles from './ActionPlanModal.module.css';

const SLOT_COUNT = 5;

type Props = {
  open: boolean;
  onClose: () => void;
};

function emptyPlans(): ActionPlanItem[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => ({
    slot: i + 1,
    text: '',
    writtenAt: null,
    openAt: null,
    closeAt: null,
    closed: false,
  }));
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Popup to capture up to 5 AT Letter action plans + recently closed priorities. */
export default function ActionPlanModal({ open, onClose }: Props) {
  const [plans, setPlans] = useState<ActionPlanItem[]>(emptyPlans);
  const [closedItems, setClosedItems] = useState<ClosedPriorityItem[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActionPlans();
      const bySlot = new Map(data.plans.map((p) => [p.slot, p]));
      setPlans(
        Array.from({ length: SLOT_COUNT }, (_, i) => {
          const slot = i + 1;
          const p = bySlot.get(slot);
          return (
            p ?? {
              slot,
              text: '',
              writtenAt: null,
              openAt: null,
              closeAt: null,
              closed: false,
            }
          );
        }),
      );
      setClosedItems(data.closedItems ?? []);
    } catch {
      setPlans(emptyPlans());
      setClosedItems([]);
      setError('Could not load your action plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setShowClosed(false);
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  const updateText = (slot: number, text: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.slot === slot
          ? { ...p, text, closed: text.trim() ? p.closed : false }
          : p,
      ),
    );
  };

  const toggleClosed = (slot: number, closed: boolean) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.slot !== slot) return p;
        if (closed && !p.text.trim()) return p;
        return { ...p, closed };
      }),
    );
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await saveActionPlans(
        plans.map((p) => ({
          slot: p.slot,
          text: p.text,
          closed: Boolean(p.closed && p.text.trim()),
        })),
      );
      setPlans(data.plans);
      setClosedItems(data.closedItems ?? []);
      onClose();
    } catch {
      setError('Could not save action plans. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <span className={styles.brandMark} aria-hidden>
            <img
              src={ASKTILL_MARK_SRC}
              alt=""
              className={styles.brandSvg}
              draggable={false}
            />
          </span>
          <div className={styles.headerCopy}>
            <h2 id="action-plan-title" className={styles.title}>
              Your action plan
            </h2>
            <p className={styles.sub}>
              Open date on write <span className={styles.subDot}>•</span> Close when done
            </p>
          </div>
        </header>

        {loading ? (
          <p className={styles.status}>Loading…</p>
        ) : (
          <>
            <div className={styles.colHead} aria-hidden="true">
              <span />
              <span className={styles.colAction}>Action</span>
              <span className={styles.colOpen}>Open</span>
              <span className={styles.colClosed}>Closed</span>
              <span className={styles.colDone}>Done</span>
            </div>

            <div className={styles.list}>
              {plans.map((plan) => {
                const openLabel = formatDate(plan.openAt ?? plan.writtenAt);
                const closeLabel = plan.closed ? formatDate(plan.closeAt) : '';
                return (
                  <div key={plan.slot} className={styles.row}>
                    <span className={styles.slotLabel}>{plan.slot}</span>
                    <input
                      className={styles.input}
                      type="text"
                      maxLength={500}
                      value={plan.text}
                      placeholder={`Action ${plan.slot}…`}
                      disabled={saving}
                      onChange={(e) => updateText(plan.slot, e.target.value)}
                      aria-label={`Action ${plan.slot}`}
                    />
                    <span
                      className={`${styles.dateBadge} ${styles.dateOpen} ${
                        openLabel ? '' : styles.dateEmpty
                      }`}
                      title={openLabel ? `Opened ${openLabel}` : undefined}
                    >
                      {openLabel ? (
                        <>
                          <i className="ti ti-calendar-event" aria-hidden />
                          {openLabel}
                        </>
                      ) : (
                        '–'
                      )}
                    </span>
                    <span
                      className={`${styles.dateBadge} ${styles.dateClosed} ${
                        closeLabel ? '' : styles.dateEmpty
                      }`}
                      title={closeLabel ? `Closed ${closeLabel}` : undefined}
                    >
                      {closeLabel ? (
                        <>
                          <i className="ti ti-calendar-event" aria-hidden />
                          {closeLabel}
                        </>
                      ) : (
                        '–'
                      )}
                    </span>
                    <label className={styles.checkWrap}>
                      <input
                        className={styles.checkInput}
                        type="checkbox"
                        checked={Boolean(plan.closed)}
                        disabled={saving || !plan.text.trim()}
                        onChange={(e) => toggleClosed(plan.slot, e.target.checked)}
                        aria-label={`Mark action ${plan.slot} done`}
                      />
                      <span className={styles.checkBox} aria-hidden>
                        <i className="ti ti-check" />
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className={styles.closedBlock}>
              <span className={styles.closedIcon} aria-hidden>
                <i className="ti ti-star" />
              </span>
              <div className={styles.closedCopy}>
                <div className={styles.closedTitle}>Top closed priorities</div>
                {showClosed && closedItems.length > 0 ? null : (
                  <p className={styles.closedEmpty}>
                    Resolved Critical/Watch items from your letter will show here.
                  </p>
                )}
              </div>
              <button
                type="button"
                className={styles.viewClosedBtn}
                disabled={loading}
                onClick={() => setShowClosed((v) => !v)}
              >
                <i className="ti ti-filter" aria-hidden />
                {showClosed ? 'Hide closed' : 'View closed'}
              </button>
            </div>

            {showClosed ? (
              closedItems.length === 0 ? (
                <p className={styles.closedListEmpty}>No closed priorities yet.</p>
              ) : (
                <ul className={styles.closedList}>
                  {closedItems.slice(0, 5).map((item) => (
                    <li key={item.key} className={styles.closedRow}>
                      <span
                        className={`${styles.toneDot} ${
                          item.tone === 'red' ? styles.toneRed : styles.toneAmber
                        }`}
                        aria-hidden="true"
                      />
                      <span className={styles.closedName}>{item.title}</span>
                      <span className={styles.closedWhen}>{formatDate(item.closedAt) || '–'}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </>
        )}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={saving || loading}
            onClick={() => void onSave()}
          >
            <i className="ti ti-device-floppy" aria-hidden />
            {saving ? 'Saving…' : 'Save plans'}
          </button>
        </div>
      </div>
    </div>
  );
}
