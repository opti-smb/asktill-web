import type { CashFlowMonthBarApi, CashFlowMonthTrendApi } from '../../lib/analyzeResponse';
import { FONT_SANS } from '../../lib/fonts';
import styles from './InflowOutflow.module.css';

interface MonthTrendChartProps {
  trend?: CashFlowMonthTrendApi | null;
  avgLineY?: number;
}

const CHART_WIDTH = 360;
const CHART_HEIGHT = 88;
const MONTH_LABEL_Y = 80;

function barCenterX(bar: CashFlowMonthBarApi): number {
  return bar.x + bar.width / 2;
}

function computeAvgLineY(bars: CashFlowMonthBarApi[]): number {
  if (!bars.length) return 36;
  const maxAmount = Math.max(...bars.map((b) => b.amount));
  if (maxAmount <= 0) return 36;
  const avgAmount = bars.reduce((sum, b) => sum + b.amount, 0) / bars.length;
  const baseline = 72;
  const topPad = 28;
  const plotHeight = baseline - topPad;
  const height = Math.max(8, (avgAmount / maxAmount) * plotHeight);
  return baseline - height;
}

export default function MonthTrendChart({ trend, avgLineY }: MonthTrendChartProps) {
  if (!trend?.bars?.length) {
    return null;
  }

  const bars = trend.bars;
  const lineY = avgLineY ?? computeAvgLineY(bars);

  return (
    <div className={styles.monthBars}>
      <div className={styles.monthBarsLabel}>{trend.section_label}</div>
      {trend.note && <p className={styles.sectionNote}>{trend.note}</p>}
      <div
        className={`${styles.monthBarChart} ${
          trend.show_avg_line && trend.avg_usd ? styles.monthBarChartWithAvg : ''
        }`}
      >
        <div className={styles.monthBarPlot}>
          <div className={styles.monthBarValues} aria-hidden={false}>
            {bars.map((bar) => (
              <span
                key={`${bar.label}-value`}
                className={styles.monthBarValue}
                style={{ left: `${(barCenterX(bar) / CHART_WIDTH) * 100}%` }}
              >
                {bar.value_usd}
              </span>
            ))}
          </div>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className={styles.monthBarSvg}
          >
          {bars.map((bar) => (
            <rect
              key={`${bar.label}-rect`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={bar.rx}
              fill={bar.fill}
            />
          ))}
          {trend.show_avg_line && trend.avg_usd ? (
            <line
              x1="20"
              y1={lineY}
              x2="240"
              y2={lineY}
              stroke="#B45309"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          ) : null}
          {bars.map((bar) => (
            <text
              key={`${bar.label}-month`}
              x={barCenterX(bar)}
              y={MONTH_LABEL_Y}
              textAnchor="middle"
              fontFamily={FONT_SANS}
              fontSize="10"
              fill={bar.text_fill}
              fontWeight="700"
            >
              {bar.label}
            </text>
          ))}
          </svg>
        </div>
        {trend.show_avg_line && trend.avg_usd ? (
          <aside className={styles.monthBarAvgColumn} aria-label={`${trend.avg_label ?? 'Average'} ${trend.avg_usd}`}>
            <span className={styles.monthBarAvgLabel}>{trend.avg_label ?? 'Avg'}</span>
            <span className={styles.monthBarAvgAmount}>{trend.avg_usd}</span>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
