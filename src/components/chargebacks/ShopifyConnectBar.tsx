import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, ShoppingBag, Unlink } from 'lucide-react';
import {
  connectShopify,
  disconnectShopify,
  getShopifyConnection,
  getStripeConnection,
  readCachedShopifyConnection,
  readCachedStripeConnection,
  writeCachedShopifyConnection,
  type ShopifyConnectionView,
} from '../../lib/chargebacksClient';
import ConnectLiveMonitor from './ConnectLiveMonitor';
import bar from './ConnectBar.module.css';

const SLOW_POLL_MS = 8000;
const BURST_POLL_MS = 3000;
const BURST_FOR_MS = 90_000;

export default function ShopifyConnectBar({ onChanged }: { onChanged?: () => void }) {
  const navigate = useNavigate();
  const cached = readCachedShopifyConnection();
  const stripeCached = readCachedStripeConnection();
  const [ready, setReady] = useState(Boolean(cached?.connection));
  const [status, setStatus] = useState(cached?.status || 'disconnected');
  const [connection, setConnection] = useState<ShopifyConnectionView | null>(cached?.connection ?? null);
  const [lastDisputeAt, setLastDisputeAt] = useState<string | null>(stripeCached?.connection?.last_dispute_at ?? null);
  const [lastPayAt, setLastPayAt] = useState<string | null>(
    stripeCached?.connection?.last_pay_at || cached?.connection?.last_order_at || null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const inFlight = useRef(false);
  const burstUntil = useRef(0);
  const lastOrder = useRef(cached?.connection?.last_order_at || '');
  const lastDispute = useRef(stripeCached?.connection?.last_dispute_at || '');
  const lastPay = useRef(stripeCached?.connection?.last_pay_at || '');

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [shop, stripe] = await Promise.all([getShopifyConnection(), getStripeConnection().catch(() => null)]);
      setReady(true);
      setStatus(shop.status || 'disconnected');
      setConnection(shop.connection);
      writeCachedShopifyConnection(shop);
      const dispute = stripe?.connection?.last_dispute_at || null;
      const pay = stripe?.connection?.last_pay_at || shop.connection?.last_order_at || null;
      setLastDisputeAt(dispute);
      setLastPayAt(pay);
      const order = shop.connection?.last_order_at || '';
      if (order !== lastOrder.current || (dispute || '') !== lastDispute.current || (pay || '') !== lastPay.current) {
        lastOrder.current = order;
        lastDispute.current = dispute || '';
        lastPay.current = pay || '';
        onChangedRef.current?.();
      }
    } catch (err) {
      writeCachedShopifyConnection(null);
      setReady(true);
      setStatus('disconnected');
      setConnection(null);
      setError(err instanceof Error ? err.message : 'Could not load Shopify connection.');
    }
  }, []);

  useEffect(() => {
    const pay = new URLSearchParams(window.location.search).get('pay');
    if (pay === 'success') burstUntil.current = Date.now() + BURST_FOR_MS;
    void refresh();
    if (pay === 'success') {
      window.setTimeout(() => {
        void refresh();
        onChangedRef.current?.();
      }, 2000);
    }
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
      const body = await connectShopify();
      setStatus(body.status || 'disconnected');
      setConnection(body.connection);
      writeCachedShopifyConnection(body);
      setNotice('Shopify connected.');
      onChanged?.();
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
    try {
      await disconnectShopify();
      writeCachedShopifyConnection(null);
      await refresh();
      onChanged?.();
      setNotice('Shopify disconnected.');
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
          <div className={bar.title}>Shopify</div>
          <div className={bar.meta}>
            {!ready
              ? 'Chargebacks API is not running.'
              : connected
                ? `Connected · ${connection.shop_domain}`
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
                  { label: 'Last pay', at: lastPayAt },
                  { label: 'Dispute raised', at: lastDisputeAt },
                ]}
              />
            </div>
            <button
              type="button"
              className={bar.primary}
              onClick={() => navigate('/dashboard/chargebacks/orders')}
              disabled={busy}
              style={{ cursor: busy ? 'wait' : 'pointer' }}
            >
              <ShoppingBag size={14} /> Orders
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
