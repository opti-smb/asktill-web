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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const inFlight = useRef(false);
  const burstUntil = useRef(0);
  const lastOrder = useRef(cached?.connection?.last_order_at || '');
  const lastDispute = useRef(stripeCached?.connection?.last_dispute_at || '');

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [shop, stripe] = await Promise.all([getShopifyConnection(), getStripeConnection().catch(() => null)]);
      setReady(true);
      setStatus(shop.status || 'disconnected');
      setConnection(shop.connection);
      writeCachedShopifyConnection(shop);
      const dispute = stripe?.connection?.last_dispute_at || null;
      setLastDisputeAt(dispute);
      const order = shop.connection?.last_order_at || '';
      if (order !== lastOrder.current || (dispute || '') !== lastDispute.current) {
        lastOrder.current = order;
        lastDispute.current = dispute || '';
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
    <section
      style={{
        background: '#fff',
        border: '1px solid #E5EAF2',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#0F172A' }}>Shopify</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
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
            <ConnectLiveMonitor
              stamps={[
                { label: 'Shopify connected', at: connection.connected_at },
                { label: 'Last order', at: connection.last_order_at },
                { label: 'Dispute raised', at: lastDisputeAt },
              ]}
            />
            <button
              type="button"
              onClick={() => navigate('/dashboard/chargebacks/orders')}
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: 0,
                background: '#2F5BD8',
                color: '#fff',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              <ShoppingBag size={14} /> Orders
            </button>
            <button
              type="button"
              onClick={() => void onDisconnect()}
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid #E5EAF2',
                background: '#F4F6F9',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              <Unlink size={14} /> {busy ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={busy || !ready}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 0,
              background: '#2F5BD8',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: busy || !ready ? 'not-allowed' : 'pointer',
            }}
          >
            <Link2 size={14} /> {busy ? 'Connecting…' : 'Connect'}
          </button>
        )}
      </div>
      {notice && !error ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#0F8A57' }}>{notice}</p>
      ) : null}
      {error ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#C43C3C' }}>{error}</p>
      ) : null}
    </section>
  );
}
