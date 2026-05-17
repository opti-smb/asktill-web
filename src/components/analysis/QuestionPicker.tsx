import { useState } from 'react';
import { pickerQuestions } from '../../data/questions';
import styles from './QuestionPicker.module.css';

export default function QuestionPicker() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['q1']));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  }

  const isExpanded = (id: string) => selected.has(id);

  return (
    <>
      <div className={styles.pickerIntro}>
        <div className={styles.pickerIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
        </div>
        <div className={styles.pickerText}>
          We picked these because <strong>other café owners ask them most</strong>. Tap any two to see the answer.
        </div>
        <span className={styles.pickerCounter}>{selected.size} / 2 selected</span>
      </div>

      <div className={styles.pickerGrid}>
        {pickerQuestions.map((q) => {
          const sel = selected.has(q.id);
          const expanded = isExpanded(q.id) && q.answerJsx;
          return (
            <div
              key={q.id}
              className={`${styles.pickerCard} ${sel ? styles.selected : ''} ${expanded ? styles.expanded : ''}`}
              onClick={() => toggle(q.id)}
            >
              <div className={styles.pickerCheck}>
                {sel && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className={styles.pickerContent}>
                <div className={styles.pickerQ}>{q.text}</div>
                {expanded && q.answerJsx && (
                  <div className={styles.pickerAnswer}>
                    <strong>Email made you money. Instagram didn't.</strong>
                    <svg className={styles.pickerChart} viewBox="0 0 400 120" preserveAspectRatio="none">
                      <text x="10" y="20" fontFamily="Inter" fontSize="11" fill="#0B1220" fontWeight="600">Email</text>
                      <rect x="10" y="28" width="280" height="18" fill="#047857" rx="3" />
                      <text x="295" y="41" fontFamily="Inter" fontSize="11" fill="#047857" fontWeight="700">+$2,840 ROI</text>
                      <text x="10" y="62" fontFamily="Inter" fontSize="11" fill="#0B1220" fontWeight="600">Google Ads</text>
                      <rect x="10" y="70" width="140" height="18" fill="#3B82F6" rx="3" />
                      <text x="155" y="83" fontFamily="Inter" fontSize="11" fill="#3B82F6" fontWeight="700">+$680 ROI</text>
                      <text x="10" y="104" fontFamily="Inter" fontSize="11" fill="#0B1220" fontWeight="600">Instagram</text>
                      <rect x="10" y="112" width="50" height="6" fill="#FEE2E2" rx="3" />
                      <text x="65" y="118" fontFamily="Inter" fontSize="11" fill="#B91C1C" fontWeight="700">-$1,800 ROI</text>
                    </svg>
                    <div className={styles.pickerAnswerMeta}>
                      Email: 38 attributable orders averaging $112. Instagram: 4 new customers, 2 repeat.{' '}
                      <a href="#" style={{ color: 'var(--brand-deep)' }}>See attribution method →</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
