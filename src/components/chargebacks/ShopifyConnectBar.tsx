import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, ShoppingBag, Unlink } from 'lucide-react';
import {
  connectShopify,
  disconnectShopify,
  getShopifyConnection,
  readCachedShopifyConnection,
  writeCachedShopifyConnection,
  type ShopifyConnectionView,
} from '../../lib/chargebacksClient';

export default function ShopifyConnectBar({ onChanged }: { onChanged?: () => void }) {
  const navigate = useNavigate();
  const cached = readCachedShopifyConnection();
  const [ready, setReady] = useState(Boolean(cached?.connection));
  const [status, setStatus] = useState(cached?.status || 'disconnected');
  const [connection, setConnection] = useState<ShopifyConnectionView | null>(cached?.connection ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const body = await getShopifyConnection();
      setReady(true);
      setStatus(body.status || 'disconnected');
      setConnection(body.connection);
      writeCachedShopifyConnection(body);
    } catch (err) {
      if (readCachedShopifyConnection()?.connection) {
        setReady(true);
        return;
      }
      setReady(false);
      setStatus('disconnected');
      setConnection(null);
      setError(err instanceof Error ? err.message : 'Could not load Shopify connection.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const connected = status === 'active' && connection;

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
