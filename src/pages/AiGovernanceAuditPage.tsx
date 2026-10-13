import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronRight,
  CircleCheck,
  Cpu,
  Shield,
  Sparkles,
} from 'lucide-react';
import { reasonLabel } from '@asktill/chargebacks';
import {
  getCb4Recommendation,
  type Cb4Recommendation,
  type DisputeCaseRow,
} from '../lib/chargebacksClient';
import { useChargebacksLiveData } from '../lib/useChargebacksLiveData';
import {
  caseLabel,
  casePageHref,
  inRange,
  isLost,
  isTerminal,
  isWon,
  merchantLabel,
  money,
  recommendation,
  type RangeDays,
} from '../components/chargebacks/commandCenterMetrics';
import EvidenceRulebookScreens, { RULE_SECTIONS, type RuleSection } from './EvidenceRulebookScreens';
import pageStyles from './AtChargebacksPage.module.css';
import styles from './AiGovernanceAuditPage.module.css';

type InnerTab = 'cases' | 'rules';
type RecFilter = 'all' | 'fight' | 'accept' | 'review';
type OutcomeFilter = 'all' | 'won' | 'lost' | 'accepted' | 'open';
type OverrideFilter = 'all' | 'yes' | 'no';

const INNER_TABS: { id: InnerTab; label: string }[] = [
  { id: 'cases', label: 'Cases' },
  { id: 'rules', label: 'Rules & Logic' },
];

const MISSING = 'Not found';
const DASH = '—';
const PAGE_SIZE = 8;
const ICO = { size: 16, strokeWidth: 2.2 } as const;

function lower(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function recLabel(row: DisputeCaseRow): string {
  if (!row.decision_recommendation) return DASH;
  const rec = recommendation(row);
  if (rec === 'fight') return 'FIGHT';
  if (rec === 'accept') return 'ACCEPT';
  return 'REVIEW';
}

function finalDecision(row: DisputeCaseRow): string {
  const status = lower(row.decision_status);
  if (status === 'fight_approved') return 'FIGHT';
  if (status === 'accepted') return 'ACCEPT';
  if (isWon(row)) return 'WON';
  if (isLost(row)) return 'LOST';
  return DASH;
}

function recClass(value: string): string {
  if (value === 'FIGHT') return styles.pillFight;
  if (value === 'ACCEPT' || value === 'WON') return styles.pillAccept;
  if (value === 'REVIEW') return styles.pillReview;
  if (value === 'LOST') return styles.pillLost;
  return styles.pillMuted;
}

function humanOverride(row: DisputeCaseRow): 'Yes' | 'No' | typeof DASH {
  const status = lower(row.decision_status);
  if (status !== 'fight_approved' && status !== 'accepted') return DASH;
  if (!row.decision_recommendation) return DASH;
  const rec = recommendation(row);
  if (status === 'fight_approved' && rec === 'accept') return 'Yes';
  if (status === 'accepted' && rec === 'fight') return 'Yes';
  return 'No';
}

function auditStatus(row: DisputeCaseRow): { label: string; tone: 'done' | 'review' | 'open' } {
  if (isTerminal(row)) return { label: 'Complete', tone: 'done' };
  if (lower(row.decision_status) === 'fight_approved' || lower(row.evidence_status) === 'submitted') {
    return { label: 'In review', tone: 'review' };
  }
  if (row.decision_recommendation) return { label: 'Open', tone: 'open' };
  return { label: DASH, tone: 'open' };
}

function formatWhen(iso?: string | null): string {
  const ms = Date.parse(iso || '');
  if (!Number.isFinite(ms)) return DASH;
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDay(iso?: string | null): string {
  const ms = Date.parse(iso || '');
  if (!Number.isFinite(ms)) return DASH;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function engineLabel(row: DisputeCaseRow): string {
  return row.decision_recommendation ? 'CB4' : DASH;
}

function outcomeOf(row: DisputeCaseRow): OutcomeFilter {
  if (isWon(row)) return 'won';
  if (isLost(row)) return 'lost';
  if (lower(row.decision_status) === 'accepted') return 'accepted';
  return 'open';
}

function factLine(label: string, value: string) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value || MISSING}</dd>
    </div>
  );
}

type AuditStep = { title: string; body: string; tag?: string };

function auditSteps(row: DisputeCaseRow, cb4: Cb4Recommendation | null): AuditStep[] {
  const steps: AuditStep[] = [];
  const facts = [
    money(row.amount, row.currency, true) !== DASH ? `Amount ${money(row.amount, row.currency, true)}` : '',
    row.reason ? `Reason ${reasonLabel(row.reason)}` : '',
    row.match_status ? `Match ${row.match_status}` : '',
    row.shopify_order_name || row.shopify_order_number
      ? `Order ${row.shopify_order_name || `#${row.shopify_order_number}`}`
      : '',
  ].filter(Boolean);
  if (facts.length) steps.push({ title: 'Source facts', body: facts.join(' · ') });

  if (cb4?.recommendation_reason_codes?.length) {
    steps.push({
      title: 'CB4 rule codes',
      body: cb4.recommendation_reason_codes.join(', '),
      tag: cb4.ruleset_version || undefined,
    });
  }

  if (row.decision_recommendation || cb4?.recommendation) {
    const win = (row.win_likelihood || '').replace(/_/g, ' ').trim();
    steps.push({
      title: 'Recommendation',
      body: [cb4?.recommendation || recLabel(row), win ? `Win likelihood ${win}` : '']
        .filter(Boolean)
        .join(' · '),
      tag: cb4?.ruleset_version || undefined,
    });
  }

  if (row.decision_reason) {
    steps.push({ title: 'AI reasoning', body: row.decision_reason });
  }

  if (row.evidence_score != null || row.evidence_status) {
    const score = typeof row.evidence_score === 'number' ? `Score ${Math.round(row.evidence_score)}/100` : '';
    const status = row.evidence_status ? `Status ${row.evidence_status}` : '';
    steps.push({ title: 'Evidence', body: [score, status].filter(Boolean).join(' · ') });
  }

  if (row.decision_status) {
    const override = humanOverride(row);
    steps.push({
      title: 'Human control',
      body: [row.decision_status, override === 'Yes' ? 'Override of recommendation' : '']
        .filter(Boolean)
        .join(' · '),
    });
  }

  if (row.status || row.evidence_outcome) {
    steps.push({
      title: 'Outcome',
      body: [row.status, row.evidence_outcome].filter(Boolean).join(' · '),
    });
  }

  return steps;
}

export default function AiGovernanceAuditPage() {
  const { cases, loading, storeName } = useChargebacksLiveData();
  const [tab, setTab] = useState<InnerTab>('cases');
  const [ruleSection, setRuleSection] = useState<RuleSection>('Rules Overview');
  const [days, setDays] = useState<RangeDays>(30);
  const [decision, setDecision] = useState<RecFilter>('all');
  const [outcome, setOutcome] = useState<OutcomeFilter>('all');
  const [store, setStore] = useState('all');
  const [override, setOverride] = useState<OverrideFilter>('all');
  const [applied, setApplied] = useState({ days, decision, outcome, store, override });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cb4, setCb4] = useState<Cb4Recommendation | null>(null);

  const stores = useMemo(() => {
    const names = new Set<string>();
    for (const row of cases) names.add(merchantLabel(row));
    return [...names].sort();
  }, [cases]);

  const filtered = useMemo(() => {
    return cases.filter((row) => {
      if (!inRange(row, applied.days)) return false;
      if (applied.decision !== 'all' && recommendation(row) !== applied.decision) return false;
      if (applied.outcome !== 'all' && outcomeOf(row) !== applied.outcome) return false;
      if (applied.store !== 'all' && merchantLabel(row) !== applied.store) return false;
      if (applied.override !== 'all') {
        const flag = humanOverride(row);
        if (applied.override === 'yes' && flag !== 'Yes') return false;
        if (applied.override === 'no' && flag !== 'No') return false;
      }
      return true;
    });
  }, [cases, applied]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [applied, cases.length]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((row) => row.case_id === selectedId)) {
      setSelectedId(filtered[0].case_id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.case_id === selectedId) || null;
  const selectedIndex = selected ? filtered.findIndex((row) => row.case_id === selected.case_id) : -1;

  useEffect(() => {
    const disputeId = selected?.stripe_dispute_id;
    if (!disputeId) {
      setCb4(null);
      return;
    }
    let cancelled = false;
    getCb4Recommendation(disputeId)
      .then((row) => {
        if (!cancelled) setCb4(row);
      })
      .catch(() => {
        if (!cancelled) setCb4(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.stripe_dispute_id]);

  const engineCount = cases.some((row) => row.decision_recommendation) ? '1' : DASH;
  const latestRuleset = cb4?.ruleset_version || DASH;
  const steps = selected ? auditSteps(selected, cb4) : [];

  function applyFilters() {
    setApplied({ days, decision, outcome, store, override });
  }

  function clearFilters() {
    setDays(30);
    setDecision('all');
    setOutcome('all');
    setStore('all');
    setOverride('all');
    setApplied({ days: 30, decision: 'all', outcome: 'all', store: 'all', override: 'all' });
  }

  return (
    <div className={pageStyles.chargePage}>
      <div className={pageStyles.main}>
        <div className={pageStyles.fullWrap}>
          <div className={pageStyles.scrollViewport}>
          <div className={styles.page}>
            <div className={styles.header}>
              <div className={styles.titleBlock}>
                <div className={styles.crumb}>
                  Money Reclaimed
                  <ChevronRight size={14} strokeWidth={2.2} />
                  <em>Rules, AI Governance & Audit</em>
                </div>
                <div className={styles.titleRow}>
                  <h1 className={styles.title}>Rules, AI Governance & Audit</h1>
                  <span className={styles.aiBadge}>
                    <Sparkles {...ICO} /> Powered by AskTill AI
                  </span>
                </div>
                <p className={styles.sub}>Independent audit view of AI-assisted decisions.</p>
              </div>
              <div className={styles.headerTools}>
                <label className={styles.range}>
                  <Calendar {...ICO} />
                  <select
                    value={days}
                    onChange={(e) => {
                      const next = Number(e.target.value) as RangeDays;
                      setDays(next);
                      setApplied((prev) => ({ ...prev, days: next }));
                    }}
                    aria-label="Date range"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </label>
                <div className={styles.store}>{storeName?.trim() || 'Your store'}</div>
              </div>
              <div className={styles.heroCards}>
                <article className={styles.heroCard}>
                  <span className={styles.heroIcon}>
                    <Sparkles size={18} strokeWidth={2.1} />
                  </span>
                  <div>
                    <strong>AI under control</strong>
                    <p>Monitor and audit AI decisions on live chargeback cases.</p>
                  </div>
                </article>
                <article className={styles.heroCard}>
                  <span className={`${styles.heroIcon} ${styles.heroIconBlue}`}>
                    <Cpu size={18} strokeWidth={2.1} />
                  </span>
                  <div>
                    <strong>AI models in use</strong>
                    <p className={styles.heroValue}>{loading ? '…' : engineCount}</p>
                    <span>Latest: {latestRuleset === DASH ? MISSING : latestRuleset}</span>
                  </div>
                </article>
              </div>
              <div className={styles.tabs} role="tablist">
                {INNER_TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    className={`${styles.tab} ${tab === item.id ? styles.tabOn : ''}`}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'rules' ? (
              <section className={styles.ruleBook} aria-label="Rules and logic">
                <nav className={styles.ruleNav} aria-label="Rulebook">
                  {RULE_SECTIONS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`${styles.ruleItem} ${ruleSection === name ? styles.ruleItemOn : ''}`}
                      aria-current={ruleSection === name ? 'page' : undefined}
                      onClick={() => setRuleSection(name)}
                    >
                      {name}
                    </button>
                  ))}
                </nav>
                <div className={styles.rulePane}>
                  <EvidenceRulebookScreens section={ruleSection} onSection={setRuleSection} cases={cases} />
                </div>
              </section>
            ) : (
              <>
                <section className={styles.filters} aria-label="Audit filters">
                  <label>
                    Date range
                    <select
                      value={days}
                      onChange={(e) => {
                        const next = Number(e.target.value) as RangeDays;
                        setDays(next);
                        setApplied((prev) => ({ ...prev, days: next }));
                      }}
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </label>
                  <label>
                    Decision
                    <select value={decision} onChange={(e) => setDecision(e.target.value as RecFilter)}>
                      <option value="all">All</option>
                      <option value="fight">Fight</option>
                      <option value="accept">Accept</option>
                      <option value="review">Review</option>
                    </select>
                  </label>
                  <label>
                    Outcome
                    <select value={outcome} onChange={(e) => setOutcome(e.target.value as OutcomeFilter)}>
                      <option value="all">All</option>
                      <option value="open">Open</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </label>
                  <label>
                    Ruleset version
                    <select disabled defaultValue="all" aria-label="Ruleset version">
                      <option value="all">All</option>
                    </select>
                  </label>
                  <label>
                    AI version
                    <select disabled defaultValue="all" aria-label="AI version">
                      <option value="all">All</option>
                    </select>
                  </label>
                  <label>
                    Human override
                    <select value={override} onChange={(e) => setOverride(e.target.value as OverrideFilter)}>
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                  <label>
                    Merchant / Store
                    <select value={store} onChange={(e) => setStore(e.target.value)}>
                      <option value="all">All stores</option>
                      {stores.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    AI model
                    <select disabled defaultValue="all" aria-label="AI model">
                      <option value="all">All models</option>
                    </select>
                  </label>
                  <label>
                    Reasoning type
                    <select disabled defaultValue="all" aria-label="Reasoning type">
                      <option value="all">All</option>
                    </select>
                  </label>
                  <div className={styles.filterActions}>
                    <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                      Clear filters
                    </button>
                    <button type="button" className={styles.applyBtn} onClick={applyFilters}>
                      Apply filters
                    </button>
                  </div>
                </section>

                <section className={styles.tableCard}>
                  <div className={styles.tableMeta}>
                    <span>
                      {filtered.length
                        ? `${safePage * PAGE_SIZE + 1}–${Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of ${filtered.length} cases`
                        : loading
                          ? 'Loading live cases…'
                          : '0 cases'}
                    </span>
                    <div className={styles.pager}>
                      <button type="button" disabled={safePage <= 0} onClick={() => setPage((n) => Math.max(0, n - 1))}>
                        <ArrowLeft size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPage((n) => n + 1)}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Case ID</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>AI model</th>
                          <th>AI reasoning</th>
                          <th>Recommendation</th>
                          <th>Final decision</th>
                          <th>Ruleset</th>
                          <th>Audit status</th>
                          <th>Override</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.length === 0 ? (
                          <tr>
                            <td colSpan={10} className={styles.emptyCell}>
                              {loading
                                ? 'Loading live cases…'
                                : 'No live cases in this filter. Connect Stripe on Money Reclaimed, then cases appear here.'}
                            </td>
                          </tr>
                        ) : (
                          paged.map((row) => {
                            const rec = recLabel(row);
                            const final = finalDecision(row);
                            const audit = auditStatus(row);
                            const on = row.case_id === selectedId;
                            return (
                              <tr
                                key={row.case_id}
                                className={on ? styles.rowOn : undefined}
                                onClick={() => setSelectedId(row.case_id)}
                              >
                                <td>
                                  <button type="button" className={styles.caseId}>
                                    {caseLabel(row)}
                                  </button>
                                </td>
                                <td>{formatDay(row.created_at)}</td>
                                <td className={styles.amt}>{money(row.amount, row.currency, true)}</td>
                                <td>{engineLabel(row)}</td>
                                <td className={styles.reasonCell}>{row.decision_reason || DASH}</td>
                                <td>
                                  <span className={recClass(rec)}>{rec}</span>
                                </td>
                                <td>
                                  <span className={recClass(final)}>{final}</span>
                                </td>
                                <td>{on && cb4?.ruleset_version ? cb4.ruleset_version : DASH}</td>
                                <td>
                                  <span className={`${styles.auditDot} ${styles[audit.tone]}`}>{audit.label}</span>
                                </td>
                                <td className={humanOverride(row) === 'Yes' ? styles.overrideYes : undefined}>
                                  {humanOverride(row)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={styles.detailGrid}>
                  <article className={styles.detailCard}>
                    <div className={styles.detailHead}>
                      <h2>Case Overview</h2>
                      <div className={styles.detailNav}>
                        <button
                          type="button"
                          disabled={selectedIndex <= 0}
                          onClick={() => selectedIndex > 0 && setSelectedId(filtered[selectedIndex - 1].case_id)}
                        >
                          <ArrowLeft size={14} /> Previous
                        </button>
                        <button
                          type="button"
                          disabled={selectedIndex < 0 || selectedIndex >= filtered.length - 1}
                          onClick={() =>
                            selectedIndex >= 0 &&
                            selectedIndex < filtered.length - 1 &&
                            setSelectedId(filtered[selectedIndex + 1].case_id)
                          }
                        >
                          Next <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                    {selected ? (
                      <>
                        <div className={styles.caseTitle}>
                          <h3>{caseLabel(selected)}</h3>
                          <span className={recClass(finalDecision(selected))}>{finalDecision(selected)}</span>
                        </div>
                        <dl className={styles.facts}>
                          {factLine('Date', formatWhen(selected.created_at))}
                          {factLine('Amount', money(selected.amount, selected.currency, true))}
                          {factLine('Merchant / Store', merchantLabel(selected))}
                          {factLine('Customer', selected.shopify_customer_email || MISSING)}
                          {factLine('Reason code', selected.reason ? reasonLabel(selected.reason) : MISSING)}
                          {factLine('Network', MISSING)}
                          {factLine('Ruleset version', cb4?.ruleset_version || MISSING)}
                          {factLine('AI model', engineLabel(selected) === DASH ? MISSING : engineLabel(selected))}
                          {factLine('AI reasoning', selected.decision_reason || MISSING)}
                          {factLine('Final decision', finalDecision(selected) === DASH ? MISSING : finalDecision(selected))}
                          {factLine('Audit status', auditStatus(selected).label === DASH ? MISSING : auditStatus(selected).label)}
                          {factLine('Human override', humanOverride(selected) === DASH ? MISSING : humanOverride(selected))}
                          {factLine('Internal case link', selected.case_id)}
                        </dl>
                        <div className={styles.overviewActions}>
                          <Link to={casePageHref(selected)} className={styles.ghostBtn}>
                            Open case in workspace
                          </Link>
                          <Link to={casePageHref(selected)} className={styles.primaryBtn}>
                            Open audit record
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className={styles.emptyHint}>Select a live case to see the audit overview.</p>
                    )}
                  </article>

                  <article className={styles.detailCard}>
                    <div className={styles.detailHead}>
                      <h2>AI Decision & Reasoning Details</h2>
                    </div>
                    {steps.length ? (
                      <ol className={styles.trace}>
                        {steps.map((step, index) => (
                          <li key={step.title}>
                            <span className={styles.stepNum}>{String(index + 1).padStart(2, '0')}</span>
                            <div>
                              <div className={styles.stepTitle}>
                                <Shield size={14} strokeWidth={2.2} />
                                {step.title}
                                {step.tag ? <em>{step.tag}</em> : null}
                              </div>
                              <p>{step.body}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className={styles.emptyHint}>
                        {selected
                          ? 'No AI decision trace is stored on this case yet.'
                          : 'Select a live case to see stored reasoning.'}
                      </p>
                    )}
                    {cb4?.final_decision ? (
                      <div className={styles.outcomeBar}>
                        <CircleCheck size={16} strokeWidth={2.2} />
                        CB4 final decision: {cb4.final_decision}
                      </div>
                    ) : null}
                  </article>
                </section>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
