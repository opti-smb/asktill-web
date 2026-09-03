import { useState, type ReactNode } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ShieldCheck,
  Bell,
  Zap,
  Clock,
  Trophy,
  Landmark,
  TrendingUp,
  CircleDollarSign,
  Info,
  Gamepad2,
  FileText,
  ShieldX,
} from 'lucide-react';
import {
  RANGE_LABELS,
  buildOverview,
  filterDisputes,
  usdFromCents,
  type ChargebackDispute,
  type RangeKey,
} from './disputeMetrics';

/**
 * Asktill · Chargebacks — customer dispute overview from Stripe.
 * Only-on-win ($20/win) fees are computed from won disputes.
 * Visual tokens aligned with Financials green UI.
 */

const C = {
  paper: '#F4F6F9',
  card: '#FFFFFF',
  ink: '#0F172A',
  sub: '#64748B',
  faint: '#94A3B8',
  border: '#E5EAF2',
  brand: '#2F5BD8',
  brandDeep: '#1E3A8A',
  brandSoft: '#DBEAFE',
  brandTint: '#EFF6FF',
  green: '#0F8A57',
  greenSoft: '#E8F7EF',
  greenTint: '#F3FBF7',
  accent: '#E0891A',
  accentSoft: '#FFF4E5',
  pos: '#0F8A57',
  posSoft: '#E8F7EF',
  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',
  red: '#C43C3C',
  redSoft: '#FDE8E8',
} as const;

const NETC = [C.brandDeep, C.accent, C.green, '#14B8A6'];
const REASON_COLORS = [C.brand, C.green, C.accent, C.purple, C.faint];

export type ChargebacksAppProps = {
  userName?: string | null;
  disputes?: ChargebackDispute[];
  connected?: boolean;
  loading?: boolean;
};

function ShieldHeroArt() {
  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        width: 132,
        height: 120,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 8,
          top: 18,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: C.greenSoft,
          opacity: 0.9,
          transform: 'rotate(12deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 4,
          bottom: 14,
          width: 42,
          height: 28,
          borderRadius: 8,
          background: '#BBF7D0',
          opacity: 0.85,
          transform: 'rotate(-8deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 72,
          height: 84,
          borderRadius: '36px 36px 28px 28px',
          background: `linear-gradient(160deg, ${C.green} 0%, #0a6b43 100%)`,
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 10px 24px rgba(15, 138, 87, 0.28)',
        }}
      >
        <ShieldCheck size={34} color="#fff" strokeWidth={2.4} />
      </div>
      <span
        style={{
          position: 'absolute',
          top: 8,
          right: 28,
          color: C.green,
          fontSize: 14,
          opacity: 0.7,
        }}
      >
        ✦
      </span>
    </div>
  );
}

export default function ChargebacksApp({
  userName,
  disputes = [],
  connected = false,
  loading = false,
}: ChargebacksAppProps) {
  const [range, setRange] = useState<RangeKey>('6m');
  const [scope, setScope] = useState<'all' | 'asktill'>('all');
  const greet = userName?.trim() || 'there';
  const rows = filterDisputes(disputes, range, scope);
  const stats = buildOverview(rows);
  const currency = rows.find((r) => r.currency)?.currency || 'usd';
  const usd = (cents: number) => usdFromCents(cents, currency);
  const pct = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)}%`);
  const empty = !loading && rows.length === 0;

  return (
    <div
      style={{
        background: C.paper,
        color: C.ink,
        fontFamily: 'var(--font-sans)',
        width: '100%',
      }}
    >
      <style>{`
        .cb-mono { font-variant-numeric: tabular-nums; font-family: var(--font-sans); letter-spacing: -0.02em; }
        .cb-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px; }
        .cb-pulse { animation: cbPulse 2s ease-in-out infinite; }
        @keyframes cbPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @media (prefers-reduced-motion: reduce){ .cb-pulse{animation:none} }
        .cb-cols { display:grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap:10px; align-items:start; }
        .cb-charts2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        @media (max-width: 940px){ .cb-cols{grid-template-columns:repeat(2,1fr)} .cb-charts2{grid-template-columns:1fr} }
        @media (max-width: 520px){ .cb-cols{grid-template-columns:1fr} }
      `}</style>

      <div style={{ padding: '4px 0 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, color: C.sub, marginRight: 'auto' }}>
            Good morning, {greet}
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: C.ink,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
              <option key={key} value={key}>
                {RANGE_LABELS[key]}
              </option>
            ))}
          </select>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: C.card,
              border: `1px solid ${C.border}`,
              display: 'grid',
              placeItems: 'center',
              color: C.sub,
            }}
          >
            <Bell size={16} />
          </div>
        </div>

        {/* Hero */}
        <div
          className="cb-card"
          style={{
            padding: '18px 20px',
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            background: C.card,
          }}
        >
          <div style={{ minWidth: 200, flex: '1 1 220px' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 650,
                color: C.sub,
                marginBottom: 6,
              }}
            >
              Recovered for you · {RANGE_LABELS[range]}
            </div>
            <div className="cb-mono" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: C.brand }}>
              {loading ? '…' : usd(stats.recoveredCents)}
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.4 }}>
              across <span className="cb-mono" style={{ fontWeight: 750, color: C.ink }}>{stats.wonCount}</span> won
              disputes · you paid{' '}
              <span className="cb-mono" style={{ fontWeight: 750, color: C.ink }}>{usd(stats.winFeesCents)}</span> in win fees
            </div>
          </div>

          <div style={{ minWidth: 180, flex: '0 1 200px' }}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>Net kept in your pocket</div>
            <div className="cb-mono" style={{ fontSize: 32, fontWeight: 800, color: C.green, lineHeight: 1 }}>
              {loading ? '…' : usd(stats.netCents)}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                marginTop: 8,
                fontSize: 11,
                fontWeight: 750,
                color: C.green,
                background: C.greenSoft,
                padding: '4px 10px',
                borderRadius: 99,
              }}
            >
              <TrendingUp size={13} />{' '}
              {stats.feeMultiple == null ? 'No win fees yet' : `${stats.feeMultiple.toFixed(1)}× return on fees`}
            </div>
          </div>

          <ShieldHeroArt />
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            {(
              [
                { k: 'all' as const, l: 'All disputes' },
                { k: 'asktill' as const, l: 'Fought by AskTill' },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setScope(t.k)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  background: scope === t.k ? C.green : 'transparent',
                  color: scope === t.k ? '#fff' : C.sub,
                }}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px',
              borderRadius: 999,
              background: C.greenSoft,
              border: `1px solid #cfeedd`,
              fontSize: 12,
              color: C.green,
              fontWeight: 700,
            }}
          >
            <ShieldCheck size={14} />
            Protection active · $20 per win only
          </div>
        </div>

        {/* Metrics */}
        <div className="cb-cols" style={{ marginBottom: 10 }}>
          <Metric
            icon={<Gamepad2 size={15} />}
            label="Active disputes"
            value={loading ? '…' : String(stats.activeCount)}
            sub={`${usd(stats.activeCents)} in play`}
            tint={C.brand}
            soft={C.brandTint}
          />
          <Metric
            icon={<Zap size={15} />}
            label="Evidence submitted"
            value={loading ? '…' : String(stats.evidenceCount)}
            sub={`${usd(stats.evidenceCents)} contested`}
            tint={C.green}
            soft={C.greenSoft}
          />
          <Metric
            icon={<Landmark size={15} />}
            label="Under review"
            value={loading ? '…' : String(stats.reviewCount)}
            sub={`${usd(stats.reviewCents)} awaiting`}
            tint={C.accent}
            soft={C.accentSoft}
          />
          <Metric
            icon={<Trophy size={15} />}
            label="Win rate"
            value={loading ? '…' : pct(stats.winRate)}
            sub={stats.valueRecovery == null ? 'No closed disputes yet' : `value recovery ${pct(stats.valueRecovery)}`}
            tint={C.purple}
            soft={C.purpleSoft}
          />
        </div>
        <div className="cb-cols" style={{ marginBottom: 12 }}>
          <Metric
            icon={<FileText size={15} />}
            label="Disputes created"
            value={loading ? '…' : String(stats.createdCount)}
            sub={`${usd(stats.createdCents)} total`}
            tint={C.brand}
            soft={C.brandTint}
          />
          <Metric
            icon={<ShieldX size={15} />}
            label="Auto-declined"
            value="0"
            sub="AskTill has not declined any yet"
            tint={C.red}
            soft={C.redSoft}
          />
          <Metric
            icon={<Clock size={15} />}
            label="Time saved"
            value="—"
            sub="tracked after AskTill files evidence"
            tint={C.brand}
            soft={C.brandTint}
          />
          <Metric
            icon={<CircleDollarSign size={15} />}
            label="You paid"
            value={loading ? '…' : usd(stats.winFeesCents)}
            sub={`${stats.wonCount} wins × $20 · only on wins`}
            tint={C.green}
            soft={C.greenSoft}
          />
        </div>

        <div className="cb-charts2" style={{ marginBottom: 12 }}>
          <Panel title="Win rate trend" note="Win rate vs. value recovery, last 6 months">
            <div style={{ height: 200 }}>
              {empty ? (
                <EmptyChart note={scope === 'asktill' ? 'AskTill has not fought any disputes yet.' : 'No disputes in this period.'} />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.winTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cbG1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.brand} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: C.faint }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="win"
                    stroke={C.brand}
                    strokeWidth={2.5}
                    fill="url(#cbG1)"
                    name="Win rate %"
                  />
                  <Area
                    type="monotone"
                    dataKey="rec"
                    stroke={C.green}
                    strokeWidth={2}
                    fill="none"
                    name="Value recovery %"
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel title="Disputes by month" note="New chargebacks received">
            <div style={{ height: 200 }}>
              {empty ? (
                <EmptyChart note="No chargebacks received in this period." />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byMonth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: C.brandTint }}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}
                  />
                  <Bar dataKey="n" fill={C.brand} radius={[5, 5, 0, 0]} name="Disputes" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </Panel>
        </div>

        <div className="cb-charts2">
          <Panel title="Disputes by reason" note="What customers are disputing">
            <div style={{ paddingTop: 4 }}>
              {stats.byReason.length === 0 ? (
                <EmptyChart note="No dispute reasons yet." />
              ) : (
              stats.byReason.map((r, i) => {
                const max = stats.byReason[0].n;
                return (
                  <div key={r.name} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: C.ink, fontWeight: 650 }}>{r.name}</span>
                      <span className="cb-mono" style={{ color: C.sub, fontWeight: 750 }}>
                        {r.n}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 99,
                        background: '#F1F5F9',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${max ? (r.n / max) * 100 : 0}%`,
                          height: '100%',
                          borderRadius: 99,
                          background: REASON_COLORS[i % REASON_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </Panel>

          <Panel title="Disputes by card network" note="Share of disputes by brand">
            {stats.byNetwork.length === 0 ? (
              <EmptyChart note="No card-network data yet." />
            ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingTop: 4 }}>
              <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byNetwork}
                      dataKey="n"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {stats.byNetwork.map((row, i) => (
                        <Cell key={row.name} fill={NETC[i % NETC.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}
                      formatter={(v) => [`${v}%`, 'Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                {stats.byNetwork.map((n, i) => (
                  <div
                    key={n.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{ width: 10, height: 10, borderRadius: 3, background: NETC[i % NETC.length] }}
                    />
                    <span style={{ color: C.ink, flex: 1, fontWeight: 650 }}>{n.name}</span>
                    <span className="cb-mono" style={{ color: C.sub, fontWeight: 750 }}>
                      {n.n}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </Panel>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
            color: C.faint,
            fontSize: 11,
            marginTop: 14,
          }}
        >
          <Info size={12} />{' '}
          {loading
            ? 'Loading Stripe disputes…'
            : connected
              ? 'Figures from your connected Stripe account. Win fees are $20 only on recovered disputes.'
              : 'Connect Stripe to load live disputes. Win fees are $20 only on recovered disputes.'}
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ note }: { note: string }) {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 120,
        display: 'grid',
        placeItems: 'center',
        color: C.faint,
        fontSize: 12,
        textAlign: 'center',
        padding: 12,
      }}
    >
      {note}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  tint,
  soft,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  tint: string;
  soft: string;
}) {
  return (
    <div className="cb-card" style={{ padding: '12px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: soft,
            color: tint,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 12, color: C.sub, fontWeight: 650 }}>{label}</span>
      </div>
      <div className="cb-mono" style={{ fontSize: 22, fontWeight: 800, color: C.ink, lineHeight: 1.15 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 3, lineHeight: 1.3 }}>{sub}</div>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="cb-card" style={{ padding: '14px 15px' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 750, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{note}</div>
      </div>
      {children}
    </div>
  );
}
