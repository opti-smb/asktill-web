import type { CashFlowUiApi } from '../../lib/analyzeResponse';
import styles from './ForecastChart.module.css';

interface ForecastChartProps {
  cashFlow?: CashFlowUiApi | null;
}

export default function ForecastChart({ cashFlow }: ForecastChartProps) {
  const period = cashFlow?.period_label ?? 'Today';
  const hasLiveData = Boolean(cashFlow);
  const useSample = false;
  const forecast = cashFlow?.forecast_chart;
  const cashOnHand = hasLiveData ? (cashFlow?.cash_on_hand_usd ?? '—') : useSample ? '$27,341' : '—';

  return (
    <div className={styles.heroCard}>
      <div className={styles.heroNow}>
        <div className={styles.heroLabel}>{cashFlow?.hero_label ?? 'Bank balance'} · {period}</div>
        <div className={styles.heroAmount}>{cashOnHand}</div>
        <div className={styles.heroMeta}>
          {hasLiveData ? (
            cashFlow?.hero_delta ? (
              <>
                <span className={`${styles.pill} ${styles[cashFlow.hero_delta_type === 'down' ? 'down' : cashFlow.hero_delta_type === 'up' ? 'up' : 'flat']}`}>
                  {cashFlow.hero_delta}
                </span>
                {cashFlow.hero_prev_label && (
                  <span className={styles.heroMetaText}>{cashFlow.hero_prev_label}</span>
                )}
              </>
            ) : (
              <span className={styles.heroMetaText}>
                {cashFlow?.hero_meta_label ?? 'Closing balance on bank statement'}
              </span>
            )
          ) : useSample ? (
            <>
              <span className={`${styles.pill} ${styles.up}`}>▲ $3,205</span>
              <span className={styles.heroMetaText}>vs Feb close</span>
            </>
          ) : (
            <span className={styles.heroMetaText}>Run analyze after upload</span>
          )}
        </div>
        <div className={styles.hero3mo}>
          {hasLiveData ? (
            <>
              {cashFlow?.cash_sales_usd && (
                <div>
                  <strong>In-store cash {cashFlow.cash_sales_usd}</strong>
                  {cashFlow.cash_sales_note && (
                    <>
                      {' · '}
                      <span className={styles.pos}>{cashFlow.cash_sales_note}</span>
                    </>
                  )}
                </div>
              )}
              {cashFlow?.net_to_bank_usd && (
                <div>
                  <strong>Net processor deposits {cashFlow.net_to_bank_usd}</strong>
                  {' · '}
                  <span className={styles.pos}>Card and online payouts to bank</span>
                </div>
              )}
              {cashFlow?.hero_avg_label && (
                <div>
                  {cashFlow.hero_avg_label}
                  {cashFlow.hero_avg_note ? (
                    <>
                      {' · '}
                      <span className={styles[cashFlow.hero_avg_note_type === 'neg' ? 'neg' : cashFlow.hero_avg_note_type === 'pos' ? 'pos' : '']}>
                        {cashFlow.hero_avg_note}
                      </span>
                    </>
                  ) : null}
                </div>
              )}
              {!cashFlow?.cash_sales_usd && !cashFlow?.net_to_bank_usd && !cashFlow?.hero_avg_label && cashFlow?.hero_trend_footnote && (
                <span>{cashFlow.hero_trend_footnote}</span>
              )}
            </>
          ) : useSample ? (
            <>
              3-mo avg <strong>$23,950</strong> · trending{' '}
              <span className={styles.pos}>+14% above norm</span>
            </>
          ) : null}
        </div>
      </div>

      {forecast?.show_chart ? (
        <div className={styles.heroForecast}>
          <div className={styles.forecastLabel}>
            <div className={styles.forecastTitle}>{forecast.section_label}</div>
            <div className={styles.forecastLegend}>
              <span><span className={styles.legendDot} style={{ background: 'var(--ink)' }} />Past</span>
              <span><span className={styles.legendDot} style={{ background: 'var(--brand)' }} />Forecast</span>
              {forecast.show_payroll_legend && (
                <span><span className={styles.legendDot} style={{ background: 'var(--neg)' }} />Payroll</span>
              )}
            </div>
          </div>
          {forecast.note && (
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>{forecast.note}</p>
          )}
          <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 150 }}>
            <defs>
              <linearGradient id="pastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0B1220" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0B1220" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="futGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {forecast.y_axis_labels.map((label, index) => (
              <text key={`y-${label}`} x="0" y={(forecast.grid_y[index] ?? 20) + 4} fontFamily="Inter" fontSize="10" fill="#94A3B8">
                {label}
              </text>
            ))}

            {forecast.grid_y.map((y, index) => (
              <line key={`grid-${index}`} x1="30" y1={y} x2="800" y2={y} stroke="#F1F5F9" strokeWidth="1" />
            ))}

            {forecast.past_area_path && <path d={forecast.past_area_path} fill="url(#pastGrad)" />}
            {forecast.past_line_path && (
              <path d={forecast.past_line_path} fill="none" stroke="#0B1220" strokeWidth="2.5" />
            )}

            {forecast.future_area_path && <path d={forecast.future_area_path} fill="url(#futGrad)" />}
            {forecast.future_line_path && (
              <path d={forecast.future_line_path} fill="none" stroke="#1E40AF" strokeWidth="2.5" />
            )}

            <line
              x1={forecast.today_x}
              y1={forecast.grid_y[0] ?? 16}
              x2={forecast.today_x}
              y2={208}
              stroke="#1E40AF"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x={forecast.today_x + 2} y="14" fontFamily="Inter" fontSize="10" fill="#1E40AF" fontWeight="700">
              TODAY
            </text>
            <circle cx={forecast.today_x} cy={forecast.today_y} r="5" fill="#1E40AF" />

            {forecast.payroll_markers?.map((marker, index) => (
              <g key={`pay-${index}`}>
                <circle cx={marker.x} cy={marker.y} r="6" fill="#B91C1C" />
                <text x={marker.x} y={marker.y - 10} textAnchor="middle" fontFamily="Inter" fontSize="9" fill="#B91C1C" fontWeight="700">
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
                fontFamily="Inter"
                fontSize="9"
                fill={item.bold ? '#1E40AF' : '#94A3B8'}
                fontWeight={item.bold ? 700 : 400}
              >
                {item.label}
              </text>
            ))}

            <circle cx={forecast.end_x} cy={forecast.end_y} r="5" fill="#1E40AF" />
            <text x={forecast.end_x - 20} y={forecast.end_y - 10} textAnchor="end" fontFamily="Inter" fontSize="11" fill="#1E40AF" fontWeight="700">
              {forecast.end_forecast_usd}
            </text>
          </svg>
        </div>
      ) : (
        <div className={styles.heroForecast}>
          <div className={styles.forecastLabel}>
            <div className={styles.forecastTitle}>Next 30 days · projected</div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            {hasLiveData
              ? 'Upload a bank statement to see your 30-day cash-on-hand projection.'
              : 'Upload a bank statement to see cash-on-hand projection.'}
          </p>
        </div>
      )}
    </div>
  );
}
