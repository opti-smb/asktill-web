import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, BarChart3, Check, ChevronRight, Circle, CircleAlert, Gift, Headphones, Leaf, ShoppingCart, Star, UserRound, Users } from 'lucide-react';
import { getToken } from '../lib/api';
import styles from './CustomersPage.module.css';


type Segment =
  | 'CHAMPION'
  | 'LOYAL'
  | 'GROWTH'
  | 'AT_RISK'
  | 'HIGH_FRICTION'
  | 'OCCASIONAL'
  | 'NEW_UNKNOWN';

type CustomerRow = {
  customerId: string;
  displayName: string;
  email: string;
  segment: Segment;
  segmentLabel: string;
  segmentConfidence: number | null;
  limitedData: boolean;
  valueScore: number | null;
  relationshipScore: number | null;
  frictionScore: number | null;
  coverageScore: number;
  lifetimeValueMinor: number;
  currency: string;
  orderCount: number;
  averageOrderValueMinor?: number;
  refundCount?: number;
  disputeCount?: number;
  customerSince?: string | null;
  recommendations?: Recommendation[];
  lastPurchaseAt?: string | null;
  daysSinceLastOrder?: number | null;
  openRecommendationCount: number;
  why: string;
  linkedProviders?: string[];
  orderRefs?: string[];
};

type ScoreComponent = {
  name: string;
  rawValue: number | string | null;
  normalizedValue: number | null;
  weight: number;
};

type Activity = { at: string; type: string; detail: string; amountMinor: number; currency: string };
type MonthPoint = { month: string; orderCount: number; revenueMinor: number };

type CustomerProfile = CustomerRow & {
  averageOrderValueMinor: number;
  refundCount: number;
  disputeCount: number;
  failedPaymentCount: number;
  customerSince?: string | null;
  dataCoverage: { score: number; note: string; domains: Record<string, 'CONNECTED' | 'MISSING' | 'LIMITED'> };
  value: { score: number | null; components: ScoreComponent[] };
  relationship: { score: number | null; components: ScoreComponent[] };
  friction: { score: number | null; components: ScoreComponent[] };
  activity: Activity[];
  monthly: MonthPoint[];
  recommendations: Recommendation[];
};

type Recommendation = {
  recommendationId: string;
  customerId: string;
  displayName?: string;
  recommendationType?: string;
  title: string;
  detail: string;
  objective?: string;
  cta?: string;
  eligibility?: string;
  priority: string;
  status: string;
  merchantReason?: string;
};

type SegmentRule = {
  segment: Segment;
  label: string;
  criteria: string;
  action: string;
  count: number;
  share: number | null;
  revenueMinor: number;
};

type MonthTotal = { month: string } & Partial<Record<Segment, number>>;

type Directory = {
  customerCount: number;
  customers: CustomerRow[];
  segments: SegmentRule[];
  opportunities: Record<string, CustomerRow[]>;
  monthly: MonthTotal[];
  policyVersion: string;
  docOpportunities?: { tone: string; title: string; detail: string }[];
};

type Screen = 'dashboard' | 'profile' | 'rules' | 'actions';

const CHART_SEGMENTS: Segment[] = ['CHAMPION', 'LOYAL', 'GROWTH', 'AT_RISK', 'HIGH_FRICTION', 'OCCASIONAL', 'NEW_UNKNOWN'];

function money(amountMinor: number, currency = 'USD') {
  const amount = (amountMinor || 0) / 100;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
}

function when(value?: string | null) {
  if (!value) return 'No date recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date recorded';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short' });
}

function scoreText(value: number | null | undefined, orderCount?: number) {
  if (value == null) return orderCount != null && orderCount < 2 ? 'Under 2 orders' : 'Not scored';
  return String(Math.round(value));
}

function scoreLine(value: number | null | undefined, orderCount?: number) {
  if (value == null) return scoreText(value, orderCount);
  return `${Math.round(value)} / 100`;
}

function customerTitle(name: string) {
  const trimmed = name.trim();
  if (!trimmed || /#\d+/.test(trimmed) || / order$/i.test(trimmed)) return 'Unknown customer';
  return trimmed;
}

function ago(value?: string | null) {
  if (!value) return 'No purchase recorded';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'No purchase recorded';
  const days = Math.max(0, Math.round((Date.now() - then) / 86400000));
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

async function customerJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()?.trim();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as T & { detail?: string };
  if (!response.ok) throw new Error(body.detail || `Customers request failed (${response.status})`);
  return body;
}

export default function CustomersPage() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [actions, setActions] = useState<Recommendation[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [sideProfile, setSideProfile] = useState<CustomerProfile | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [profileTab, setProfileTab] = useState('Overview');
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('All');
  const [windowKey, setWindowKey] = useState('12');
  const [minCoverage, setMinCoverage] = useState('0');
  const [source, setSource] = useState('All');
  const [recommendationStatus, setRecommendationStatus] = useState('All');
  const [rulesNote, setRulesNote] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const [next, recs] = await Promise.all([
        customerJson<Directory>('/api/v1/customers'),
        customerJson<{ items: Recommendation[] }>('/api/v1/customers/recommendations'),
      ]);
      setDirectory(next);
      setActions(recs.items || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customers could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const selectCustomer = useCallback(async (customerId: string) => {
    setSelectedId(customerId);
    try {
      setSideProfile(await customerJson<CustomerProfile>(`/api/v1/customers/${encodeURIComponent(customerId)}`));
    } catch {
      setSideProfile(null);
    }
  }, []);

  useEffect(() => {
    const first = directory?.customers?.[0]?.customerId;
    if (first && !selectedId) void selectCustomer(first);
  }, [directory, selectedId, selectCustomer]);

  async function openCustomer(customerId: string) {
    try {
      setProfile(await customerJson<CustomerProfile>(`/api/v1/customers/${encodeURIComponent(customerId)}`));
      setProfileTab('Overview');
      setScreen('profile');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This customer could not be opened.');
    }
  }

  function openActions(customerId: string) {
    void openCustomer(customerId).then(() => setScreen('actions'));
  }

  async function decide(recommendationId: string, status: 'ACCEPTED' | 'DISMISSED') {
    const reason = status === 'DISMISSED' ? window.prompt('Why are you dismissing this action? You can leave this blank.') || '' : '';
    try {
      await customerJson(
        `/api/v1/customers/recommendations/${encodeURIComponent(recommendationId)}/${status === 'ACCEPTED' ? 'accept' : 'dismiss'}`,
        { method: 'POST', body: JSON.stringify({ reason }) },
      );
      await loadDirectory();
      if (profile) setProfile(await customerJson<CustomerProfile>(`/api/v1/customers/${encodeURIComponent(profile.customerId)}`));
      if (selectedId) setSideProfile(await customerJson<CustomerProfile>(`/api/v1/customers/${encodeURIComponent(selectedId)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action was not saved.');
    }
  }

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (directory?.customers || []).filter((row) => {
      if (segment !== 'All' && row.segment !== segment) return false;
      if (Number(row.coverageScore) < Number(minCoverage)) return false;
      if (source !== 'All' && !(row.linkedProviders || []).includes(source.toLowerCase())) return false;
      if (recommendationStatus === 'Open' && row.openRecommendationCount < 1) return false;
      if (recommendationStatus === 'None' && row.openRecommendationCount > 0) return false;
      if (windowKey === '12' && row.lastPurchaseAt) {
        const age = Date.now() - new Date(row.lastPurchaseAt).getTime();
        if (age > 366 * 86400000) return false;
      }
      if (!needle) return true;
      const refs = (row.orderRefs || []).join(' ').toLowerCase();
      return row.displayName.toLowerCase().includes(needle) || row.email.toLowerCase().includes(needle) || refs.includes(needle);
    });
  }, [directory, query, segment, minCoverage, source, recommendationStatus, windowKey]);

  return (
    <div className={styles.page}>
      <nav className={styles.screenNav} aria-label="Customer screens">
        {(
          [
            ['dashboard', 'Customers Dashboard'],
            ['profile', 'Customer 360'],
            ['rules', 'Segmentation'],
            ['actions', 'Recommended Actions'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={screen === id ? styles.screenOn : styles.screenTab}
            onClick={() => {
              if (id === 'profile') {
                const target = profile?.customerId || sideProfile?.customerId || rows[0]?.customerId;
                if (target) void openCustomer(target);
                return;
              }
              setScreen(id);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {loading ? <p className={styles.muted}>Loading customers from Shopify, Stripe, and PayPal…</p> : null}
      {!loading && error ? <p className={styles.error}>{error}. The customer list stays hidden until the customer service responds.</p> : null}

      {!loading && !error && screen === 'dashboard' ? (
        <Dashboard
          rows={rows}
          segments={directory?.segments || []}
          customerCount={directory?.customerCount || rows.length}
          opportunities={directory?.opportunities || {}}
          population={directory?.customers || []}
          monthly={directory?.monthly || []}
          currency={rows[0]?.currency || 'USD'}
          query={query}
          segment={segment}
          windowKey={windowKey}
          minCoverage={minCoverage}
          source={source}
          recommendationStatus={recommendationStatus}
          onQuery={setQuery}
          onSegment={setSegment}
          onWindow={setWindowKey}
          onCoverage={setMinCoverage}
          onSource={setSource}
          onRecommendation={setRecommendationStatus}
          onOpen={(id) => void openCustomer(id)}
          onAct={openActions}
          selectedId={selectedId}
          sideProfile={sideProfile}
          onSelect={(id) => void selectCustomer(id)}
          onDecide={(id, status) => void decide(id, status)}
        />
      ) : null}

      {!loading && !error && screen === 'profile' && profile ? (
        <Profile
          profile={profile}
          tab={profileTab}
          onTab={setProfileTab}
          onBack={() => setScreen('dashboard')}
          onDecide={(id, status) => void decide(id, status)}
        />
      ) : null}

      {!loading && !error && screen === 'rules' ? (
        <Rules segments={directory?.segments || []} policy={directory?.policyVersion || ''} note={rulesNote} onEdit={() => setRulesNote(true)} />
      ) : null}

      {!loading && !error && screen === 'actions' ? (
        <ActionScreen
          items={actions}
          name={undefined}
          onDecide={(id, status) => void decide(id, status)}
        />
      ) : null}
    </div>
  );
}

function Dashboard(props: {
  rows: CustomerRow[];
  segments: SegmentRule[];
  customerCount: number;
  opportunities: Record<string, CustomerRow[]>;
  population: CustomerRow[];
  monthly: MonthTotal[];
  currency: string;
  query: string;
  segment: string;
  windowKey: string;
  minCoverage: string;
  source: string;
  recommendationStatus: string;
  onQuery: (value: string) => void;
  onSegment: (value: string) => void;
  onWindow: (value: string) => void;
  onCoverage: (value: string) => void;
  onSource: (value: string) => void;
  onRecommendation: (value: string) => void;
  onOpen: (id: string) => void;
  onAct: (id: string) => void;
  selectedId: string;
  sideProfile: CustomerProfile | null;
  onSelect: (id: string) => void;
  onDecide: (id: string, status: 'ACCEPTED' | 'DISMISSED') => void;
  docOpportunities?: { tone: string; title: string; detail: string }[];
}) {
  const selected = props.rows.find((row) => row.customerId === props.selectedId) || props.rows[0] || null;
  const cards = props.segments.filter((item) =>
    ['CHAMPION', 'LOYAL', 'GROWTH', 'AT_RISK', 'HIGH_FRICTION', 'OCCASIONAL', 'NEW_UNKNOWN'].includes(item.segment),
  );
  const quiet = props.population.filter((row) => (row.daysSinceLastOrder || 0) >= 60 && row.orderCount >= 2);
  const atRisk = props.opportunities.atRisk || [];
  const champions = props.opportunities.loyalty || [];
  const friction = props.opportunities.highFriction || [];
  return (
    <>
      <header className={styles.head}>
        <div>
          <h1>Customers</h1>
          <p>Understand your customers, segment them and take action.</p>
        </div>
        <div className={styles.filters}>
          <select value={props.windowKey} onChange={(event) => props.onWindow(event.target.value)} aria-label="Date window">
            <option value="12">Last 12 months</option>
            <option value="all">All time</option>
          </select>
          <select value={props.segment} onChange={(event) => props.onSegment(event.target.value)} aria-label="Segment">
            <option value="All">All Segments</option>
            {props.segments.map((item) => (
              <option key={item.segment} value={item.segment}>{item.label}</option>
            ))}
          </select>
          <select value={props.minCoverage} onChange={(event) => props.onCoverage(event.target.value)} aria-label="Minimum coverage">
            <option value="0">Any coverage</option>
            <option value="60">Coverage 60% or more</option>
            <option value="100">Full coverage</option>
          </select>
          <select value={props.source} onChange={(event) => props.onSource(event.target.value)} aria-label="Source">
            <option value="All">All sources</option>
            <option value="shopify">Shopify</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
          </select>
          <select value={props.recommendationStatus} onChange={(event) => props.onRecommendation(event.target.value)} aria-label="Recommendation">
            <option value="All">Any recommendation</option>
            <option value="Open">Open recommendation</option>
            <option value="None">No recommendation</option>
          </select>
          <input value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Search customers, email, order…" aria-label="Search customers" />
        </div>
      </header>

      <div className={styles.statRow}>
        <article className={`${styles.stat} ${styles.statTotal}`}>
          <div className={styles.statTop}><span className={styles.statIcon}><Users size={16} /></span><span>Total Customers</span></div>
          <strong>{props.customerCount.toLocaleString()}</strong>
        </article>
        {cards.map((card) => (
          <article key={card.segment} className={`${styles.stat} ${styles[`stat${card.segment}`]}`}>
            <div className={styles.statTop}><span className={styles.statIcon}>{segmentIcon(card.segment)}</span><span>{card.segment === 'CHAMPION' ? 'Champions' : card.label}</span></div>
            <strong>{card.count.toLocaleString()}{card.share == null ? '' : ` (${card.share}%)`}</strong>
          </article>
        ))}
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>Customer Segments</h2>
          <div className={styles.donutWrap}>
            <div className={styles.donut} style={{ background: donut(props.segments) }}>
              <div>
                <strong>{props.customerCount}</strong>
                <span>Customers</span>
              </div>
            </div>
            <ul className={styles.legend}>
              {props.segments.map((item) => (
                <li key={item.segment}>
                  <i style={{ background: color(item.segment) }} />
                  {item.label} {item.share == null ? '0%' : `${item.share}%`} ({item.count.toLocaleString()})
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className={styles.panel}>
          <h2>Revenue by Segment</h2>
          <RevenueChart monthly={props.monthly} currency={props.currency} segments={props.segments} />
        </section>
        <section className={styles.panel}>
          <div className={styles.panelTitle}><h2>Top Opportunities</h2></div>
          {(props.docOpportunities?.length ? props.docOpportunities : [
            { tone: 'risk', title: `${atRisk.length} high-value customers at risk`, detail: `${money(sum(atRisk), props.currency)} recorded value.` },
            { tone: 'quiet', title: `${quiet.length} customers with no purchase in 60 or more days`, detail: 'Counted from the last recorded purchase.' },
            { tone: 'reward', title: `${champions.length} customers eligible for a reward`, detail: 'Champions. The offer waits for your approval.' },
            { tone: 'friction', title: `${friction.length} high-friction customers`, detail: 'Review refunds, disputes, or failed payments before the next order.' },
          ]).map((item) => (
            <Opportunity key={item.title} tone={item.tone} icon={item.tone === 'reward' ? <Star size={14} /> : item.tone === 'friction' ? <CircleAlert size={14} /> : item.tone === 'quiet' ? <AlertTriangle size={14} /> : <Users size={14} />} title={item.title} detail={item.detail} />
          ))}
        </section>
      </div>

      <div className={styles.split}>
        <section className={`${styles.panel} ${styles.listPanel}`}>
          <h2>Customer List ({props.rows.length.toLocaleString()})</h2>
          {props.rows.length === 0 ? (
            <p className={styles.muted}>No customers in this filter. Linked Shopify, Stripe, and PayPal records appear here. Sample customers are not shown.</p>
          ) : (
            <CustomerTable rows={props.rows} selectedId={selected?.customerId || ''} onSelect={props.onSelect} onOpen={props.onOpen} />
          )}
        </section>
        <SideCard row={selected} profile={props.sideProfile} onAct={props.onAct} onDecide={props.onDecide} />
      </div>
    </>
  );
}

function CustomerTable({
  rows,
  selectedId,
  onSelect,
  onOpen,
}: {
  rows: CustomerRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<'name' | 'segment' | 'value' | 'friction' | 'lifetime' | 'orders' | 'last'>('name');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  function toggle(key: typeof sortKey) {
    if (sortKey === key) setSortDir((dir) => (dir === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }
  const sorted = [...rows].sort((a, b) => {
    const pick = (row: CustomerRow) => {
      if (sortKey === 'segment') return row.segmentLabel;
      if (sortKey === 'value') return row.valueScore ?? -1;
      if (sortKey === 'friction') return row.frictionScore ?? -1;
      if (sortKey === 'lifetime') return row.lifetimeValueMinor;
      if (sortKey === 'orders') return row.orderCount;
      if (sortKey === 'last') return row.lastPurchaseAt || '';
      return row.displayName.toLowerCase();
    };
    const left = pick(a);
    const right = pick(b);
    if (left < right) return -1 * sortDir;
    if (left > right) return 1 * sortDir;
    return 0;
  });
  const heading = (key: typeof sortKey, label: string) => (
    <button type="button" className={styles.sortBtn} onClick={() => toggle(key)}>{label}</button>
  );
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{heading('name', 'Customer')}</th>
          <th>{heading('segment', 'Segment')}</th>
          <th>{heading('value', 'Value Score')}</th>
          <th>{heading('friction', 'Friction Score')}</th>
          <th>{heading('lifetime', 'Lifetime Value')}</th>
          <th>{heading('orders', 'Orders')}</th>
          <th>{heading('last', 'Last Purchase')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={row.customerId} className={row.customerId === selectedId ? styles.selectedRow : undefined} onClick={() => onSelect(row.customerId)}>
            <td>
              <div className={styles.who}>
                <Avatar name={customerTitle(row.displayName)} segment={row.segment} />
                <div>
                  <strong>{customerTitle(row.displayName)}</strong>
                  <span>{row.email || 'No email on the payment'}</span>
                  {row.limitedData ? <span>Limited data · {Math.round(row.coverageScore)}% coverage</span> : null}
                </div>
              </div>
            </td>
            <td><b className={`${styles.pill} ${styles[row.segment]}`}>{row.segmentLabel}</b></td>
            <td className={scoreTone('value', row.valueScore)}>{scoreText(row.valueScore, row.orderCount)}</td>
            <td className={scoreTone('friction', row.frictionScore)}>{scoreText(row.frictionScore, row.orderCount)}</td>
            <td>{money(row.lifetimeValueMinor, row.currency)}</td>
            <td>{row.orderCount}</td>
            <td>{ago(row.lastPurchaseAt)}</td>
            <td className={styles.rowActions}>
              <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(row.customerId); }}>View</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SideCard({
  row,
  profile,
  onAct,
  onDecide,
}: {
  row: CustomerRow | null;
  profile: CustomerProfile | null;
  onAct: (id: string) => void;
  onDecide: (id: string, status: 'ACCEPTED' | 'DISMISSED') => void;
}) {
  const [tab, setTab] = useState('Overview');
  if (!row) return <section className={styles.panel}><p className={styles.muted}>No customer in this filter.</p></section>;
  const shown = profile && profile.customerId === row.customerId ? profile : null;
  const activity = (shown?.activity || []).filter((item) => {
    if (tab === 'Orders') return item.type === 'Order';
    if (tab === 'Payments') return item.type === 'Payment';
    if (tab === 'Refunds') return item.type === 'Refund';
    if (tab === 'Disputes') return item.type === 'Dispute';
    return false;
  });
  return (
    <section className={`${styles.panel} ${styles.sideCard}`}>
      <div className={styles.sideHead}>
        <Avatar name={customerTitle(row.displayName)} segment={row.segment} />
        <div className={styles.previewId}>
          <strong>{customerTitle(row.displayName)}</strong>
          <span>{row.email || 'No email on the payment'}</span>
        </div>
      </div>
      <div className={styles.sideActions}>
        <b className={`${styles.pill} ${styles[row.segment]}`}>{row.segmentLabel}</b>
        <button type="button" className={styles.primary} onClick={() => onAct(row.customerId)} disabled={row.openRecommendationCount < 1}>Take Action</button>
      </div>
      <div className={styles.miniTabs}>
        {['Overview', 'Orders', 'Payments', 'Refunds', 'Disputes', 'Communications'].map((item) => (
          <button key={item} type="button" className={tab === item ? styles.miniOn : undefined} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === 'Overview' ? (
        <>
          <div className={styles.miniScores}>
            <span><strong>{scoreLine(row.valueScore, row.orderCount)}</strong>Value Score</span>
            <span><strong>{scoreLine(row.relationshipScore, row.orderCount)}</strong>Relationship Score</span>
            <span><strong>{scoreLine(row.frictionScore, row.orderCount)}</strong>Friction Score</span>
          </div>
          <div className={styles.sideSplit}>
            <div>
              <h3>Key Metrics</h3>
              <ul className={styles.metrics}>
                <li><span>Lifetime Value</span><b>{money(row.lifetimeValueMinor, row.currency)}</b></li>
                <li><span>Total Orders</span><b>{row.orderCount}</b></li>
                <li><span>Average Order Value</span><b>{money(shown?.averageOrderValueMinor ?? row.averageOrderValueMinor ?? 0, row.currency)}</b></li>
                <li><span>Total Refunds</span><b>{shown?.refundCount ?? row.refundCount ?? 0}</b></li>
                <li><span>Total Disputes</span><b>{shown?.disputeCount ?? row.disputeCount ?? 0}</b></li>
                <li><span>First Purchase</span><b>{when(shown?.customerSince || row.customerSince)}</b></li>
                <li><span>Last Purchase</span><b>{ago(row.lastPurchaseAt)}</b></li>
              </ul>
            </div>
            <div>
              <h3>Recommended Actions</h3>
              {(shown?.recommendations || row.recommendations || []).slice(0, 3).map((item) => (
                <article key={item.recommendationId} className={styles.miniAction}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  {item.status === 'OPEN' ? <button type="button" className={item.cta === 'Create Offer' ? styles.primary : styles.outline} onClick={() => onDecide(item.recommendationId, 'ACCEPTED')}>{item.cta || 'Approve'}</button> : <span>{item.status}</span>}
                </article>
              ))}
            </div>
          </div>
        </>
      ) : tab === 'Communications' ? (
        <p className={styles.muted}>No communications are connected for this customer.</p>
      ) : (
        <ActivityTable rows={activity} />
      )}
    </section>
  );
}

function sum(rows: CustomerRow[]) {
  return rows.reduce((total, row) => total + Math.max(0, row.lifetimeValueMinor), 0);
}

function donut(segments: SegmentRule[]) {
  const colored = segments.filter((item) => item.count > 0);
  if (colored.length === 0) return 'conic-gradient(#e6ebf2 0 100%)';
  const total = colored.reduce((count, item) => count + item.count, 0);
  let cursor = 0;
  const stops = colored.map((item) => {
    const start = cursor;
    cursor += (item.count / total) * 100;
    return `${color(item.segment)} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(',')})`;
}

function color(segment: string) {
  const colors: Record<string, string> = {
    CHAMPION: '#16a34a',
    LOYAL: '#7c3aed',
    GROWTH: '#2563eb',
    AT_RISK: '#f59e0b',
    HIGH_FRICTION: '#ef4444',
    OCCASIONAL: '#94a3b8',
    NEW_UNKNOWN: '#0284c7',
  };
  return colors[segment] || '#94a3b8';
}

function scoreTone(kind: 'value' | 'friction', score: number | null) {
  if (score == null) return undefined;
  if (kind === 'value') return score >= 70 ? styles.scoreGood : undefined;
  return score >= 40 ? styles.scoreBad : styles.scoreGood;
}

function RevenueChart({ monthly, currency, segments }: { monthly: MonthTotal[]; currency: string; segments: SegmentRule[] }) {
  const points = monthly.slice(-6);
  const held = new Set(segments.filter((item) => item.count > 0).map((item) => item.segment));
  const active = CHART_SEGMENTS.filter((segment) => held.has(segment) || points.some((point) => (point[segment] || 0) > 0));
  const max = Math.max(1, ...points.flatMap((point) => active.map((segment) => point[segment] || 0)));
  if (points.length === 0 || active.length === 0) {
    return <p className={styles.muted}>No recorded order revenue in this chart yet.</p>;
  }
  return (
    <div className={styles.chartBlock}>
      <svg viewBox="0 0 320 160" className={styles.chart} role="img" aria-label="Revenue by segment">
        {[0, 0.5, 1].map((step) => (
          <line key={step} x1="16" x2="308" y1={140 - step * 120} y2={140 - step * 120} stroke="#e6ebf2" strokeWidth="1" />
        ))}
        {active.map((segment) => {
          const line = points.map((point, index) => {
            const x = 20 + (index * 280) / Math.max(points.length - 1, 1);
            const y = 136 - ((point[segment] || 0) / max) * 116;
            return `${x},${y}`;
          });
          return <polyline key={segment} fill="none" stroke={color(segment)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={line.join(' ')} />;
        })}
      </svg>
      <ul className={styles.chartLegend}>
        {active.map((segment) => (
          <li key={segment}><i style={{ background: color(segment) }} />{segment === 'NEW_UNKNOWN' ? 'New / Unknown' : segment.replace('_', ' ').toLowerCase()}</li>
        ))}
      </ul>
      <div className={styles.monthLabels}>
        {points.map((point) => <span key={point.month}>{monthLabel(point.month)}</span>)}
      </div>
      <p className={styles.muted}>Amounts are recorded order value in {currency}. A payment linked to an order is not added again.</p>
    </div>
  );
}

function segmentIcon(segment: string) {
  if (segment === 'CHAMPION') return <Star size={16} />;
  if (segment === 'LOYAL') return <BarChart3 size={16} />;
  if (segment === 'GROWTH') return <Leaf size={16} />;
  if (segment === 'AT_RISK') return <AlertTriangle size={16} />;
  if (segment === 'HIGH_FRICTION') return <CircleAlert size={16} />;
  if (segment === 'OCCASIONAL') return <Circle size={16} />;
  return <UserRound size={16} />;
}

function Opportunity({ title, detail, tone, icon }: { title: string; detail: string; tone: string; icon: ReactNode }) {
  return (
    <article className={styles.opportunity}>
      <span className={`${styles.oppIcon} ${styles[tone]}`}>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      <ChevronRight size={16} className={styles.chevron} />
    </article>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() || '').join('');
  return letters || '?';
}

function Avatar({ name, segment }: { name: string; segment: string }) {
  return <span className={`${styles.avatar} ${styles[segment]}`} aria-hidden="true">{initials(name)}</span>;
}

function Profile({
  profile,
  tab,
  onTab,
  onBack,
  onDecide,
}: {
  profile: CustomerProfile;
  tab: string;
  onTab: (tab: string) => void;
  onBack: () => void;
  onDecide: (id: string, status: 'ACCEPTED' | 'DISMISSED') => void;
}) {
  const tabs = ['Overview', 'Orders', 'Payments', 'Refunds', 'Disputes', 'Rewards'];
  const activity = profile.activity.filter((row) => {
    if (tab === 'Orders') return row.type === 'Order';
    if (tab === 'Payments') return row.type === 'Payment';
    if (tab === 'Refunds') return row.type === 'Refund';
    if (tab === 'Disputes') return row.type === 'Dispute';
    return row.type === 'Order' || row.type === 'Payment';
  });
  return (
    <section>
      <p className={styles.crumb}>
        <button type="button" onClick={onBack}>Customers</button> <span>/ {customerTitle(profile.displayName)}</span>
      </p>
      <header className={styles.profileTop}>
        <div className={styles.who}>
          <Avatar name={customerTitle(profile.displayName)} segment={profile.segment} />
          <div>
            <h1>{customerTitle(profile.displayName)}</h1>
            <p>{profile.email || 'No email on the payment'}</p>
            <p>Customer since {when(profile.customerSince)}</p>
          </div>
          <b className={`${styles.pill} ${styles[profile.segment]}`}>{profile.segmentLabel}</b>
        </div>
        <div className={styles.tiles}>
          <span><strong>{money(profile.lifetimeValueMinor, profile.currency)}</strong>Lifetime Value</span>
          <span><strong>{profile.orderCount}</strong>Total Orders</span>
          <span><strong>{money(profile.averageOrderValueMinor, profile.currency)}</strong>Average Order Value</span>
          <span><strong>{profile.daysSinceLastOrder ?? 'No order yet'}</strong>Days since last order</span>
        </div>
      </header>
      <div className={styles.profileTabs}>
        {tabs.map((item) => (
          <button key={item} type="button" className={tab === item ? styles.screenOn : styles.screenTab} onClick={() => onTab(item)}>
            {item === 'Orders' ? `Orders (${profile.orderCount})` : item === 'Refunds' ? `Refunds (${profile.refundCount})` : item === 'Disputes' ? `Disputes (${profile.disputeCount})` : item}
          </button>
        ))}
      </div>
      {tab === 'Overview' ? (
        <>
          <div className={styles.profileGrid}>
            <section className={styles.panel}>
              <h2>Customer Scores</h2>
              <div className={styles.gauges}>
                <Gauge label="Value" score={profile.valueScore} orderCount={profile.orderCount} text={profile.valueScore == null ? 'Fewer than 2 completed orders, so this score is not calculated.' : 'Spend, frequency, and recency.'} />
                <Gauge label="Relationship" score={profile.relationshipScore} orderCount={profile.orderCount} text={profile.relationshipScore == null ? 'Fewer than 2 completed orders, so this score is not calculated.' : 'Repeat purchases and payments.'} />
                <Gauge label="Friction" score={profile.frictionScore} orderCount={profile.orderCount} text={profile.frictionScore == null ? 'Fewer than 2 completed orders, so this score is not calculated.' : 'Refunds, disputes, and failed payments.'} />
              </div>
              <details className={styles.explain}>
                <summary>Score components</summary>
                {(['Value', 'Relationship', 'Friction'] as const).map((label) => {
                  const parts = label === 'Value' ? profile.value.components : label === 'Relationship' ? profile.relationship.components : profile.friction.components;
                  return (
                    <p key={label}><b>{label}.</b> {parts.map((part) => `${part.name}${part.normalizedValue == null ? ' (not scored)' : ''}`).join('; ')}</p>
                  );
                })}
              </details>
            </section>
            <section className={styles.panel}>
              <h2>Segment Details</h2>
              <p className={styles.detailRow}><span>Segment</span><b className={styles[profile.segment]}>{profile.segmentLabel}</b></p>
              <p className={styles.detailRow}><span>Confidence</span><b>{profile.segmentConfidence == null ? 'Not scored' : `${Math.round(profile.segmentConfidence)}%`}</b></p>
              <p className={styles.detailRow}><span>Why</span><b>{profile.why}</b></p>
            </section>
            <section className={styles.panel}>
              <h2>Data Coverage</h2>
              <p className={styles.coverageScore}>{Math.round(profile.dataCoverage.score)}%</p>
              <ul className={styles.coverage}>
                {Object.entries(profile.dataCoverage.domains).map(([name, state]) => (
                  <li key={name}>
                    <span className={styles.coverageName}>{state === 'CONNECTED' ? <Check size={14} className={styles.connected} /> : <Circle size={14} />}{name}</span>
                    <em className={state === 'CONNECTED' ? styles.connected : undefined}>{state === 'CONNECTED' ? 'Connected' : 'Not connected'}</em>
                  </li>
                ))}
              </ul>
              <p className={styles.muted}>{profile.dataCoverage.note}</p>
            </section>
          </div>
          <div className={styles.lowerGrid}>
            <section className={styles.panel}>
              <h2>Recent Activity</h2>
              <ActivityTable rows={profile.activity} />
            </section>
            <section className={styles.panel}>
              <h2>Purchase History (Last 12 months)</h2>
              <PurchaseChart monthly={profile.monthly || []} currency={profile.currency} />
            </section>
          </div>
        </>
      ) : null}
      {tab === 'Rewards' ? <ActionScreen items={profile.recommendations} name={profile.displayName} onDecide={onDecide} /> : null}
      {tab !== 'Overview' && tab !== 'Rewards' ? <ActivityTable rows={activity} /> : null}
    </section>
  );
}

function Gauge({ label, score, orderCount, text }: { label: string; score: number | null; orderCount: number; text: string }) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score));
  const ring = label === 'Relationship' ? '#06b6d4' : label === 'Friction' && (score || 0) >= 40 ? '#ef4444' : '#16a34a';
  return (
    <article className={styles.gauge}>
      <div style={{ background: `conic-gradient(${ring} ${value * 3.6}deg, #e6ebf2 0deg)` }}>
        <strong className={score == null ? styles.gaugeNote : undefined}>{scoreText(score, orderCount)}</strong>
      </div>
      <h3>{label}</h3>
      <p>{text}</p>
    </article>
  );
}

function ActivityTable({ rows }: { rows: Activity[] }) {
  if (rows.length === 0) return <p className={styles.muted}>No records on file for this tab.</p>;
  return (
    <div className={styles.activityScroll}>
    <table className={styles.table}>
      <thead>
        <tr><th>Date</th><th>Type</th><th>Details</th><th>Amount</th></tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.type}-${row.at}-${row.detail}-${index}`}>
            <td>{when(row.at)}</td>
            <td>{row.type}</td>
            <td>{row.detail}</td>
            <td>{money(row.amountMinor || 0, row.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function PurchaseChart({ monthly, currency }: { monthly: MonthPoint[]; currency: string }) {
  const points = (monthly || []).slice(-12);
  const max = Math.max(1, ...points.map((point) => point.revenueMinor));
  if (points.every((point) => point.orderCount === 0)) return <p className={styles.muted}>No purchases in the last 12 months.</p>;
  return (
    <div className={styles.bars} aria-label={`Purchase history in ${currency}`}>
      {points.map((point) => (
        <span key={point.month} title={`${point.orderCount} orders, ${money(point.revenueMinor, currency)}`}>
          <i style={{ height: point.revenueMinor > 0 ? `${Math.max(8, (point.revenueMinor / max) * 100)}%` : '0%' }} />
          <b>{point.revenueMinor > 0 ? money(point.revenueMinor, currency) : ''}</b>
          {monthLabel(point.month)}
        </span>
      ))}
    </div>
  );
}

function Rules({ segments, policy, note, onEdit }: { segments: SegmentRule[]; policy: string; note: boolean; onEdit: () => void }) {
  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <div>
          <h1>Segmentation Rules (Default)</h1>
          <p>Customers are automatically classified based on value, loyalty and friction signals.</p>
        </div>
        <button type="button" className={styles.outline} onClick={onEdit}>Edit Rules</button>
      </header>
      {note ? <p className={styles.muted}>These rules are the active policy {policy}. Changing a threshold is an internal approval step. This screen explains the rules. It does not save a new version.</p> : null}
      <table className={`${styles.table} ${styles.rulesTable}`}>
        <thead>
          <tr><th>Segment</th><th>Criteria</th><th>% of Customers</th><th>Typical Action</th></tr>
        </thead>
        <tbody>
          {segments.map((rule) => (
            <tr key={rule.segment}>
              <td><span className={`${styles.ruleName} ${styles[rule.segment]}`}><span className={styles.ruleIcon}>{segmentIcon(rule.segment)}</span>{rule.label}</span></td>
              <td>{rule.criteria}</td>
              <td className={styles.share}>{rule.share == null ? '0%' : `${rule.share}%`}</td>
              <td>{rule.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function actionIcon(type?: string) {
  if (type === 'LOYALTY_REWARD' || type === 'WIN_BACK') return <Gift size={18} />;
  if (type === 'CROSS_SELL') return <ShoppingCart size={18} />;
  if (type === 'PRIORITY_SUPPORT') return <Headphones size={18} />;
  if (type === 'MONITOR') return <BarChart3 size={18} />;
  if (type === 'MANUAL_REVIEW' || type === 'REVIEW_SERVICE') return <CircleAlert size={18} />;
  return <Star size={18} />;
}

function ActionScreen({
  items,
  name,
  onDecide,
}: {
  items: Recommendation[];
  name?: string;
  onDecide: (id: string, status: 'ACCEPTED' | 'DISMISSED') => void;
}) {
  return (
    <section className={styles.panel}>
      <h1>{name ? `AI Recommended Actions for ${name}` : 'Recommended Actions'}</h1>
      <p className={styles.muted}>Based on customer data and current behaviour.</p>
      {items.length === 0 ? <p className={styles.muted}>No actions yet. A card appears only when a rule matches: loyalty or priority support for a Champion, win-back for At Risk, cross-sell for Growth, review for High Friction, payment recovery after a failed payment, or a case review after repeated refunds or disputes. Approving a card records the decision and does not send an offer.</p> : null}
      <div className={styles.actionList}>
        {items.map((item) => (
          <article key={item.recommendationId} className={`${styles.actionCard} ${styles[`tone${item.recommendationType || ''}`] || ''}`}>
            <span className={styles.actionIcon}>{actionIcon(item.recommendationType)}</span>
            <div>
              <h2>{item.title}</h2>
              {item.displayName && !name ? <p>{item.displayName}</p> : null}
              <p>{item.detail}</p>
              <p>Eligibility {item.eligibility || 'Eligible'} · Priority {item.priority.toLowerCase()} · Objective: {item.objective}</p>
              {item.status === 'ACCEPTED' ? <p>Approved. No offer was sent.</p> : null}
              {item.status === 'DISMISSED' && item.merchantReason ? <p>Dismissed: {item.merchantReason}</p> : null}
            </div>
            {item.status === 'OPEN' ? (
              <div className={styles.rowActions}>
                <button type="button" className={item.cta === 'Create Offer' ? styles.primary : styles.outline} onClick={() => onDecide(item.recommendationId, 'ACCEPTED')}>{item.cta || 'Approve'}</button>
                <button type="button" onClick={() => onDecide(item.recommendationId, 'DISMISSED')}>Dismiss</button>
              </div>
            ) : <span>{item.status}</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
