import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

import { getStripeConnection, startSandboxCheckout } from '../lib/chargebacksClient';
import styles from './AtChargebacksPage.module.css';
import payStyles from './ChargebacksPayPage.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

const PRESETS = [10, 25, 50, 100] as const;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 500;

const wideStyle = {
  width: 'calc(100vw - var(--sidebar-width, 220px))',
  maxWidth: 'none',
} as const;

function parseAmount(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export default function ChargebacksPayPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [preset, setPreset] = useState<number | 'custom'>(25);
  const [custom, setCustom] = useState('25');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStripeConnection()
      .then((body) => {
        if (cancelled) return;
        setConnected(body.status === 'active' && Boolean(body.connection));
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const amount = useMemo(() => {
    if (preset === 'custom') return parseAmount(custom);
    return preset;
  }, [preset, custom]);

  const valid =
    amount != null && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;

  async function onContinue() {
    if (!valid || amount == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const url = await startSandboxCheckout(amount);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open payment.');
      setBusy(false);
    }
  }

  if (!checking && !connected) {
    return <Navigate to="/dashboard/chargebacks" replace />;
  }

  return (
    <div className={styles.chargePage} style={wideStyle}>
      <div className={styles.main}>
        <div className={styles.fullWrap}>
          <div className={styles.titleChrome}>
            <div className={headerStyles.headerRow}>
              <div>
                <h1 className={headerStyles.h1}>
                  <span className={styles.titleAccent}>Pay.</span>
                </h1>
              </div>
              <Link to="/dashboard/chargebacks" className={payStyles.back}>
                ← Money Reclaimed
              </Link>
            </div>
          </div>
          <div className={styles.scrollViewport}>
            <section className={payStyles.card}>
              <p className={payStyles.lead}>Choose how much you want to pay.</p>
              <div className={payStyles.presets} role="group" aria-label="Payment amount">
                {PRESETS.map((value) => {
                  const selected = preset === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`${payStyles.chip} ${selected ? payStyles.chipOn : ''}`}
                      onClick={() => {
                        setPreset(value);
                        setCustom(String(value));
                        setError(null);
                      }}
                    >
                      ${value}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`${payStyles.chip} ${preset === 'custom' ? payStyles.chipOn : ''}`}
                  onClick={() => setPreset('custom')}
                >
                  Other
                </button>
              </div>
              <label className={payStyles.label} htmlFor="pay-amount">
                Amount (USD)
              </label>
              <div className={payStyles.inputRow}>
                <span className={payStyles.dollar}>$</span>
                <input
                  id="pay-amount"
                  className={payStyles.input}
                  type="number"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  step="0.01"
                  inputMode="decimal"
                  value={preset === 'custom' ? custom : String(preset)}
                  onChange={(e) => {
                    setPreset('custom');
                    setCustom(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              <p className={payStyles.hint}>$1–$500. You’ll finish on Stripe’s payment page.</p>
              {error ? <p className={payStyles.error}>{error}</p> : null}
              <button
                type="button"
                className={payStyles.pay}
                disabled={!valid || busy || checking}
                onClick={() => void onContinue()}
              >
                <CreditCard size={16} />
                {busy
                  ? 'Opening…'
                  : valid
                    ? `Continue · $${amount!.toFixed(2)}`
                    : 'Enter an amount'}
              </button>
              <button
                type="button"
                className={payStyles.cancel}
                disabled={busy}
                onClick={() => navigate('/dashboard/chargebacks')}
              >
                Cancel
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
