import type { AnalyzeResult, CashFlowUiApi } from '../../lib/analyzeResponse';
import { fmtMoney, reportMatchedDeposits } from '../../lib/analyzeResponse';
import { FONT_SANS } from '../../lib/fonts';
import styles from './ForecastChart.module.css';

interface ForecastChartProps {
  cashFlow?: CashFlowUiApi | null;
  result?: AnalyzeResult | null;
}

function parseUsd(s?: string | null): number | null {
  if (s == null || s === '—') return null;
  const n = Number(String(s).replace(/[$,()\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export default function ForecastChart({ cashFlow, result }: ForecastChartProps) {
  const hasLiveData = Boolean(cashFlow);
  const forecast = cashFlow?.forecast_chart;
  const matchedDeposits = reportMatchedDeposits(result);

  const moneyInNum =
    matchedDeposits ?? parseUsd(cashFlow?.money_in_usd);
  const moneyOutNum = parseUsd(cashFlow?.money_out_usd);
  const avgIn = moneyInNum != null ? moneyInNum / 30 : null;
  const avgOut = moneyOutNum != null ? moneyOutNum / 30 : null;
  const netDaily =
    avgIn != null && avgOut != null ? avgIn - avgOut : null;

  return (
    <section className={styles.chartCard} id="cash-position-chart">
      <div className={styles.chartHead}>
        <div className={styles.chartTitleRow}>
          <h2 className={styles.chartTitle}>
            {forecast?.section_label ?? 'Cash position — next 30 days'}
          </h2>
          <i className={`ti ti-info-circle ${styles.infoIcon}`} aria-hidden title="Projected from your statements" />
        </div>
        <div className={styles.forecastLegend}>
          <span>
            <span className={styles.legendDot} style={{ background: '#334155' }} />
            Actual
          </span>
          <span>
            <span className={styles.legendDot} style={{ background: '#0f8a57' }} />
            Forecast
          </span>
          {forecast?.show_payroll_legend ? (
            <span>
              <span className={styles.legendDot} style={{ background: '#c43c3c' }} />
              Payroll
            </span>
          ) : null}
        </div>
      </div>

      {forecast?.note ? <p className={styles.note}>{forecast.note}</p> : null}

      {forecast?.show_chart ? (
        <svg
          className={styles.svg}
          viewBox="0 0 800 220"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="cfPastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cfFutGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f8a57" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0f8a57" stopOpacity="0" />
            </linearGradient>
          </defs>

          {forecast.y_axis_labels.map((label, index) => (
            <text
              key={`y-${label}`}
              x="0"
              y={(forecast.grid_y[index] ?? 20) + 4}
              fontFamily={FONT_SANS}
              fontSize="10"
              fill="#94A3B8"
            >
              {label}
            </text>
          ))}

          {forecast.grid_y.map((y, index) => (
            <line
              key={`grid-${index}`}
              x1="36"
              y1={y}
              x2="800"
              y2={y}
              stroke="#F1F5F9"
              strokeWidth="1"
            />
          ))}

          {forecast.past_area_path && <path d={forecast.past_area_path} fill="url(#cfPastGrad)" />}
          {forecast.past_line_path && (
            <path d={forecast.past_line_path} fill="none" stroke="#334155" strokeWidth="2.5" />
          )}

          {forecast.future_area_path && <path d={forecast.future_area_path} fill="url(#cfFutGrad)" />}
          {forecast.future_line_path && (
            <path d={forecast.future_line_path} fill="none" stroke="#0f8a57" strokeWidth="2.5" />
          )}

          <line
            x1={forecast.today_x}
            y1={forecast.grid_y[0] ?? 16}
            x2={forecast.today_x}
            y2={208}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={forecast.today_x + 4}
            y="14"
            fontFamily={FONT_SANS}
            fontSize="10"
            fill="#64748b"
            fontWeight="700"
          >
            TODAY
          </text>
          <circle cx={forecast.today_x} cy={forecast.today_y} r="5" fill="#334155" />

          {forecast.payroll_markers?.map((marker, index) => (
            <g key={`pay-${index}`}>
              <circle cx={marker.x} cy={marker.y} r="6" fill="#c43c3c" />
              <text
                x={marker.x}
                y={marker.y - 10}
                textAnchor="middle"
                fontFamily={FONT_SANS}
                fontSize="9"
                fill="#c43c3c"
                fontWeight="700"
              >
                {marker.label}
              </text>
            </g>
          ))}

          {forecast.x_labels.map((item) => (
            <text
              key={`${item.x}-${item.label}`}
              x={item.x}
              y="215"
              textAnchor="middle"
              fontFamily={FONT_SANS}
              fontSize="9"
              fill={item.bold ? '#0f8a57' : '#94A3B8'}
              fontWeight={item.bold ? 700 : 400}
            >
              {item.label}
            </text>
          ))}

          <circle cx={forecast.end_x} cy={forecast.end_y} r="5" fill="#0f8a57" />
          <text
            x={forecast.end_x - 12}
            y={forecast.end_y - 10}
            textAnchor="end"
            fontFamily={FONT_SANS}
            fontSize="11"
            fill="#0f8a57"
            fontWeight="700"
          >
            {forecast.end_forecast_usd}
          </text>
        </svg>
      ) : (
        <p className={styles.emptyChart}>
          {hasLiveData
            ? 'Upload a bank statement to see your 30-day cash-on-hand projection.'
            : 'Upload a bank statement to see cash-on-hand projection.'}
        </p>
      )}

      <div className={styles.statBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Avg daily inflow</span>
          <span className={`${styles.statValue} ${styles.statPos}`}>
            {avgIn != null ? fmtMoney(avgIn) : '—'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Avg daily outflow</span>
          <span className={`${styles.statValue} ${styles.statNeg}`}>
            {avgOut != null ? fmtMoney(avgOut) : '—'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Net daily change</span>
          <span
            className={`${styles.statValue} ${
              netDaily == null ? '' : netDaily >= 0 ? styles.statPos : styles.statNeg
            }`}
          >
            {netDaily == null
              ? '—'
              : `${netDaily >= 0 ? '+' : ''}${fmtMoney(netDaily)}`}
          </span>
        </div>
      </div>
    </section>
  );
}
