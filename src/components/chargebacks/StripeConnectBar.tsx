import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Link2, Unlink } from 'lucide-react';
import {
  disconnectStripe,
  getStripeConnection,
  readCachedStripeConnection,
  startStripeConnect,
  writeCachedStripeConnection,
  type StripeConnectionView,
} from '../../lib/chargebacksClient';
import ConnectLiveMonitor from './ConnectLiveMonitor';
import bar from './ConnectBar.module.css';

const SLOW_POLL_MS = 8000;
const BURST_POLL_MS = 3000;
const BURST_FOR_MS = 90_000;

export default function StripeConnectBar({ onChanged }: { onChanged?: () => void }) {
  const navigate = useNavigate();
  const cached = readCachedStripeConnection();
  const [ready, setReady] = useState(Boolean(cached?.connection));
  const [status, setStatus] = useState(cached?.status || 'disconnected');
  const [connection, setConnection] = useState<StripeConnectionView | null>(cached?.connection ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const burstUntil = useRef(0);
  const lastPay = useRef(cached?.connection?.last_pay_at || '');
  const lastDispute = useRef(cached?.connection?.last_dispute_at || '');

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const body = await getStripeConnection();
      setReady(true);
      setStatus(body.status || 'disconnected');
      setConnection(body.connection);
      writeCachedStripeConnection(body);
      const pay = body.connection?.last_pay_at || '';
      const dispute = body.connection?.last_dispute_at || '';
      if (pay !== lastPay.current || dispute !== lastDispute.current) {
        lastPay.current = pay;
        lastDispute.current = dispute;
        onChangedRef.current?.();
      }
    } catch (err) {
      if (readCachedStripeConnection()?.connection) {
        setReady(true);
        return;
      }
      setReady(false);
      setStatus('disconnected');
      setConnection(null);
      setError(err instanceof Error ? err.message : 'Could not load Stripe connection.');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('stripe');
    const pay = params.get('pay');
    if (flag === 'connected') setNotice('Stripe connected.');
    if (flag === 'denied') setNotice('Stripe connect was cancelled.');
    if (flag === 'error') setNotice('Connect did not finish. Try again.');
    if (pay === 'success') {
      setNotice('Payment received. New disputes show in this table.');
      burstUntil.current = Date.now() + BURST_FOR_MS;
      window.setTimeout(() => onChangedRef.current?.(), 2000);
    }
    if (pay === 'cancel') setNotice('Payment was cancelled.');
    if (flag || pay) {
      params.delete('stripe');
      params.delete('pay');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', next);
    }
    void refresh();
  }, [refresh]);

  const connected = status === 'active' && connection;

  useEffect(() => {
    if (!connected) return;
    let timer = 0;
    let stopped = false;
    const loop = () => {
      const delay = Date.now() < burstUntil.current ? BURST_POLL_MS : SLOW_POLL_MS;
      timer = window.setTimeout(async () => {
        if (stopped) return;
        await refresh();
        if (!stopped) loop();
      }, delay);
    };
    loop();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [connected, refresh]);

  async function onConnect() {
    if (inFlight.current || busy || !ready) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const mode = await startStripeConnect();
      if (mode === 'sandbox') {
        await refresh();
        onChanged?.();
        setNotice('Stripe connected.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connect failed.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function onDisconnect() {
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    setStatus('disconnected');
    setConnection(null);
    writeCachedStripeConnection(null);
    try {
      await disconnectStripe();
      await refresh();
      onChanged?.();
      setNotice('Stripe disconnected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed.');
      await refresh();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className={bar.card}>
      <div className={bar.row}>
        <div className={bar.brand}>
          <div className={bar.title}>Stripe</div>
          <div className={bar.meta}>
            {!ready
              ? 'Chargebacks API is not running.'
              : connected
                ? `Connected · ${connection.stripe_account_id}`
                : busy
                  ? 'Working…'
                  : 'Not connected'}
          </div>
        </div>
        {connected ? (
          <>
            <div className={bar.monitor}>
              <ConnectLiveMonitor
                stamps={[
                  { label: 'Connected', at: connection.connected_at },
                  { label: 'Last pay', at: connection.last_pay_at },
                  { label: 'Dispute raised', at: connection.last_dispute_at },
                ]}
              />
            </div>
            <button
              type="button"
              className={bar.primary}
              onClick={() => navigate('/dashboard/chargebacks/pay')}
              disabled={busy}
              style={{ cursor: busy ? 'wait' : 'pointer' }}
            >
              <CreditCard size={14} /> Pay
            </button>
            <button
              type="button"
              className={bar.ghost}
              onClick={() => void onDisconnect()}
              disabled={busy}
              style={{ cursor: busy ? 'wait' : 'pointer' }}
            >
              <Unlink size={14} /> {busy ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`${bar.connect} ${bar.connectEnd}`}
            onClick={() => void onConnect()}
            disabled={busy || !ready}
          >
            <Link2 size={14} /> {busy ? 'Connecting…' : 'Connect'}
          </button>
        )}
      </div>
      {notice && !error ? <p className={bar.notice}>{notice}</p> : null}
      {error ? <p className={bar.error}>{error}</p> : null}
    </section>
  );
}
