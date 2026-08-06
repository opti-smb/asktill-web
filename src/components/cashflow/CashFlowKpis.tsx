import { Link } from 'react-router-dom';
import type { AnalyzeResult, CashFlowUiApi, KpiCardApi } from '../../lib/analyzeResponse';
import { fmtMoney, reportMatchedDeposits } from '../../lib/analyzeResponse';
import styles from './CashFlowKpis.module.css';

type Props = {
  cashFlow?: CashFlowUiApi | null;
  result?: AnalyzeResult | null;
  kpis?: KpiCardApi[] | null;
};

function findRunway(kpis?: KpiCardApi[] | null): KpiCardApi | null {
  if (!kpis?.length) return null;
  return (
    kpis.find((k) => k.id === 'days_of_runway' || /runway/i.test(k.label)) ??
    kpis.find((k) => /day/i.test(k.label) && /run|cash/i.test(k.label)) ??
    null
  );
}

function runwayTone(value: string | undefined, note?: string | null): 'ok' | 'warn' | 'bad' {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isNaN(n)) {
    if (n < 20) return 'bad';
    if (n < 40) return 'warn';
  }
  if (note && /attention|low|risk|below/i.test(note)) return 'warn';
  return 'ok';
}

export default function CashFlowKpis({ cashFlow, result, kpis }: Props) {
  const matched = reportMatchedDeposits(result);
  const balance = cashFlow?.cash_on_hand_usd ?? cashFlow?.bank_balance_usd ?? '—';
  const balanceMeta =
    cashFlow?.hero_meta_label ??
    (cashFlow?.period_label ? `As of ${cashFlow.period_label}` : 'Closing bank balance');
  const matchedUsd = matched != null ? fmtMoney(matched) : cashFlow?.net_to_bank_usd ?? '—';
  const matchedOk = matched != null || Boolean(cashFlow?.net_to_bank_usd);
  const forecastEnd = cashFlow?.forecast_chart?.end_forecast_usd ?? '—';
  const runway = findRunway(kpis);
  const runwayValue = runway?.formatted_value ?? '—';
  const runwayNote = runway?.helper_text ?? runway?.footnote ?? runway?.comparison_note ?? null;
  const runwayNoteShort =
    runwayNote && runwayNote.length > 110 ? `${runwayNote.slice(0, 107).trimEnd()}…` : runwayNote;
  const tone = runwayTone(runwayValue, runwayNote);

  return (
    <div className={styles.grid}>
      <article className={styles.card}>
        <div className={styles.label}>Bank Balance</div>
        <div className={styles.value}>{balance}</div>
        <p className={styles.meta}>{balanceMeta}</p>
        <Link to="/dashboard/at-ledger/overview" className={styles.footerLink}>
          View details →
        </Link>
      </article>

      <article className={styles.card}>
        <div className={styles.label}>Matched Deposits</div>
        <div className={`${styles.value} ${styles.valuePos}`}>{matchedUsd}</div>
        <span className={`${styles.badge} ${matchedOk ? styles.badgeOk : styles.badgeMuted}`}>
          {matchedOk ? (
            <>
              <i className="ti ti-check" aria-hidden /> 100% matched
            </>
          ) : (
            'Awaiting match'
          )}
        </span>
      </article>

      <article className={styles.card}>
        <div className={styles.label}>Cash Runway</div>
        <div
          className={`${styles.value} ${
            tone === 'warn' ? styles.valueWarn : tone === 'bad' ? styles.valueBad : styles.valuePos
          }`}
        >
          {runwayValue}
        </div>
        <span
          className={`${styles.badge} ${
            tone === 'warn' || tone === 'bad' ? styles.badgeWarn : styles.badgeOk
          }`}
        >
          {tone === 'ok' ? (
            <>
              <i className="ti ti-check" aria-hidden /> Healthy
            </>
          ) : (
            <>
              <i className="ti ti-alert-triangle" aria-hidden /> Needs attention
            </>
          )}
        </span>
        {runwayNoteShort ? <p className={styles.meta}>{runwayNoteShort}</p> : null}
      </article>

      <article className={styles.card}>
        <div className={styles.label}>Projected End Balance</div>
        <div className={styles.value}>{forecastEnd}</div>
        <p className={styles.meta}>
          {cashFlow?.forecast_chart?.section_label ?? '30-day forecast'}
        </p>
        <a className={styles.footerLink} href="#cash-position-chart">
          See full forecast →
        </a>
      </article>
    </div>
  );
}
