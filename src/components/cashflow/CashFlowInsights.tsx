import type { AnalyzeResult, CashFlowUiApi } from '../../lib/analyzeResponse';
import { fmtMoney, reportMatchedDeposits } from '../../lib/analyzeResponse';
import styles from './CashFlowInsights.module.css';

type Props = {
  cashFlow?: CashFlowUiApi | null;
  result?: AnalyzeResult | null;
};

type AffectItem = {
  tone: 'ok' | 'warn' | 'bad';
  title: string;
  meta: string;
};

function parseUsd(s?: string | null): number | null {
  if (s == null || s === '—') return null;
  const n = Number(String(s).replace(/[$,()\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export default function CashFlowInsights({ cashFlow, result }: Props) {
  const matched = reportMatchedDeposits(result);
  const topIn = cashFlow?.inflows?.[0];
  const topOut = cashFlow?.outflows?.[0];
  const inTrend = cashFlow?.money_in_trend;
  const outTrend = cashFlow?.money_out_trend;
  const guidance = cashFlow?.guidance;

  const items: AffectItem[] = [];

  if (topIn) {
    const up = inTrend?.prior_delta_type === 'up' || !inTrend?.prior_delta_type;
    items.push({
      tone: 'ok',
      title: `Strong ${topIn.label} this month`,
      meta: topIn.value_usd + (inTrend?.prior_delta ? ` · ${inTrend.prior_delta}` : ''),
    });
    void up;
  } else if (matched != null) {
    items.push({
      tone: 'ok',
      title: 'Matched deposits landed',
      meta: fmtMoney(matched),
    });
  }

  if (topOut) {
    const rising = outTrend?.prior_delta_type === 'up' || outTrend?.prior_delta_type === 'down'
      ? outTrend.prior_delta_type === 'up'
      : false;
    items.push({
      tone: rising ? 'warn' : 'ok',
      title: rising ? `${topOut.label} higher than last month` : `${topOut.label} is your largest outflow`,
      meta: topOut.value_usd + (outTrend?.prior_delta ? ` · ${outTrend.prior_delta}` : ''),
    });
  }

  const pending = parseUsd(cashFlow?.pending_settlements_usd);
  if (pending != null && pending > 0) {
    items.push({
      tone: 'warn',
      title: 'Pending settlements',
      meta: cashFlow?.pending_settlements_usd ?? fmtMoney(pending),
    });
  } else if (items.length < 3) {
    items.push({
      tone: 'ok',
      title: 'No large unmatched cash gap flagged',
      meta: 'Good',
    });
  }

  const insightText =
    guidance?.answer?.trim() ||
    guidance?.headline?.trim() ||
    'Your cash position is based on uploaded statements. Keep an eye on daily outflows versus inflows over the next 30 days.';

  return (
    <div className={styles.row}>
      <section className={styles.card}>
        <h3 className={styles.title}>What&apos;s affecting your cash</h3>
        <ul className={styles.list}>
          {items.slice(0, 3).map((item) => (
            <li key={item.title}>
              <span
                className={`${styles.icon} ${
                  item.tone === 'ok'
                    ? styles.iconOk
                    : item.tone === 'warn'
                      ? styles.iconWarn
                      : styles.iconBad
                }`}
                aria-hidden
              >
                <i
                  className={
                    item.tone === 'ok' ? 'ti ti-circle-check' : 'ti ti-alert-triangle'
                  }
                />
              </span>
              <div className={styles.copy}>
                <div className={styles.itemTitle}>{item.title}</div>
                <div className={styles.itemMeta}>{item.meta}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${styles.card} ${styles.aiCard}`}>
        <div className={styles.aiHead}>
          <span className={styles.aiIcon} aria-hidden>
            <i className="ti ti-sparkles" />
          </span>
          <h3 className={styles.title}>AI cash insight</h3>
        </div>
        {guidance?.question ? <p className={styles.aiQ}>{guidance.question}</p> : null}
        <p className={styles.aiBody}>{insightText}</p>
        <a className={styles.aiLink} href="/dashboard/calculators">
          See recommendations →
        </a>
      </section>
    </div>
  );
}
