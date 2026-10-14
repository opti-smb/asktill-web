import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronRight, FileCheck, FileText, Layers, Lock, Plus, Search, ShieldCheck, ShoppingBag, Store, X } from 'lucide-react';
import {
  getEvidenceRulebookCatalog,
  postEvidenceRuleAdmin,
  postGovernedRule,
  type DisputeCaseRow,
  type EvidenceChange,
  type EvidencePriorityRule,
  type EvidenceRecipe,
  type EvidenceRecipeRequirement,
} from '../lib/chargebacksClient';
import styles from './EvidenceRulebookScreens.module.css';

export const RULE_SECTIONS = [
  'Rules Overview',
  'Reason Rules',
  'Evidence Types',
  'Provider Rules',
  'Merchant Types',
  'Version History',
  'Rule Testing',
] as const;

export const RULE_SCREENS = ['Create Rule', 'Provider View', 'Add Override', 'Edit Override'] as const;

export type RuleSection = (typeof RULE_SECTIONS)[number] | (typeof RULE_SCREENS)[number];

type ReasonRow = {
  id: string;
  reason: string;
  provider: string;
  merchant: string;
  requirements: number;
  expected: string;
  status: string;
  version: string;
  updated: string;
};

type RequirementRow = {
  name: string;
  type: string;
  priority: string;
  mandatory: boolean;
  strength: string;
  ruleId: string;
  locked: boolean;
};

type EvidenceTypeRow = { name: string; category: string; description: string; sources: string };
type ClassRow = { type: string; keywords: string; maps: string; confidence: string; status: string };
type MerchantRow = { id: string; type: string; provider: string; reason: string; changes: string; status: string; revision: number };
type VersionRow = { version: string; active: boolean; at: string; by: string; changes: string[]; draftId: string };

function titleCase(value: string | undefined) {
  const text = (value || '').trim();
  if (!text) return '—';
  return text.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function when(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function requirementRows(items: EvidenceRecipeRequirement[] | undefined): RequirementRow[] {
  return (items || []).map((item) => {
    const priority = (item.priority || 'P2').toUpperCase();
    return {
      name: item.display_name || titleCase(item.code),
      type: titleCase(item.code),
      priority,
      mandatory: Boolean(item.mandatory || item.provider_lock || priority === 'P0'),
      strength: item.expected_strength || (priority === 'P2' ? 'Medium' : 'High'),
      ruleId: item.rule_id || '',
      locked: Boolean(item.provider_lock),
    };
  });
}

function reasonBlurb(reason?: string) {
  const key = reasonKey(reason);
  if (key === 'product_not_received') return 'Customer claims the product was not received.';
  if (key === 'fraudulent') return 'Customer claims the payment was unauthorized.';
  if (key === 'product_unacceptable') return 'Customer claims the product was not as described.';
  if (key === 'credit_not_processed') return 'Customer claims a credit was not processed.';
  if (key === 'duplicate') return 'Customer claims the charge is a duplicate.';
  if (key === 'subscription_canceled') return 'Customer claims the subscription was canceled.';
  if (key === 'service_not_provided') return 'Customer claims the service was not provided.';
  return '';
}

const OVERVIEW_TABS = ['Reason Rules', 'Merchant Type Rules', 'Provider Rules', 'Evidence Types', 'Classification Rules'] as const;

function statusPill(status: string) {
  if (status === 'Draft') return <span className={styles.draft}>Draft</span>;
  if (status === 'Passed') {
    return <span className={styles.passed}><Check size={12} /> Passed</span>;
  }
  return <span className={styles.active}>Active</span>;
}

function priorityPill(priority: string) {
  const tone = priority === 'P0' ? styles.p0 : priority === 'P1' ? styles.p1 : styles.p2;
  return <span className={`${styles.priority} ${tone}`}>{priority}</span>;
}

function reasonKey(value?: string | null) {
  const raw = (value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['merchandise_or_service_not_received', 'not_received'].includes(raw)) return 'product_not_received';
  if (['unauthorized', 'unauthorised'].includes(raw)) return 'fraudulent';
  if (['not_as_described'].includes(raw)) return 'product_unacceptable';
  if (['duplicate_charge'].includes(raw)) return 'duplicate';
  if (['subscription_cancelled', 'canceled_recurring'].includes(raw)) return 'subscription_canceled';
  if (['refund_not_processed'].includes(raw)) return 'credit_not_processed';
  return raw;
}

function paymentOf(row: DisputeCaseRow) {
  const named = (row.provider || '').trim().toLowerCase();
  if (named === 'paypal') return 'paypal';
  if (named === 'stripe') return 'stripe';
  if ((row.stripe_dispute_id || '').startsWith('du_') || row.stripe_charge_id || row.stripe_payment_intent_id) return 'stripe';
  if (named === 'shopify') return 'shopify';
  return '';
}

function casesFor(reason: string | undefined, cases: DisputeCaseRow[], payment = '') {
  const key = reasonKey(reason);
  return cases.filter((row) => reasonKey(row.reason) === key && (!payment || paymentOf(row) === payment));
}

function latestStamp(rows: DisputeCaseRow[]) {
  let latest = '';
  for (const row of rows) {
    const stamp = row.payment_created_at || row.created_at || row.updated_at || row.matched_at || '';
    if (stamp > latest) latest = stamp;
  }
  return latest;
}

function expectation(recipe?: EvidenceRecipe) {
  return (recipe?.requirements || [])
    .map((item) => {
      const name = (item.display_name || '').trim() || titleCase(item.code);
      if (!name || name === '—') return '';
      return `${name} (${(item.priority || 'P2').toUpperCase()})`;
    })
    .filter(Boolean)
    .join(', ');
}

function merchantLabel(value: string | undefined) {
  const text = (value || '').trim().toLowerCase();
  if (!text) return 'All';
  if (text === 'ecommerce' || text === 'e-commerce') return 'E-commerce';
  return titleCase(text);
}

function brandLabel(value: string | undefined) {
  const text = (value || '').trim().toLowerCase();
  if (!text) return '';
  if (text === 'paypal') return 'PayPal';
  if (text === 'stripe') return 'Stripe';
  if (text === 'shopify') return 'Shopify';
  return titleCase(text);
}

function ProviderMark({ name }: { name: string }) {
  const key = name.trim().toLowerCase();
  if (key === 'stripe') return <span className={styles.mark}><i className={styles.stripe}>S</i> Stripe</span>;
  if (key === 'paypal') return <span className={styles.mark}><i className={styles.paypal}>P</i> PayPal</span>;
  if (key === 'shopify') return <span className={styles.mark}><i className={styles.shopify}><ShoppingBag size={11} /></i> Shopify</span>;
  if (!key) return <span>No case</span>;
  return <span className={styles.mark}>{name}</span>;
}

function providerPill(provider: string) {
  const tone = provider === 'Shopify' ? styles.chipGreen : provider === 'E-commerce' || provider === 'Travel' || provider === 'Marketplace' ? styles.chipGray : styles.chipBlue;
  return <span className={`${styles.provider} ${tone}`}>{provider}</span>;
}

export default function EvidenceRulebookScreens({
  section,
  onSection,
  cases,
}: {
  section: RuleSection;
  onSection: (next: RuleSection) => void;
  cases: DisputeCaseRow[];
}) {
  const [overviewTab, setOverviewTab] = useState<(typeof OVERVIEW_TABS)[number]>('Reason Rules');
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('All');
  const [merchant, setMerchant] = useState('All');
  const [status, setStatus] = useState('All');
  const [reasonTab, setReasonTab] = useState('Evidence Requirements');
  const [modal, setModal] = useState<'requirement' | 'evidence' | null>(null);
  const [editing, setEditing] = useState<RequirementRow | null>(null);
  const [recipes, setRecipes] = useState<EvidenceRecipe[]>([]);
  const [rules, setRules] = useState<EvidencePriorityRule[]>([]);
  const [changes, setChanges] = useState<EvidenceChange[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [approvalId, setApprovalId] = useState('');

  async function loadCatalog() {
    setLoading(true);
    try {
      const catalog = await getEvidenceRulebookCatalog();
      setRecipes(catalog.recipes);
      setRules(catalog.rules);
      setChanges(catalog.changes);
      setSelectedId((current) => current || catalog.recipes[0]?.recipe_id || '');
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'The rulebook could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  const reasonRows = useMemo<ReasonRow[]>(() => {
    const specific = recipes.filter((recipe) => (recipe.provider || '').trim() && (recipe.merchant_category || '').trim());
    const groups = new Map<string, DisputeCaseRow[]>();
    for (const dispute of cases) {
      const payment = paymentOf(dispute);
      const reason = reasonKey(dispute.reason);
      if (!payment || !reason || (payment !== 'stripe' && payment !== 'paypal')) continue;
      const key = `${reason}::${payment}`;
      groups.set(key, [...(groups.get(key) || []), dispute]);
    }
    return [...groups.entries()].map(([key, matched]) => {
      const [reason, payment] = key.split('::');
      const onShopify = matched.some((row) => row.shopify_order_id || row.shopify_shop_domain);
      const candidates = specific.filter((recipe) => reasonKey(recipe.dispute_reason) === reason && (recipe.provider || '').trim().toLowerCase() === payment);
      const chosen = candidates.find((recipe) => onShopify && (recipe.merchant_category || '').trim().toLowerCase() === 'ecommerce')
        || (candidates.length === 1 ? candidates[0] : undefined)
        || recipes.find((recipe) => !(recipe.provider || '').trim() && reasonKey(recipe.dispute_reason) === reason);
      const category = (chosen?.merchant_category || '').trim();
      const named = recipes.find((recipe) => reasonKey(recipe.dispute_reason) === reason && (recipe.requirements || []).length > 0 && ((recipe.provider || '').trim().toLowerCase() === payment || !(recipe.provider || '').trim()));
      const picked = (chosen && (chosen.requirements || []).length ? chosen : undefined) || named || chosen;
      return {
        id: `${picked?.recipe_id || reason}::${payment}`,
        reason: titleCase(picked?.dispute_reason || reason),
        provider: brandLabel(payment),
        merchant: category ? merchantLabel(category) : (onShopify ? 'E-commerce' : ''),
        requirements: (picked?.requirements || []).length,
        expected: expectation(picked),
        status: titleCase(picked?.status || 'ACTIVE'),
        version: picked?.recipe_version || 'ev04.recipe.1',
        updated: when(latestStamp(matched)),
      };
    });
  }, [cases, recipes]);

  useEffect(() => {
    if (!reasonRows.length) return;
    setSelectedId((current) => (reasonRows.some((row) => row.id === current) ? current : reasonRows[0].id));
  }, [reasonRows]);

  const reasons = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reasonRows.filter((row) => {
      if (provider !== 'All' && !row.provider.split(', ').includes(provider)) return false;
      if (merchant !== 'All' && row.merchant !== merchant) return false;
      if (status !== 'All' && row.status !== status) return false;
      if (!needle) return true;
      return `${row.reason} ${row.provider} ${row.merchant}`.toLowerCase().includes(needle);
    });
  }, [merchant, provider, query, reasonRows, status]);

  const selectedRecipeId = selectedId.split('::')[0];
  const selectedPaymentKey = (selectedId.split('::')[1] || '').trim().toLowerCase();
  const selected = recipes.find((recipe) => recipe.recipe_id === selectedRecipeId);
  const selectedPayment = brandLabel(selectedPaymentKey || selected?.provider);
  const selectedMerchant = (selected?.merchant_category || '').trim() ? merchantLabel(selected?.merchant_category) : '';
  const linkedCases = cases.filter((row) => reasonKey(row.reason) === reasonKey(selected?.dispute_reason) && (!selectedPaymentKey || paymentOf(row) === selectedPaymentKey));
  const requirements = requirementRows(selected?.requirements);
  const [mandatory, setMandatory] = useState<boolean[]>([]);
  useEffect(() => {
    setMandatory(requirements.map((row) => row.mandatory));
  }, [selected?.recipe_id]);

  const evidenceTypes = useMemo<EvidenceTypeRow[]>(() => {
    const seen = new Set<string>();
    const rows: EvidenceTypeRow[] = [];
    for (const rule of rules) {
      const name = titleCase(rule.evidence_type);
      if (!name || name === 'All' || seen.has(name)) continue;
      seen.add(name);
      rows.push({
        name,
        category: titleCase(rule.applies_to),
        description: rule.expected_strength || '',
        sources: Array.isArray(rule.dynamic_watch) ? rule.dynamic_watch.join(', ') : String(rule.dynamic_watch || ''),
      });
    }
    return rows;
  }, [rules]);

  const classification = useMemo<ClassRow[]>(() => rules.map((rule) => ({
    type: titleCase(rule.evidence_type),
    keywords: Array.isArray(rule.dynamic_watch) ? rule.dynamic_watch.join(', ') : String(rule.dynamic_watch || ''),
    maps: rule.applies_to || '',
    confidence: rule.priority || '',
    status: titleCase(rule.status || 'ACTIVE'),
  })), [rules]);

  const merchants = useMemo<MerchantRow[]>(() => recipes.filter((recipe) => recipe.merchant_category || ['DRAFT', 'TEST', 'APPROVED'].includes(String(recipe.status || '').toUpperCase())).map((recipe) => ({
    id: recipe.recipe_id,
    type: titleCase(recipe.merchant_category),
    provider: titleCase(recipe.provider),
    reason: titleCase(recipe.dispute_reason),
    changes: (recipe.requirements || []).map((item) => `${item.display_name || titleCase(item.code)} ${item.priority || ''}`).join('\n'),
    status: titleCase(recipe.status || 'ACTIVE'),
    revision: Number(recipe.revision || 1),
  })), [recipes]);

  const versions = useMemo<VersionRow[]>(() => {
    const recipe = recipes.find((item) => item.recipe_id === selectedId.split('::')[0]) || recipes[0];
    if (!recipe) return [];
    const payment = selectedId.split('::')[1] || (recipe.provider || '').trim().toLowerCase();
    const requirementLines = (recipe.requirements || []).map((item) => `${item.display_name || titleCase(item.code)} (${(item.priority || 'P2').toUpperCase()})`);
    const current: VersionRow = {
      version: recipe.recipe_version || recipe.recipe_id,
      active: String(recipe.status || '').toUpperCase() === 'ACTIVE',
      at: when(recipe.activated_at || recipe.created_at || latestStamp(casesFor(recipe.dispute_reason, cases, payment))),
      by: recipe.recipe_id,
      changes: requirementLines.length ? requirementLines : ['No requirements on this version'],
      draftId: '',
    };
    const events = changes.map((change) => ({
      version: change.event,
      active: String(change.details?.status || '') === 'ACTIVE',
      at: when(change.at),
      by: change.subject,
      changes: Object.entries(change.details || {}).map(([key, value]) => `${titleCase(key)}: ${String(value)}`),
      draftId: change.subject.startsWith('draft_') ? change.subject : '',
    }));
    return [current, ...events];
  }, [cases, changes, recipes, selectedId]);

  const providerOptions = [...new Set(reasonRows.flatMap((row) => row.provider.split(', ')).filter((item) => item && item !== 'No case'))];
  const merchantOptions = [...new Set(reasonRows.map((row) => row.merchant).filter((item) => item && item !== 'All' && item !== '—'))];
  const statusOptions = [...new Set(reasonRows.map((row) => row.status))];
  const reasonCount = new Set(recipes.map((recipe) => recipe.dispute_reason).filter(Boolean)).size;
  const requirementCount = recipes.reduce((sum, recipe) => sum + (recipe.requirements || []).length, 0);
  const providerCount = new Set(recipes.map((recipe) => recipe.provider).filter(Boolean)).size;
  const merchantCount = new Set(recipes.map((recipe) => recipe.merchant_category).filter(Boolean)).size;
  const activeCount = recipes.filter((recipe) => String(recipe.status || '').toUpperCase() === 'ACTIVE').length;

  function openRecipe(id: string) {
    setSelectedId(id);
    onSection('Reason Rules');
  }

  function openProvider(id: string) {
    setSelectedId(id);
    onSection('Provider View');
  }

  function openOverride(id: string) {
    setSelectedId(id);
    onSection('Edit Override');
  }

  function openRequirement(row: RequirementRow) {
    setEditing(row);
    setModal('requirement');
  }

  async function saveRequirement(priority: string) {
    if (!editing?.ruleId) return;
    setSaving(true);
    try {
      await postEvidenceRuleAdmin('draft', { ruleId: editing.ruleId, priority });
      await loadCatalog();
      setModal(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'The rule draft was not saved.');
    } finally {
      setSaving(false);
    }
  }

  async function sendForApproval() {
    const rule = requirements.find((item) => item.ruleId);
    if (!rule?.ruleId) {
      setLoadError('This rule has no requirement that can be sent for approval.');
      return;
    }
    setSaving(true);
    try {
      const drafted = await postEvidenceRuleAdmin('draft', { ruleId: rule.ruleId, priority: rule.priority });
      const draftId = drafted.draft?.draft_id || `draft_rule_${rule.ruleId}`;
      await postEvidenceRuleAdmin('test', { draftId });
      await postEvidenceRuleAdmin('approve', { draftId });
      setApprovalId(draftId);
      setDraftReady(true);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'The rule was not sent for approval.');
    } finally {
      setSaving(false);
    }
  }

  async function activateDraft() {
    if (!approvalId) return;
    setSaving(true);
    try {
      await postEvidenceRuleAdmin('activate', { draftId: approvalId });
      setLoadError('');
      await loadCatalog();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'The rule was not activated.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.screen}>
      {section === 'Rules Overview' ? (
        <>
          <div className={styles.head}>
            <div>
              <h2>Evidence Rulebook</h2>
              <p>Configure and manage evidence requirements for dispute handling.</p>
            </div>
            <button type="button" className={styles.primary} onClick={() => onSection('Create Rule')}>
              <Plus size={16} /> Create Rule
            </button>
          </div>
          <div className={styles.stats}>
            <Stat tone="blue" icon={<FileText size={18} />} label="Dispute Reasons" value={loading ? '…' : String(reasonCount)} />
            <Stat tone="green" icon={<FileCheck size={18} />} label="Evidence Requirements" value={loading ? '…' : String(requirementCount)} />
            <Stat tone="purple" icon={<Layers size={18} />} label="Providers" value={loading ? '…' : String(providerCount)} />
            <Stat tone="orange" icon={<Store size={18} />} label="Merchant Types" value={loading ? '…' : String(merchantCount)} />
            <Stat tone="mint" icon={<ShieldCheck size={18} />} label="Active Versions" value={loading ? '…' : String(activeCount)} />
          </div>
          {loadError ? <p className={styles.crumb}>{loadError}</p> : null}
          <div className={styles.subtabs}>
            {OVERVIEW_TABS.map((tab) => (
              <button key={tab} type="button" className={overviewTab === tab ? styles.subOn : styles.sub} onClick={() => setOverviewTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
          {overviewTab === 'Reason Rules' ? (
            <>
              <Filters query={query} provider={provider} merchant={merchant} status={status} providers={providerOptions} merchants={merchantOptions} statuses={statusOptions} onQuery={setQuery} onProvider={setProvider} onMerchant={setMerchant} onStatus={setStatus} />
              <ReasonTable rows={reasons} onView={openRecipe} />
            </>
          ) : null}
          {overviewTab === 'Provider Rules' ? (
            <>
              <Filters query={query} provider={provider} merchant={merchant} status={status} providers={providerOptions} merchants={merchantOptions} statuses={statusOptions} onQuery={setQuery} onProvider={setProvider} onMerchant={setMerchant} onStatus={setStatus} />
              <ReasonTable rows={reasons.filter((row) => row.provider !== '—')} onView={openProvider} />
            </>
          ) : null}
          {overviewTab === 'Merchant Type Rules' ? <MerchantPanel rows={merchants} onEdit={openOverride} /> : null}
          {overviewTab === 'Evidence Types' ? <EvidenceCatalog types={evidenceTypes} onEdit={() => evidenceTypes[0] && setModal('evidence')} /> : null}
          {overviewTab === 'Classification Rules' ? <ClassificationPanel rows={classification} /> : null}
        </>
      ) : null}

      {section === 'Reason Rules' ? (
        <>
          <p className={styles.crumb}>Reason Rules <ChevronRight size={12} /> {selectedPayment} <ChevronRight size={12} /> {titleCase(selected?.dispute_reason)}</p>
          <div className={styles.head}>
            <div>
              <h2>{titleCase(selected?.dispute_reason)} {selected ? statusPill(titleCase(selected.status || 'ACTIVE')) : null}</h2>
              <p>
                {selectedPayment ? <ProviderMark name={selectedPayment} /> : null}
                {selected?.merchant_category ? providerPill(selectedMerchant) : null}
              </p>
              <p>{reasonBlurb(selected?.dispute_reason)}</p>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.ghost}>View Cases ({linkedCases.length})</button>
              <button type="button" className={styles.primary} disabled={saving}>Save Changes</button>
            </div>
          </div>
          <div className={styles.subtabs}>
            {['Evidence Requirements', 'Applicability', 'Instructions & Help', 'AI Evaluation Rules', 'Version History'].map((tab) => (
              <button key={tab} type="button" className={reasonTab === tab ? styles.subOn : styles.sub} onClick={() => setReasonTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
          {reasonTab === 'Evidence Requirements' ? (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Evidence Requirement</th>
                    <th>Evidence Type</th>
                    <th>Priority</th>
                    <th>Mandatory</th>
                    <th>Expected Strength</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((row, index) => (
                    <tr key={row.name}>
                      <td>{index + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.type}</td>
                      <td>{priorityPill(row.priority)}</td>
                      <td>
                        <Toggle
                          on={mandatory[index] ?? row.mandatory}
                          locked={row.locked}
                          onToggle={() => {
                            if (row.locked) return;
                            setMandatory((current) => current.map((value, item) => (item === index ? !value : value)));
                          }}
                        />
                      </td>
                      <td>{row.strength}</td>
                      <td>{statusPill('Active')}</td>
                      <td>
                        <button type="button" className={styles.editBtn} onClick={() => openRequirement(row)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className={styles.addRow} onClick={() => requirements[0] && openRequirement(requirements[0])}>
                <Plus size={14} /> Add Requirement
              </button>
            </>
          ) : null}
          {reasonTab === 'Applicability' ? (
            <div className={styles.note}>
              <span>Applies to Provider(s)</span>
              <p>{selectedPayment ? <ProviderMark name={selectedPayment} /> : null}</p>
              <span>Applies to Merchant Type(s)</span>
              <p>{selected?.merchant_category ? providerPill(selectedMerchant) : null}</p>
              <span>Applies to Dispute Reason(s)</span>
              <p>{providerPill(titleCase(selected?.dispute_reason))}</p>
            </div>
          ) : null}
          {reasonTab === 'Instructions & Help' ? (
            <div className={styles.note}>
              <span>Instructions for Users</span>
              <p>{(selected?.requirements || []).map((item) => item.display_name || titleCase(item.code)).join(' · ') || '—'}</p>
            </div>
          ) : null}
          {reasonTab === 'AI Evaluation Rules' ? <ClassificationPanel rows={classification} /> : null}
          {reasonTab === 'Version History' ? <VersionList rows={versions} onView={() => onSection('Reason Rules')} /> : null}
        </>
      ) : null}

      {section === 'Evidence Types' ? (
        <>
          <div className={styles.head}>
            <div>
              <h2>Evidence Types</h2>
              <p>Define evidence types and how they are identified and verified.</p>
            </div>
            <button type="button" className={styles.primary} onClick={() => setModal('evidence')}>
              <Plus size={16} /> Add Evidence Type
            </button>
          </div>
          <EvidenceCatalog types={evidenceTypes} onEdit={() => setModal('evidence')} />
        </>
      ) : null}

      {section === 'Provider Rules' ? (
        <>
          <div className={styles.head}>
            <div>
              <h2>Provider Rules</h2>
              <p>Same reason rules, narrowed by provider. Filters do not change how a rule is resolved.</p>
            </div>
          </div>
          <Filters query={query} provider={provider} merchant={merchant} status={status} providers={providerOptions} merchants={merchantOptions} statuses={statusOptions} onQuery={setQuery} onProvider={setProvider} onMerchant={setMerchant} onStatus={setStatus} />
          <ReasonTable rows={reasons.filter((row) => row.provider !== '—')} onView={openProvider} />
        </>
      ) : null}

      {section === 'Merchant Types' ? (
        <>
          <div className={styles.head}>
            <div>
              <h2>Merchant Type Overrides</h2>
              <p>Override or customise requirements for specific merchant types.</p>
            </div>
            <button type="button" className={styles.primary} onClick={() => onSection('Add Override')}>
              <Plus size={16} /> Add Override
            </button>
          </div>
          <MerchantPanel rows={merchants} onEdit={openOverride} />
        </>
      ) : null}

      {section === 'Version History' ? (
        <>
          <div className={styles.head}>
            <div>
              <h2>Version History — {selectedPayment} / {titleCase(selected?.dispute_reason)}</h2>
            </div>
            <button type="button" className={styles.primary}>
              <Plus size={16} /> Create New Version
            </button>
          </div>
          <VersionList rows={versions} onView={() => onSection('Rule Testing')} />
        </>
      ) : null}

      {section === 'Rule Testing' ? (
        <>
          <div className={styles.head}>
            <div>
              <h2>Test and Approve Rule ({selected?.recipe_version || 'ev04.recipe.1'})</h2>
              <p>{reasonRows.length} scenarios with a live dispute</p>
            </div>
          </div>
          <ol className={styles.steps}>
            {['Draft', 'Test with Sample Cases', 'Review & Approve', 'Activate'].map((label, index) => (
              <li key={label} className={index === (draftReady ? 2 : 0) ? styles.stepOn : undefined}>
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <h3>Test Results (Sample Cases)</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Test Case</th>
                <th>Expected Requirements</th>
                <th>Result</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reasonRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.reason} · {row.provider}</td>
                    <td>{row.expected}</td>
                    <td><span className={styles.draft}>Not tested</span></td>
                    <td>Awaiting a governed test run</td>
                    <td><button type="button" className={styles.link} onClick={() => openRecipe(row.id)}>View</button></td>
                  </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.testFoot}>
            <button type="button" className={styles.ghost} onClick={() => onSection('Version History')}>Back</button>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} disabled={saving} onClick={() => void sendForApproval()}>Send for Approval</button>
              <button type="button" className={styles.primary} disabled={saving || !draftReady} onClick={() => void activateDraft()}>Activate Rule</button>
            </div>
          </div>
          {loadError ? <p className={styles.crumb}>{loadError}</p> : null}
        </>
      ) : null}

      {section === 'Create Rule' ? <CreateRuleScreen onBack={() => onSection('Reason Rules')} onSaved={() => void loadCatalog()} /> : null}
      {section === 'Provider View' ? <ProviderViewScreen recipe={selected} payment={selectedPayment} onBack={() => onSection('Provider Rules')} /> : null}
      {section === 'Add Override' ? <AddOverrideScreen recipe={selected} onBack={() => onSection('Merchant Types')} onSaved={() => void loadCatalog()} /> : null}
      {section === 'Edit Override' ? <EditOverrideScreen recipe={selected} row={merchants.find((item) => item.id === selectedRecipeId) || merchants[0]} onBack={() => onSection('Merchant Types')} onSaved={() => void loadCatalog()} /> : null}

      {modal === 'requirement' && editing ? <RequirementModal row={editing} provider={titleCase(selected?.provider)} merchant={titleCase(selected?.merchant_category)} reason={titleCase(selected?.dispute_reason)} saving={saving} onClose={() => setModal(null)} onSave={saveRequirement} /> : null}
      {modal === 'evidence' ? <EvidenceTypeModal onClose={() => setModal(null)} /> : null}
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <article className={styles.stat}>
      <span className={styles[tone]}>{icon}</span>
      <strong>{value}</strong>
      <em>{label}</em>
    </article>
  );
}

function Filters({
  query,
  provider,
  merchant,
  status,
  providers,
  merchants,
  statuses,
  onQuery,
  onProvider,
  onMerchant,
  onStatus,
  categories = false,
}: {
  query: string;
  provider: string;
  merchant: string;
  status: string;
  providers: string[];
  merchants: string[];
  statuses: string[];
  onQuery: (value: string) => void;
  onProvider: (value: string) => void;
  onMerchant: (value: string) => void;
  onStatus: (value: string) => void;
  categories?: boolean;
}) {
  return (
    <div className={styles.filters}>
      <label className={styles.search}>
        <Search size={14} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search by reason, provider or merchant type..." aria-label="Search rules" />
      </label>
      {categories ? (
        <select aria-label="Category" defaultValue="All">
          <option>All Categories</option>
          <option>Logistics</option>
          <option>Order</option>
          <option>Communication</option>
          <option>Refund</option>
        </select>
      ) : (
        <>
          <select aria-label="Provider" value={provider} onChange={(event) => onProvider(event.target.value)}>
            <option value="All">All Providers</option>
            {providers.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Merchant type" value={merchant} onChange={(event) => onMerchant(event.target.value)}>
            <option value="All">All Merchant Types</option>
            {merchants.map((item) => <option key={item}>{item}</option>)}
          </select>
        </>
      )}
      <select aria-label="Status" value={status} onChange={(event) => onStatus(event.target.value)}>
        <option value="All">All Statuses</option>
        {statuses.map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>
  );
}

function ReasonTable({ rows, onView }: { rows: ReasonRow[]; onView: (id: string) => void }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>#</th>
          <th>Dispute Reason</th>
          <th>Provider</th>
          <th>Merchant Type</th>
          <th>Requirements</th>
          <th>Status</th>
          <th>Version</th>
          <th>Updated At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id}>
            <td>{index + 1}</td>
            <td>{row.reason}</td>
            <td>{row.provider === 'All' ? 'All' : <ProviderMark name={row.provider} />}</td>
            <td>{row.merchant}</td>
            <td>{row.requirements}</td>
            <td>{statusPill(row.status)}</td>
            <td>{row.version}</td>
            <td className={styles.oneLine}>{row.updated}</td>
            <td><button type="button" className={styles.link} onClick={() => onView(row.id)}>View</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Toggle({ on, tone = 'blue', locked = false, onToggle }: { on: boolean; tone?: 'blue' | 'green'; locked?: boolean; onToggle?: () => void }) {
  const toneClass = !on ? styles.swOff : tone === 'green' ? styles.swGreen : styles.swBlue;
  return (
    <button type="button" className={`${styles.sw} ${toneClass}`} aria-pressed={on} disabled={locked} onClick={onToggle}>
      <span />
    </button>
  );
}

function Chips({ items, onRemove }: { items: string[]; onRemove: (item: string) => void }) {
  return (
    <div className={styles.chips}>
      {items.map((item) => {
        const tone = item === 'Shopify' ? styles.chipGreen : item === 'E-commerce' || item === 'Travel' || item === 'Marketplace' || item === 'Tracking confirmation' || item === 'Delivery photo' || item === 'Signed receipt' || item === 'Carrier document' ? styles.chipGray : styles.chipBlue;
        return (
          <button key={item} type="button" className={`${styles.chip} ${tone}`} onClick={() => onRemove(item)}>
            {item} <X size={12} />
          </button>
        );
      })}
    </div>
  );
}

function RequirementModal({ row, provider, merchant, reason, saving, onClose, onSave }: { row: RequirementRow; provider: string; merchant: string; reason: string; saving: boolean; onClose: () => void; onSave: (priority: string) => void }) {
  const [providers, setProviders] = useState([provider].filter((item) => item && item !== '—'));
  const [merchants, setMerchants] = useState([merchant].filter((item) => item && item !== '—'));
  const [reasons, setReasons] = useState([reason].filter((item) => item && item !== '—'));
  const [accepted, setAccepted] = useState([row.type]);
  const [required, setRequired] = useState(row.mandatory);
  const [priority, setPriority] = useState(row.priority);
  return (
    <div className={styles.overlay} role="dialog" aria-label="Add or edit evidence requirement">
      <form className={styles.modal} onSubmit={(event) => { event.preventDefault(); void onSave(priority); }}>
        <div className={styles.modalHead}>
          <h3>Add Evidence Requirement</h3>
          <button type="button" className={styles.icon} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className={styles.split}>
          <div>
            <h4>Basic Information</h4>
            <label>Requirement Name *<input defaultValue={row.name || 'Proof of delivery'} required /></label>
            <div className={styles.pair}>
              <label>Evidence Type *
                <select defaultValue={row.type}>
                  <option>{row.type}</option>
                </select>
              </label>
              <label>Priority *
                <select value={priority} onChange={(event) => setPriority(event.target.value)} disabled={row.locked}>
                  <option>P0</option>
                  <option>P1</option>
                  <option>P2</option>
                  <option>P3</option>
                </select>
              </label>
            </div>
            <div className={styles.switchRow}>
              <span>Mandatory</span>
              <Toggle on={required} onToggle={() => setRequired((value) => !value)} />
              <em>Required for a complete response</em>
            </div>
            <label>Expected Strength *
              <select defaultValue={row.strength || 'High'}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label>What it Proves *<textarea rows={3} defaultValue="Shows package was delivered to the customer address." /></label>
            <label>Instructions for Users<textarea rows={3} defaultValue="Upload tracking screenshot, delivery confirmation or signed receipt showing delivery." /></label>
          </div>
          <div>
            <h4>Applicability</h4>
            <span>Applies to Provider(s)</span>
            <Chips items={providers} onRemove={(item) => setProviders((current) => current.filter((value) => value !== item))} />
            <span>Applies to Merchant Type(s)</span>
            <Chips items={merchants} onRemove={(item) => setMerchants((current) => current.filter((value) => value !== item))} />
            <span>Applies to Dispute Reason(s) *</span>
            <Chips items={reasons} onRemove={(item) => setReasons((current) => current.filter((value) => value !== item))} />
            <h4>Accepted Evidence Types *</h4>
            <Chips items={accepted} onRemove={(item) => setAccepted((current) => current.filter((value) => value !== item))} />
            <button type="button" className={styles.addRow} onClick={() => setAccepted((current) => current.includes('Carrier scan') ? current : [...current, 'Carrier scan'])}>Add more evidence types</button>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.ghost} onClick={onClose}>Cancel</button>
              <button type="submit" className={styles.primary} disabled={saving || !row.ruleId}>{saving ? 'Saving…' : 'Save Requirement'}</button>
        </div>
      </form>
    </div>
  );
}

function EvidenceTypeModal({ onClose }: { onClose: () => void }) {
  const [sources, setSources] = useState(['FedEx', 'UPS', 'USPS', 'DHL']);
  const [auto, setAuto] = useState(true);
  return (
    <div className={styles.overlay} role="dialog" aria-label="Edit evidence type">
      <form className={styles.modal} onSubmit={(event) => { event.preventDefault(); onClose(); }}>
        <div className={styles.modalHead}>
          <h3>Edit Evidence Type</h3>
          <button type="button" className={styles.icon} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className={styles.split}>
          <div>
            <label>Evidence Type Name *<input defaultValue="Carrier delivery confirmation" required /></label>
            <label>Category *
              <select defaultValue="Logistics">
                <option>Logistics</option>
                <option>Order</option>
                <option>Communication</option>
                <option>Refund</option>
              </select>
            </label>
            <label>Description *<textarea rows={3} defaultValue="Tracking or delivery confirmation document showing delivered status with date, tracking number and carrier." /></label>
            <span>Possible Sources</span>
            <Chips items={sources} onRemove={(item) => setSources((current) => current.filter((value) => value !== item))} />
            <span>Example Files</span>
            <div className={styles.files}>
              {['fedex_sample.pdf', 'ups_sample.png', 'usps_sample.pdf'].map((file) => (
                <figure key={file}>
                  <div className={styles.preview} aria-hidden="true">
                    <i /><i /><i /><i />
                  </div>
                  <figcaption>{file}</figcaption>
                </figure>
              ))}
              <button type="button" className={styles.addFile}>+ Add Example</button>
            </div>
          </div>
          <div>
            <h4>Identification Rules</h4>
            <label className={styles.keywords}>Keywords / Patterns (one per line)<textarea rows={6} defaultValue={'delivered\ntracking number\nshipment\ncarrier\nsigned by recipient'} /></label>
            <h4>Verification Settings</h4>
            <div className={`${styles.switchRow} ${styles.verifyRow}`}>
              <span>Can be automatically verified</span>
              <Toggle on={auto} onToggle={() => setAuto((value) => !value)} />
            </div>
            <span>Verification methods</span>
            <label className={styles.check}><input type="checkbox" defaultChecked /> API (if integrated)</label>
            <label className={styles.check}><input type="checkbox" defaultChecked /> AI document analysis</label>
            <label className={styles.check}><input type="checkbox" defaultChecked /> Manual review allowed</label>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.ghost} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.primary}>Save Changes</button>
        </div>
      </form>
    </div>
  );
}

function EvidenceCatalog({ types, onEdit }: { types: EvidenceTypeRow[]; onEdit: () => void }) {
  const [active, setActive] = useState<boolean[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  useEffect(() => {
    setActive(types.map(() => true));
  }, [types]);
  const rows = types.filter((row) => {
    if (category !== 'All' && row.category !== category) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${row.name} ${row.category} ${row.description}`.toLowerCase().includes(needle);
  });
  return (
    <>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search evidence types..." aria-label="Search evidence types" />
        </label>
        <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="All">All Categories</option>
          {[...new Set(types.map((row) => row.category))].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select aria-label="Status" defaultValue="All">
          <option>All Statuses</option>
          <option>Active</option>
        </select>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Evidence Type</th>
            <th>Category</th>
            <th>Description</th>
            <th>Source Examples</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const index = types.findIndex((item) => item.name === row.name);
            return (
              <tr key={row.name}>
                <td>{index + 1}</td>
                <td><span className={styles.docName}><FileText size={14} /> {row.name}</span></td>
                <td>{row.category}</td>
                <td>{row.description}</td>
                <td>{row.sources}</td>
                <td><Toggle tone="green" on={active[index]} onToggle={() => setActive((current) => current.map((value, item) => (item === index ? !value : value)))} /></td>
                <td><button type="button" className={styles.editBtn} onClick={onEdit}>Edit</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function ClassificationPanel({ rows: source }: { rows: ClassRow[] }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const rows = source.filter((row) => !needle || `${row.type} ${row.keywords} ${row.maps}`.toLowerCase().includes(needle));
  return (
    <>
      <div className={styles.head}>
        <div>
          <h3>Manual Evidence Classification Rules</h3>
          <p>Define how manual evidence files and text are classified and matched to requirements.</p>
        </div>
        <button type="button" className={styles.primary}><Plus size={16} /> Add Rule</button>
      </div>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search classification rules..." aria-label="Search classification rules" />
        </label>
        <select aria-label="Evidence type" defaultValue="All">
          <option>All Evidence Types</option>
          {source.map((row) => <option key={row.type}>{row.type}</option>)}
        </select>
        <select aria-label="Status" defaultValue="All">
          <option>All Statuses</option>
          <option>Active</option>
        </select>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Evidence Type</th>
            <th>Keywords / Patterns</th>
            <th>Maps To Requirement</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.type}>
              <td>{source.findIndex((item) => item.type === row.type) + 1}</td>
              <td>{row.type}</td>
              <td>{row.keywords}</td>
              <td>{row.maps}</td>
              <td>{row.confidence}</td>
              <td>{statusPill(row.status)}</td>
              <td><button type="button" className={styles.editBtn}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function leaveScreen(dirty: boolean, onBack: () => void) {
  if (!dirty || window.confirm('Leave this screen? Unsaved changes will be discarded.')) onBack();
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'The change was not saved.';
}

function merchantCode(value: string) {
  if (!value || value === 'All') return '';
  if (value === 'E-commerce') return 'ecommerce';
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function CreateRuleScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [family, setFamily] = useState('SCENARIO');
  const [provider, setProvider] = useState('STRIPE');
  const [disputeReason, setDisputeReason] = useState('PRODUCT_NOT_RECEIVED');
  const [merchant, setMerchant] = useState('');
  const [fulfilment, setFulfilment] = useState('PHYSICAL_DELIVERY');
  const [priority, setPriority] = useState('P1');
  const [strength, setStrength] = useState('HIGH');
  const [mandatory, setMandatoryFlag] = useState(true);
  const [manual, setManual] = useState(true);
  const [ruleId, setRuleId] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [validated, setValidated] = useState(false);
  const [tested, setTested] = useState(false);
  const [approved, setApproved] = useState(false);
  function mark<T>(value: T, apply: (next: T) => void) {
    apply(value);
    setDirty(true);
    setValidated(false);
    setTested(false);
    setApproved(false);
    setNotice('');
  }
  function payload() {
    return {
      name,
      description,
      change_reason: changeReason,
      rule_family: family,
      providers: [provider],
      dispute_reasons: [disputeReason],
      merchant_types: merchant ? [merchant] : [],
      fulfilment_models: [fulfilment],
      requirements: [{
        requirement_code: 'SCENARIO_EVIDENCE',
        evidence_type: 'ORDER_RECORD',
        claim_supported: description,
        priority,
        mandatory,
        expected_strength: strength,
        accepted_evidence_types: ['ORDER_RECORD'],
        manual_allowed: manual,
      }],
    };
  }
  async function saveDraft() {
    if (!name.trim() || !description.trim() || !changeReason.trim()) {
      setNotice('Rule name, description, and change reason are required.');
      return;
    }
    setBusy(true);
    try {
      const saved = await postGovernedRule('/api/chargebacks/admin/rules', payload());
      setRuleId(String(saved.rule?.rule_id || ''));
      setDirty(false);
      setNotice('Draft saved. Live cases are unchanged.');
      onSaved();
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function validate() {
    if (!ruleId) {
      setNotice('Save the draft first.');
      return;
    }
    setBusy(true);
    try {
      const report = await postGovernedRule(`/api/chargebacks/admin/rules/${encodeURIComponent(ruleId)}/validate`, {});
      setValidated(Boolean(report.ok));
      setNotice(report.ok ? 'Validation passed. This draft does not change live cases.' : (report.errors || ['Validation failed.']).join(' '));
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function run(action: 'test' | 'approve' | 'activate') {
    setBusy(true);
    try {
      const saved = await postGovernedRule(`/api/chargebacks/admin/rules/${encodeURIComponent(ruleId)}/${action}`, {});
      const status = String(saved.rule?.status || '');
      if (action === 'test') setTested(status === 'TEST');
      if (action === 'approve') setApproved(status === 'APPROVED');
      setNotice(action === 'activate' ? 'The approved version is now active.' : `Status is ${titleCase(status)}. Live cases stay on the previous active version until activation.`);
      onSaved();
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className={styles.crumb}>Reason Rules <ChevronRight size={12} /> Create Rule</p>
      <div className={styles.head}>
        <div>
          <h2>Create Rule</h2>
          <p>New reason or scenario rule. Saving keeps a draft and does not activate it.</p>
        </div>
      </div>
      <div className={styles.formGrid}>
        <label>Rule name<input value={name} onChange={(event) => mark(event.target.value, setName)} /></label>
        <label>Rule family
          <select value={family} onChange={(event) => mark(event.target.value, setFamily)}>
            <option value="SCENARIO">Reason / Scenario</option>
            <option value="PROVIDER_REASON">Provider + Reason</option>
            <option value="CONTEXT">Context refinement</option>
            <option value="FALLBACK">Fallback</option>
          </select>
        </label>
        <label className={styles.wide}>Description<textarea rows={3} value={description} onChange={(event) => mark(event.target.value, setDescription)} /></label>
        <label>Provider
          <select value={provider} onChange={(event) => mark(event.target.value, setProvider)}>
            <option value="STRIPE">Stripe</option>
            <option value="PAYPAL">PayPal</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <label>Normalized dispute reason
          <select value={disputeReason} onChange={(event) => mark(event.target.value, setDisputeReason)}>
            <option value="PRODUCT_NOT_RECEIVED">Product Not Received</option>
            <option value="FRAUDULENT">Fraudulent</option>
            <option value="PRODUCT_UNACCEPTABLE">Product Unacceptable</option>
          </select>
        </label>
        <label>Merchant type
          <select value={merchant} onChange={(event) => mark(event.target.value, setMerchant)}>
            <option value="">All</option>
            <option value="ecommerce">E-commerce</option>
            <option value="saas">SaaS</option>
            <option value="travel">Travel</option>
            <option value="marketplace">Marketplace</option>
          </select>
        </label>
        <label>Fulfilment model
          <select value={fulfilment} onChange={(event) => mark(event.target.value, setFulfilment)}>
            <option value="PHYSICAL_DELIVERY">Physical delivery</option>
            <option value="DIGITAL_DELIVERY">Digital delivery</option>
            <option value="SERVICE_USE">Service use</option>
            <option value="PICKUP">Pickup</option>
          </select>
        </label>
        <label>Priority
          <select value={priority} onChange={(event) => mark(event.target.value, setPriority)} aria-label="Evidence priority">
            <option value="P0_ASKTILL_CRITICAL">P0 AskTill Critical</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </label>
        <label>Expected strength
          <select value={strength} onChange={(event) => mark(event.target.value, setStrength)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="DECISIVE">Decisive</option>
          </select>
        </label>
        <label className={styles.check}><input type="checkbox" checked={mandatory} onChange={(event) => mark(event.target.checked, setMandatoryFlag)} /> Mandatory</label>
        <label className={styles.check}><input type="checkbox" checked={manual} onChange={(event) => mark(event.target.checked, setManual)} /> Manual evidence allowed</label>
        <label className={styles.wide}>Change reason<textarea rows={2} value={changeReason} onChange={(event) => mark(event.target.value, setChangeReason)} /></label>
      </div>
      {notice ? <p className={styles.crumb}>{notice}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={() => leaveScreen(dirty, onBack)}>Cancel</button>
        <button type="button" className={styles.ghost} disabled={busy} onClick={() => void saveDraft()}>Save Draft</button>
        <button type="button" className={styles.ghost} disabled={busy} onClick={() => void validate()}>Validate</button>
        <button type="button" className={styles.ghost} disabled={busy || !validated} onClick={() => void run('test')}>Test Rule</button>
        <button type="button" className={styles.ghost} disabled={busy || !tested} onClick={() => void run('approve')}>Submit for Approval</button>
        <button type="button" className={styles.primary} disabled={busy || !approved} onClick={() => void run('activate')}>Activate</button>
      </div>
    </>
  );
}

function ProviderViewScreen({ recipe, payment, onBack }: { recipe?: EvidenceRecipe; payment: string; onBack: () => void }) {
  const locked = (recipe?.requirements || []).some((item) => item.provider_lock || String(item.priority || '').toUpperCase() === 'P0');
  return (
    <>
      <p className={styles.crumb}>Provider Rules <ChevronRight size={12} /> View</p>
      <div className={styles.head}>
        <div>
          <h2>Provider Rule View {locked ? <Lock size={16} aria-label="Locked" /> : null}</h2>
          <p>Read-only provider rule. A locked provider requirement cannot be edited here.</p>
        </div>
        <button type="button" className={styles.ghost} onClick={onBack}>Back</button>
      </div>
      <div className={styles.note}>
        <span>Identity</span>
        <p>{recipe?.recipe_id || '—'} · {payment || '—'} · {titleCase(recipe?.dispute_reason)} · {titleCase(recipe?.status || 'ACTIVE')} · {recipe?.recipe_version || '—'}</p>
        <span>Authority</span>
        <p>{locked ? 'P0 provider required · locked' : 'AskTill rule · not a locked provider-hard rule'}</p>
        <span>Requirement mapping</span>
        <p>{(recipe?.requirements || []).map((item) => `${item.display_name || titleCase(item.code)} → ${titleCase(item.code)}`).join(' · ') || '—'}</p>
        <span>Version</span>
        <p>{recipe?.recipe_version || recipe?.recipe_id || '—'} · {when(recipe?.activated_at || recipe?.created_at)}</p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={locked} title={locked ? 'Locked provider rules cannot be edited in place' : 'Creates a mapping draft'}>Create Mapping Update</button>
      </div>
    </>
  );
}

function AddOverrideScreen({ recipe, onBack, onSaved }: { recipe?: EvidenceRecipe; onBack: () => void; onSaved: () => void }) {
  const base = recipe?.requirements?.[0];
  const baseName = base?.display_name || titleCase(base?.code);
  const [name, setName] = useState('');
  const [merchant, setMerchant] = useState('ecommerce');
  const [provider, setProvider] = useState((recipe?.provider || 'ALL').toUpperCase() || 'ALL');
  const [accepted, setAccepted] = useState(baseName && baseName !== '—' ? baseName : '');
  const [reason, setReason] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const locked = Boolean(base?.provider_lock || String(base?.priority || '').toUpperCase() === 'P0');
  async function save() {
    if (!reason.trim() || !name.trim()) {
      setNotice('Override name and a reason are required.');
      return;
    }
    setBusy(true);
    try {
      await postGovernedRule('/api/chargebacks/admin/merchant-type-overrides', {
        name,
        merchant_type: merchantCode(merchant),
        provider,
        dispute_reason: reasonKey(recipe?.dispute_reason),
        base_rule_id: recipe?.recipe_id,
        base_rule_version: recipe?.recipe_version,
        requirement_code: base?.code,
        changes: locked ? {} : { accepted_evidence_types: accepted.split(',').map((item) => item.trim()).filter(Boolean) },
        change_reason: reason,
      });
      setDirty(false);
      setNotice('Draft override saved. Live cases are unchanged.');
      onSaved();
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className={styles.crumb}>Merchant Types <ChevronRight size={12} /> Add Override</p>
      <div className={styles.head}>
        <div>
          <h2>Add Merchant-Type Override</h2>
          <p>Starts from the base rule. Save keeps a draft and does not change live cases.</p>
        </div>
      </div>
      <div className={styles.compare}>
        <div>
          <strong>Base rule</strong>
          <p>{recipe?.recipe_id || '—'} · {titleCase(recipe?.dispute_reason)}</p>
          <p>{baseName} · {String(base?.priority || 'P1').toUpperCase()} · Mandatory {base?.mandatory || base?.provider_lock ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <strong>Proposed override</strong>
          <p>{accepted || 'No change yet'}</p>
          <p>{locked ? 'Provider hard requirements stay unchanged.' : 'Draft only until approval.'}</p>
        </div>
      </div>
      <div className={styles.formGrid}>
        <label>Override name<input value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} /></label>
        <label>Merchant type
          <select value={merchant} onChange={(event) => { setMerchant(event.target.value); setDirty(true); }}>
            <option value="ecommerce">E-commerce</option>
            <option value="saas">SaaS</option>
            <option value="travel">Travel</option>
            <option value="marketplace">Marketplace</option>
            <option value="subscription">Subscription</option>
            <option value="services">Services</option>
          </select>
        </label>
        <label>Provider scope
          <select value={provider} onChange={(event) => { setProvider(event.target.value); setDirty(true); }}>
            <option value="ALL">All</option>
            <option value="STRIPE">Stripe</option>
            <option value="PAYPAL">PayPal</option>
          </select>
        </label>
        <label>Dispute reason<input readOnly value={titleCase(recipe?.dispute_reason)} /></label>
        <label className={styles.wide}>Accepted evidence<textarea rows={2} value={accepted} disabled={locked} onChange={(event) => { setAccepted(event.target.value); setDirty(true); }} /></label>
        <label className={styles.wide}>Reason for override<textarea rows={2} value={reason} onChange={(event) => { setReason(event.target.value); setDirty(true); }} /></label>
      </div>
      {locked ? <p className={styles.crumb}><Lock size={12} /> This base requirement is locked. The override cannot weaken it.</p> : null}
      {notice ? <p className={styles.crumb}>{notice}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={() => leaveScreen(dirty, onBack)}>Cancel</button>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => void save()}>Save Override</button>
      </div>
    </>
  );
}

function EditOverrideScreen({ recipe, row, onBack, onSaved }: { recipe?: EvidenceRecipe; row?: MerchantRow; onBack: () => void; onSaved: () => void }) {
  const active = String(row?.status || recipe?.status || '').toLowerCase() === 'active';
  const base = recipe?.requirements?.[0];
  const locked = Boolean(base?.provider_lock || String(base?.priority || '').toUpperCase() === 'P0');
  const [confidence, setConfidence] = useState('0.90');
  const [reason, setReason] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function save() {
    if (!reason.trim()) {
      setNotice('A change reason is required.');
      return;
    }
    const confidenceValue = Number(confidence);
    if (!locked && (Number.isNaN(confidenceValue) || confidenceValue < 0 || confidenceValue > 1)) {
      setNotice('Confidence must be between 0 and 1.');
      return;
    }
    const changes = locked ? {} : { min_confidence: confidenceValue };
    setBusy(true);
    try {
      if (active) {
        await postGovernedRule('/api/chargebacks/admin/merchant-type-overrides', {
          name: row?.type || 'Override',
          merchant_type: merchantCode(row?.type || ''),
          provider: (row?.provider || recipe?.provider || 'ALL').toUpperCase(),
          dispute_reason: reasonKey(recipe?.dispute_reason || row?.reason),
          base_rule_id: recipe?.recipe_id,
          requirement_code: base?.code,
          changes,
          change_reason: reason,
        });
      } else if (row?.id) {
        await postGovernedRule(`/api/chargebacks/admin/merchant-type-overrides/${encodeURIComponent(row.id)}/versions`, {
          changes,
          change_reason: reason,
        }, String(row.revision || recipe?.revision || ''));
      }
      setDirty(false);
      setNotice(active ? 'A new draft version was saved. The active override was not changed.' : 'Draft version saved.');
      onSaved();
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className={styles.crumb}>Merchant Types <ChevronRight size={12} /> Edit</p>
      <div className={styles.head}>
        <div>
          <h2>{active ? 'New draft from active override' : 'Edit override draft'}</h2>
          <p>{row ? `${row.type} · ${row.reason}` : 'Select an override from Merchant Types.'} {active ? 'The active row stays unchanged.' : ''}</p>
        </div>
      </div>
      <div className={styles.compare}>
        <div>
          <strong>Current {active ? 'active' : 'draft'}</strong>
          <p>{base?.display_name || titleCase(base?.code)} · {String(base?.priority || 'P1').toUpperCase()}</p>
          <p>Confidence 0.90</p>
        </div>
        <div>
          <strong>Proposed draft</strong>
          <p>Confidence {confidence}</p>
          <p>{reason || 'Add a change reason before saving.'}</p>
        </div>
      </div>
      <div className={styles.formGrid}>
        <label>Confidence
          <input value={confidence} disabled={locked} onChange={(event) => { setConfidence(event.target.value); setDirty(true); }} />
        </label>
        <label className={styles.wide}>Change reason<textarea rows={2} value={reason} onChange={(event) => { setReason(event.target.value); setDirty(true); }} /></label>
      </div>
      {locked ? <p className={styles.crumb}><Lock size={12} /> Locked provider values stay disabled.</p> : null}
      {notice ? <p className={styles.crumb}>{notice}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={() => leaveScreen(dirty, onBack)}>Cancel</button>
        <button type="button" className={styles.primary} disabled={busy || !row} onClick={() => void save()}>Save Draft Version</button>
      </div>
    </>
  );
}

function MerchantPanel({ rows: source, onEdit }: { rows: MerchantRow[]; onEdit: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const needle = query.trim().toLowerCase();
  const rows = source.filter((row) => {
    if (providerFilter !== 'All' && row.provider !== providerFilter) return false;
    return !needle || `${row.type} ${row.provider} ${row.reason}`.toLowerCase().includes(needle);
  });
  return (
    <>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant type..." aria-label="Search merchant type" />
        </label>
        <select aria-label="Provider" value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
          <option value="All">All Providers</option>
          <option>Stripe</option>
          <option>PayPal</option>
          <option>Shopify</option>
        </select>
        <select aria-label="Status" defaultValue="All">
          <option>All Statuses</option>
          <option>Active</option>
        </select>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Merchant Type</th>
            <th>Provider</th>
            <th>Dispute Reason</th>
            <th>Override Changes</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{source.findIndex((item) => item.id === row.id) + 1}</td>
              <td>{row.type}</td>
              <td><ProviderMark name={row.provider} /></td>
              <td>{row.reason}</td>
              <td className={styles.changes}>{row.changes}</td>
              <td>{statusPill(row.status)}</td>
              <td><button type="button" className={styles.editBtn} onClick={() => onEdit(row.id)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function VersionList({ rows: source, onView }: { rows: VersionRow[]; onView: () => void }) {
  const [view, setView] = useState('All');
  const names = [...new Set(source.map((row) => row.version))];
  const rows = source.filter((row) => view === 'All' || row.version === view);
  return (
    <>
      <div className={styles.filters}>
        <label className={styles.inline}>View
          <select aria-label="Version view" value={view} onChange={(event) => setView(event.target.value)}>
            <option value="All">All Versions</option>
            {names.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <ol className={styles.versions}>
        {rows.map((row, index) => (
          <li key={`${row.version}-${index}`}>
            <div className={styles.versionBadge}>
              <strong className={row.active ? styles.verOn : styles.ver}>{row.version}</strong>
              {row.active ? <span className={styles.active}>Active</span> : null}
            </div>
            <div className={styles.versionMeta}>
              <span>{row.at}</span>
              <span>{row.by}</span>
            </div>
            <ul>
              {row.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
            <button type="button" className={styles.editBtn} onClick={onView}>View</button>
          </li>
        ))}
      </ol>
    </>
  );
}

