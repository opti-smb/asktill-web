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
  Inbox,
  TrendingUp,
  CircleDollarSign,
  ChevronDown,
  Info,
} from 'lucide-react';

/**
 * Asktill · Chargebacks — customer dispute overview.
 * Only-on-win ($20/win) model. Mock data for prototype.
 * Colors match asktill-web dashboard tokens (brand / accent / muted).
 */

const C = {
  paper: '#F8FAFC', // --bg-soft
  card: '#FFFFFF', // --bg
  ink: '#0B1220', // --ink
  sub: '#64748B', // --muted
  faint: '#94A3B8',
  border: '#E2E8F0', // --rule
  brand: '#1E40AF', // --brand
  brandDeep: '#1E3A8A', // --brand-deep
  brandSoft: '#DBEAFE', // --brand-soft
  brandTint: '#EFF6FF', // --brand-tint
  accent: '#B45309', // --accent
  accentSoft: '#FEF3C7', // --accent-soft
  pos: '#047857', // --pos
  posSoft: '#DCFCE7', // --pos-soft
} as const;

const winTrend = [
  { m: 'Feb', win: 52, rec: 47 },
  { m: 'Mar', win: 55, rec: 50 },
  { m: 'Apr', win: 58, rec: 54 },
  { m: 'May', win: 60, rec: 56 },
  { m: 'Jun', win: 63, rec: 60 },
  { m: 'Jul', win: 61, rec: 58 },
];

const byMonth = [
  { m: 'Feb', n: 12 },
  { m: 'Mar', n: 14 },
  { m: 'Apr', n: 18 },
  { m: 'May', n: 15 },
  { m: 'Jun', n: 16 },
  { m: 'Jul', n: 15 },
];

const byReason = [
  { name: 'Fraud (card not present)', n: 34 },
  { name: 'Product not received', n: 22 },
  { name: 'Not as described', n: 16 },
  { name: 'Subscription canceled', n: 12 },
  { name: 'Duplicate charge', n: 6 },
];

const byNetwork = [
  { name: 'Visa', n: 58 },
  { name: 'Mastercard', n: 30 },
  { name: 'Amex', n: 8 },
  { name: 'Discover', n: 4 },
];

const NETC = [C.brand, C.accent, C.pos, C.faint];

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

export type ChargebacksAppProps = {
  /** Greeting name shown under the title. */
  userName?: string | null;
};

export default function ChargebacksApp({ userName }: ChargebacksAppProps) {
  const [range] = useState('Last 6 months');
  const [scope, setScope] = useState<'all' | 'asktill'>('asktill');
  const greet = userName?.trim() || 'there';

  return (
    <div
      style={{
        background: C.paper,
        color: C.ink,
        fontFamily: 'var(--font-sans)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .cb-mono { font-variant-numeric: tabular-nums; font-family: var(--font-sans); letter-spacing: -0.02em; }
        .cb-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px; }
        .cb-pulse { animation: cbPulse 2s ease-in-out infinite; }
        @keyframes cbPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @media (prefers-reduced-motion: reduce){ .cb-pulse{animation:none} }
        .cb-cols { display:grid; grid-template-columns: repeat(4,1fr); gap:14px; }
        .cb-charts2 { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 940px){ .cb-cols{grid-template-columns:repeat(2,1fr)} .cb-charts2{grid-template-columns:1fr} }
        @media (max-width: 520px){ .cb-cols{grid-template-columns:1fr} }
      `}</style>

      <div style={{ padding: '18px 18px 22px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Chargebacks</div>
            <div style={{ fontSize: 13.5, color: C.sub, marginTop: 2 }}>
              Good morning, {greet} — here&apos;s what the engine has been doing.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                color: C.sub,
              }}
            >
              <Clock size={14} /> {range} <ChevronDown size={14} color={C.faint} />
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
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
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 3,
            }}
          >
            {(
              [
                { k: 'all' as const, l: 'All disputes' },
                { k: 'asktill' as const, l: 'Fought by Asktill' },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setScope(t.k)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  background: scope === t.k ? C.brand : 'transparent',
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
              padding: '8px 12px',
              borderRadius: 10,
              background: C.brandTint,
              border: `1px solid ${C.border}`,
              fontSize: 12,
              color: C.brandDeep,
              fontWeight: 600,
            }}
          >
            <span
              className="cb-pulse"
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: '#3B82F6',
                display: 'inline-block',
              }}
            />
            Protection active · $20 per win only
          </div>
        </div>

        <div
          className="cb-card"
          style={{
            padding: '22px 24px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 18,
            borderColor: `${C.accent}66`,
            background: `linear-gradient(180deg, ${C.accentSoft} 0%, ${C.card} 60%)`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.accent,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                marginBottom: 6,
              }}
            >
              Recovered for you · YTD
            </div>
            <div className="cb-mono" style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, color: C.brandDeep }}>
              {usd(18240)}
            </div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 8 }}>
              across <span className="cb-mono" style={{ fontWeight: 700, color: C.ink }}>47</span> won
              disputes · you paid{' '}
              <span className="cb-mono" style={{ fontWeight: 700, color: C.ink }}>$940</span> in win fees
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 180 }}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>Net kept in your pocket</div>
            <div className="cb-mono" style={{ fontSize: 30, fontWeight: 800, color: C.brand }}>
              {usd(17300)}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                marginTop: 8,
                fontSize: 12,
                fontWeight: 700,
                color: C.brand,
                background: C.brandTint,
                padding: '4px 10px',
                borderRadius: 99,
              }}
            >
              <TrendingUp size={13} /> 19.4× return on fees
            </div>
          </div>
        </div>

        <div className="cb-cols" style={{ marginBottom: 16 }}>
          <Metric
            icon={<Inbox size={15} />}
            label="Active disputes"
            value="12"
            sub={`${usd(3180)} in play`}
            tint={C.brand}
            soft={C.brandTint}
          />
          <Metric
            icon={<Zap size={15} />}
            label="Evidence submitted"
            value="8"
            sub={`${usd(2090)} contested`}
            tint={C.sub}
            soft="#E9EFEC"
          />
          <Metric
            icon={<Landmark size={15} />}
            label="Under review"
            value="9"
            sub={`${usd(2460)} awaiting`}
            tint={C.accent}
            soft={C.accentSoft}
          />
          <Metric
            icon={<Trophy size={15} />}
            label="Win rate"
            value="61.4%"
            sub="value recovery 58.2%"
            tint={C.brand}
            soft={C.brandTint}
          />
        </div>
        <div className="cb-cols" style={{ marginBottom: 20 }}>
          <Metric
            icon={<Inbox size={15} />}
            label="Disputes created"
            value="90"
            sub={`${usd(24800)} total`}
            tint={C.sub}
            soft="#EDEFEC"
          />
          <Metric
            icon={<ShieldCheck size={15} />}
            label="Auto-declined"
            value="18"
            sub="low win odds · $0 charged"
            tint={C.faint}
            soft="#EDEFEC"
          />
          <Metric
            icon={<Clock size={15} />}
            label="Time saved"
            value="142h"
            sub="of manual filing"
            tint={C.sub}
            soft="#E9EFEC"
          />
          <Metric
            icon={<CircleDollarSign size={15} />}
            label="You paid"
            value="$940"
            sub="47 wins × $20 · only on wins"
            tint={C.accent}
            soft={C.accentSoft}
          />
        </div>

        <div className="cb-charts2" style={{ marginBottom: 14 }}>
          <Panel title="Win rate trend" note="Win rate vs. value recovery, last 6 months">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={winTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cbG1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.brand} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 12, fill: C.faint }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: C.faint }}
                    axisLine={false}
                    tickLine={false}
                    domain={[40, 70]}
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
                    stroke={C.accent}
                    strokeWidth={2}
                    fill="none"
                    name="Value recovery %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Disputes by month" note="New chargebacks received">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={C.border} vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 12, fill: C.faint }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: C.faint }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: C.brandTint }}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}
                  />
                  <Bar dataKey="n" fill={C.brand} radius={[5, 5, 0, 0]} name="Disputes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="cb-charts2">
          <Panel title="Disputes by reason" note="What customers are disputing">
            <div style={{ paddingTop: 6 }}>
              {byReason.map((r, i) => {
                const max = byReason[0].n;
                return (
                  <div key={r.name} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: C.ink }}>{r.name}</span>
                      <span className="cb-mono" style={{ color: C.sub, fontWeight: 600 }}>
                        {r.n}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: '#EEF1EE',
                        borderRadius: 99,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${(r.n / max) * 100}%`,
                          height: '100%',
                          borderRadius: 99,
                          background: i === 0 ? C.brand : i === 1 ? C.accent : C.sub,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Disputes by card network" note="Where disputes originate">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 200 }}>
              <div style={{ width: '55%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byNetwork}
                      dataKey="n"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {byNetwork.map((_, i) => (
                        <Cell key={byNetwork[i].name} fill={NETC[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                {byNetwork.map((n, i) => (
                  <div
                    key={n.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12.5,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{ width: 10, height: 10, borderRadius: 3, background: NETC[i] }}
                    />
                    <span style={{ color: C.ink, flex: 1 }}>{n.name}</span>
                    <span className="cb-mono" style={{ color: C.sub, fontWeight: 600 }}>
                      {n.n}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
            color: C.faint,
            fontSize: 11.5,
            marginTop: 18,
          }}
        >
          <Info size={12} /> Prototype · mock data. Fees charged solely on recovered disputes ($20 /
          win).
        </div>
      </div>
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
    <div className="cb-card" style={{ padding: '14px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: soft,
            color: tint,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>{label}</span>
      </div>
      <div className="cb-mono" style={{ fontSize: 25, fontWeight: 800, color: C.ink }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>{sub}</div>
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
    <div className="cb-card" style={{ padding: '15px 17px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>{note}</div>
      </div>
      {children}
    </div>
  );
}
