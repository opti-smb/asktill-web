import type { ReactNode } from 'react';
import type { StandardInsight } from '../../lib/analyzeResponse';
import styles from './StandardQuestions.module.css';

interface StandardQuestionsProps {
  insights?: StandardInsight[];
  hasLiveAnalysis?: boolean;
}

type CardView = {
  key: string;
  tag: string;
  question: string;
  headline: string;
  highlight: string;
  highlightLabel?: string;
  payrollVerdict?: boolean;
  highlightClass: 'up' | 'down';
  answer: ReactNode;
  warn: boolean;
};

const MOCK_CARDS: CardView[] = [
  {
    key: 'best_day',
    tag: 'Best day',
    question: '"When did the till do its best work?"',
    headline: 'Mar 16',
    highlight: '$3,835',
    highlightClass: 'up',
    answer: (
      <>
        Saturday. <strong>+48% vs typical Saturday.</strong> Walk-ins after 2pm.
      </>
    ),
    warn: false,
  },
  {
    key: 'cash_runway',
    tag: 'Cash runway',
    question: '"Can I cover Friday\'s payroll?"',
    headline: "Can't tell yet",
    highlight: '$27,341',
    highlightClass: 'up',
    answer: (
      <>
        Upload bank, POS, and e-commerce files, then analyze to see cash on hand and payroll debits
        from your statement.
      </>
    ),
    warn: false,
  },
  {
    key: 'anomaly',
    tag: 'Anomaly',
    question: '"Anything weird this month?"',
    headline: '1 alert',
    highlight: '$35 fee',
    highlightClass: 'down',
    answer: (
      <>
        <strong>Example:</strong> Unusual fee or timing on the bank statement.
      </>
    ),
    warn: true,
  },
];

const SLOT_ORDER: Array<{ id: string; tag: string }> = [
  { id: 'best_day', tag: 'Best day' },
  { id: 'cash_runway', tag: 'Cash runway' },
  { id: 'anomaly', tag: 'Anomaly' },
];

function mapInsight(insight: StandardInsight): CardView {
  const isPayroll = insight.id === 'cash_runway';
  const payrollVerdict =
    isPayroll && (insight.headline === 'Yes' || insight.headline === 'No')
      ? insight.headline === 'Yes'
      : undefined;
  return {
    key: insight.id || insight.tag,
    tag: insight.tag,
    question: insight.question ? `"${insight.question.replace(/^"|"$/g, '')}"` : '',
    headline: insight.headline,
    highlight: insight.highlight_value ?? '—',
    highlightLabel: insight.highlight_label ?? undefined,
    payrollVerdict,
    highlightClass: insight.severity === 'warn' ? 'down' : 'up',
    answer: insight.answer ? <>{insight.answer}</> : '—',
    warn: insight.severity === 'warn',
  };
}

function cardsFromInsights(insights: StandardInsight[]): CardView[] {
  const used = new Set<string>();
  const ordered: CardView[] = [];

  for (const slot of SLOT_ORDER) {
    const insight = insights.find(
      (item) =>
        item.id === slot.id ||
        item.tag === slot.tag ||
        (item.id?.startsWith(slot.id) ?? false),
    );
    if (!insight || used.has(insight.id)) continue;
    used.add(insight.id);
    ordered.push(mapInsight(insight));
  }

  for (const insight of insights) {
    if (used.has(insight.id)) continue;
    used.add(insight.id);
    ordered.push(mapInsight(insight));
  }

  return ordered;
}

export default function StandardQuestions({ insights, hasLiveAnalysis = false }: StandardQuestionsProps) {
  const useMock = !hasLiveAnalysis && !insights?.length;
  const cards = useMock ? MOCK_CARDS : cardsFromInsights(insights ?? []);

  return (
    <div className={styles.standardGrid}>
      {cards.map((card) => (
        <div
          key={card.key}
          className={styles.standardCard}
          style={card.warn ? { borderLeftColor: 'var(--warn)' } : undefined}
        >
          <div
            className={styles.standardTag}
            style={card.warn ? { color: 'var(--warn)' } : undefined}
          >
            {card.tag}
          </div>
          <div className={styles.standardQ}>{card.question}</div>
          {card.payrollVerdict !== undefined ? (
            <div className={styles.payrollVerdict}>
              <span
                className={`${styles.payrollYesNo} ${card.payrollVerdict ? styles.payrollYes : styles.payrollNo}`}
              >
                {card.headline}
              </span>
              {card.highlight && card.highlight !== '—' ? (
                <div className={styles.payrollAmountBlock}>
                  <span className={styles.payrollAmount}>{card.highlight}</span>
                  {card.highlightLabel ? (
                    <span className={styles.payrollAmountLabel}>{card.highlightLabel}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <span className={styles.bigNum} style={card.warn ? { color: 'var(--warn)' } : undefined}>
              {card.headline}
              {card.highlight && card.highlight !== '—' ? (
                <span className={`${styles.bigNumDelta} ${styles[card.highlightClass]}`}>
                  {card.highlight}
                </span>
              ) : null}
            </span>
          )}
          <div className={styles.standardAnswer}>{card.answer}</div>
        </div>
      ))}
    </div>
  );
}
