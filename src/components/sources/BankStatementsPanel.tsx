import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import {
  businessIdFromUser,
  downloadBankStatementPdf,
  fetchBankStatements,
  pullBankStatements,
  type BankStatementMeta,
} from '../../lib/plaidClient';
import { parseAndIngestPlaidStatements } from '../../lib/plaidIngest';
import {
  defaultCustomMonthRange,
  filterStatementsByRange,
  isValidCustomMonthRange,
  loadStatementRangePreference,
  resolveStatementRange,
  saveStatementRangePreference,
  STATEMENT_RANGE_OPTIONS,
  statementRangeLabel,
  statementRangeToRequest,
  yearOptions,
  type CustomMonthRange,
  type StatementRangePreset,
} from '../../lib/statementRange';

import styles from './BankStatementsPanel.module.css';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function statementLabel(st: BankStatementMeta): string {
  const monthName = MONTHS[(st.month || 1) - 1] || `Month ${st.month}`;
  return `${monthName} ${st.year}`;
}

function accountLabel(st: BankStatementMeta): string {
  const name = st.account_name?.trim() || 'Account';
  return st.account_mask ? `${name} ···${st.account_mask}` : name;
}

type Props = {
  refreshKey?: number;
  compact?: boolean;
};

/**
 * Statements stay hidden until the user opts in; choosing a period loads and shows them.
 */
export default function BankStatementsPanel({ refreshKey = 0, compact = false }: Props) {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [shown, setShown] = useState(false);
  const [statements, setStatements] = useState<BankStatementMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [preset, setPreset] = useState<StatementRangePreset>('3m');
  const [custom, setCustom] = useState<CustomMonthRange>(() => defaultCustomMonthRange());
  const rangeInitialized = useRef(false);

  const businessId = user?.userId?.trim() ? businessIdFromUser(user.userId) : null;
  const years = useMemo(() => yearOptions(), []);

  const activeRange = useMemo(
    () => resolveStatementRange(preset, preset === 'custom' ? custom : undefined),
    [preset, custom],
  );
  const rangeRequest = useMemo(() => statementRangeToRequest(activeRange), [activeRange]);
  const customValid = preset !== 'custom' || isValidCustomMonthRange(custom);

  useEffect(() => {
    if (!businessId || rangeInitialized.current) return;
    rangeInitialized.current = true;
    const saved = loadStatementRangePreference(businessId);
    setPreset(saved.preset);
    setCustom(saved.custom);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    saveStatementRangePreference(businessId, preset, custom);
  }, [businessId, preset, custom]);

  const applyRangeFilter = useCallback(
    (rows: BankStatementMeta[]) => filterStatementsByRange(rows, activeRange),
    [activeRange],
  );

  const loadStatements = useCallback(async () => {
    if (!businessId) {
      setStatements([]);
      setLoading(false);
      return;
    }
    if (!customValid) {
      setStatements([]);
      setLoading(false);
      setError('Pick a valid from/to month and year.');
      return;
    }
    setLoading(true);
    setError(null);
    setStatements([]);
    try {
      const rows = await fetchBankStatements(businessId, rangeRequest);
      setStatements(applyRangeFilter(rows));
      setShown(true);
    } catch (err) {
      setStatements([]);
      setError(err instanceof Error ? err.message : 'Could not load bank statements.');
    } finally {
      setLoading(false);
    }
  }, [businessId, rangeRequest, applyRangeFilter, customValid]);

  useEffect(() => {
    if (!revealed || !businessId || !customValid) return;
    void loadStatements();
  }, [revealed, businessId, customValid, rangeRequest, refreshKey, loadStatements]);

  const onPresetChange = (next: StatementRangePreset) => {
    setPreset(next);
    setHint(null);
    if (next === 'custom' && !isValidCustomMonthRange(custom)) {
      setCustom(defaultCustomMonthRange());
    }
  };

  const onFetch = async () => {
    if (!businessId || !customValid) return;
    setPulling(true);
    setError(null);
    setHint(null);
    try {
      const { statements: next } = await pullBankStatements(businessId, rangeRequest);
      const filtered = applyRangeFilter(next);
      setStatements(filtered);
      setShown(true);
      if (filtered.length === 0) {
        setHint(
          `No PDF statements for ${statementRangeLabel(activeRange)}. Try a wider range, or upload below.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch bank statements.');
    } finally {
      setPulling(false);
    }
  };

  const onImportForAnalysis = async () => {
    if (!businessId || !customValid) return;
    setImporting(true);
    setError(null);
    setHint(null);
    try {
      const { ingest, parsed } = await parseAndIngestPlaidStatements(businessId, rangeRequest);
      const saved = ingest?.success_count ?? 0;
      const failed = ingest?.failure_count ?? 0;
      if (saved > 0) {
        setHint(
          `Imported ${saved} statement month(s) for analysis` +
            (failed > 0 ? ` (${failed} could not be imported).` : '.'),
        );
      } else if (parsed.some((p) => p.ok)) {
        setHint('Statements parsed but could not be saved — check for duplicate months.');
      } else {
        setHint('No statements could be parsed. Try Fetch statements first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import statements for analysis.');
    } finally {
      setImporting(false);
    }
  };

  const onDownload = async (st: BankStatementMeta) => {
    if (!businessId) return;
    setDownloadingId(st.statement_id);
    setError(null);
    try {
      const { blob, filename } = await downloadBankStatementPdf(businessId, st.statement_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download statement.');
    } finally {
      setDownloadingId(null);
    }
  };

  const setCustomPart = (part: Partial<CustomMonthRange>) => {
    setCustom((prev) => ({ ...prev, ...part }));
    setHint(null);
  };

  const onHideStatements = () => {
    setRevealed(false);
    setShown(false);
    setStatements([]);
    setError(null);
    setHint(null);
  };

  if (!revealed) {
    return (
      <section
        className={`${styles.section} ${compact ? styles.compact : ''}`}
        aria-labelledby="bank-statements-reveal"
      >
        <div className={styles.revealCard}>
          <span className={styles.revealIcon} aria-hidden>
            <i className="ti ti-file-text" />
          </span>
          <div className={styles.revealText}>
            <h2 id="bank-statements-reveal" className={styles.title}>
              Bank statements
            </h2>
            {!compact ? (
              <p className={styles.sub}>
                Want to see your statement PDFs from linked banks? Pick a month range next — nothing
                loads until you choose.
              </p>
            ) : (
              <p className={styles.sub}>PDF statements from your linked bank</p>
            )}
          </div>
          <button
            type="button"
            className={styles.revealBtn}
            onClick={() => setRevealed(true)}
            disabled={!businessId}
          >
            <i className="ti ti-eye" aria-hidden />
            {compact ? 'Show statements' : 'Want to see your statements?'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${styles.section} ${compact ? styles.compact : ''}`}
      aria-labelledby="bank-statements-title"
    >
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id="bank-statements-title" className={styles.title}>
            <i className={`ti ti-file-text ${styles.titleIcon}`} aria-hidden />
            Bank Statements
          </h2>
          {!compact ? (
            <p className={styles.sub}>
              Choose a period to view PDFs. Fetch from bank or import for analysis when you are ready.
            </p>
          ) : (
            <p className={styles.sub}>Pick a period to view or fetch PDFs</p>
          )}
        </div>
        {shown ? (
          <button type="button" className={styles.hideBtn} onClick={onHideStatements}>
            Hide statements
          </button>
        ) : null}
      </div>

      <div className={styles.rangeBar}>
        <label className={styles.rangeField}>
          <span className={styles.rangeLabel}>Period</span>
          <select
            className={styles.rangeSelect}
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as StatementRangePreset)}
            disabled={pulling || loading}
          >
            {STATEMENT_RANGE_OPTIONS.map((opt) => (
              <option key={opt.preset} value={opt.preset}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {preset === 'custom' ? (
          <>
            <div className={styles.customGroup}>
              <span className={styles.rangeLabel}>From</span>
              <div className={styles.customRow}>
                <select
                  className={styles.rangeSelect}
                  value={custom.startMonth}
                  onChange={(e) => setCustomPart({ startMonth: Number(e.target.value) })}
                  disabled={pulling || loading}
                >
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.rangeSelect}
                  value={custom.startYear}
                  onChange={(e) => setCustomPart({ startYear: Number(e.target.value) })}
                  disabled={pulling || loading}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.customGroup}>
              <span className={styles.rangeLabel}>To</span>
              <div className={styles.customRow}>
                <select
                  className={styles.rangeSelect}
                  value={custom.endMonth}
                  onChange={(e) => setCustomPart({ endMonth: Number(e.target.value) })}
                  disabled={pulling || loading}
                >
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.rangeSelect}
                  value={custom.endYear}
                  onChange={(e) => setCustomPart({ endYear: Number(e.target.value) })}
                  disabled={pulling || loading}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.rangeSummary}>
            {loading || pulling
              ? `Loading ${statementRangeLabel(activeRange)}…`
              : `Showing ${statementRangeLabel(activeRange)}`}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void onFetch()}
            disabled={!businessId || pulling || loading || !customValid}
          >
            <i className={`ti ${pulling ? 'ti-loader-2' : 'ti-cloud-download'}`} aria-hidden />
            {pulling ? 'Fetching…' : 'Fetch from bank'}
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void onImportForAnalysis()}
            disabled={!businessId || pulling || loading || importing || !customValid || statements.length === 0}
          >
            <i className={`ti ${importing ? 'ti-loader-2' : 'ti-database-import'}`} aria-hidden />
            {importing ? 'Importing…' : 'Import for analysis'}
          </button>
        </div>
      </div>

      {error ? (
        <p className={styles.err} role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className={styles.hint} role="status">
          {hint}
        </p>
      ) : null}

      {loading || pulling ? (
        <p className={styles.muted}>Loading bank statements…</p>
      ) : statements.length === 0 ? (
        <div className={styles.empty}>
          <i className={`ti ti-file-text ${styles.emptyIcon}`} aria-hidden />
          <p className={styles.emptyTitle}>No bank statements in this period</p>
          <p className={styles.emptyBody}>
            Try a wider range, Fetch from bank, or upload a PDF below.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {statements.map((st) => (
            <li key={st.statement_id} className={styles.card}>
              <span className={styles.icon} aria-hidden>
                <i className="ti ti-file-text" />
              </span>
              <div className={styles.main}>
                <div className={styles.period}>{statementLabel(st)}</div>
                <div className={styles.bank}>{st.institution_name || 'Linked bank'}</div>
                <div className={styles.meta}>{accountLabel(st)}</div>
              </div>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={() => void onDownload(st)}
                disabled={downloadingId === st.statement_id}
              >
                <i
                  className={`ti ${
                    downloadingId === st.statement_id ? 'ti-loader-2' : 'ti-download'
                  }`}
                  aria-hidden
                />
                {downloadingId === st.statement_id ? 'Downloading…' : 'Download PDF'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
