import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import {
  getShopifyConnection,
  getStripeConnection,
  listShopifyOrders,
  type ShopifyOrderRow,
} from '../lib/chargebacksClient';
import styles from './AtChargebacksPage.module.css';
import payStyles from './ChargebacksPayPage.module.css';
import tableStyles from '../components/chargebacks/DisputeCasesTable.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

const wideStyle = {
  width: 'calc(100vw - var(--sidebar-width, 220px))',
  maxWidth: 'none',
} as const;

const PAID = new Set(['paid', 'authorized', 'partially_paid', 'partially_refunded']);

function money(amount?: string | null, currency?: string | null): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const code = (currency || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return `$${n}`;
  }
}

function cardLabel(row: ShopifyOrderRow): string {
  const last4 = (row.card_last4 || '').replace(/\D/g, '');
  if (last4.length !== 4) return '—';
  const brand = (row.card_brand || 'card').trim();
  const pretty = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card';
  return `${pretty} •••• ${last4}`;
}

function matchIds(row: ShopifyOrderRow): string {
  const ids = [...(row.payment_ids || []), ...(row.gateway_ids || [])].filter(Boolean);
  return ids.length ? ids.join(' · ') : '—';
}

function pretty(value?: string | null, fallback = '—'): string {
  const raw = (value || '').trim();
  if (!raw) return fallback;
  return raw.replace(/_/g, ' ');
}

export default function ChargebacksOrdersPage() {
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [orders, setOrders] = useState<ShopifyOrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [shop, stripe] = await Promise.allSettled([getShopifyConnection(), getStripeConnection()]);
        if (cancelled) return;
        const shopOk = shop.status === 'fulfilled' && shop.value.status === 'active' && Boolean(shop.value.connection);
        const stripeOk =
          stripe.status === 'fulfilled' && stripe.value.status === 'active' && Boolean(stripe.value.connection);
        setConnected(shopOk || stripeOk);
        if (!shopOk && !stripeOk) return;
        try {
          const rows = await listShopifyOrders();
          if (!cancelled) setOrders(rows);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load Shopify orders.');
          }
        }
      } catch {
        if (!cancelled) setConnected(false);
      } finally {
        if (!cancelled) {
          setChecking(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const succeeded = useMemo(
    () =>
      orders.filter((row) => {
        if (row.stripe_dispute_id) return false;
        const status = (row.financial_status || '').toLowerCase();
        return !status || PAID.has(status);
      }),
    [orders],
  );
  const shown = succeeded.length ? succeeded : orders;

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
                  <span className={styles.titleAccent}>Shopify orders.</span>
                </h1>
              </div>
              <Link to="/dashboard/chargebacks" className={payStyles.back}>
                ← Money Reclaimed
              </Link>
            </div>
          </div>
          <div className={styles.scrollViewport}>
            <section className={tableStyles.wrap}>
              <div className={tableStyles.header}>
                <div>
                  <div className={tableStyles.title}>Succeeded orders</div>
                  <div className={tableStyles.sub}>
                    Amount, last four card digits, and the Stripe payment id. Disputed charges stay on Money Reclaimed.
                  </div>
                </div>
              </div>
              {error ? <p className={tableStyles.error}>{error}</p> : null}
              <div className={tableStyles.tableWrap}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Amount</th>
                      <th>Card</th>
                      <th>Match id</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className={tableStyles.empty} colSpan={5}>
                          Loading orders…
                        </td>
                      </tr>
                    ) : shown.length === 0 ? (
                      <tr>
                        <td className={tableStyles.empty} colSpan={5}>
                          No succeeded payments yet. Pay with Stripe, then open Orders again.
                        </td>
                      </tr>
                    ) : (
                      shown.map((row) => (
                        <tr key={row.id || row.name || matchIds(row)}>
                          <td>
                            <div className={tableStyles.primary}>{row.name || row.order_number || '—'}</div>
                            <div className={tableStyles.meta}>{row.id || ''}</div>
                          </td>
                          <td className={tableStyles.amount}>{money(row.total_price, row.currency)}</td>
                          <td>{cardLabel(row)}</td>
                          <td>
                            <div className={tableStyles.primary}>{matchIds(row)}</div>
                          </td>
                          <td>
                            <div className={tableStyles.primary}>{pretty(row.financial_status)}</div>
                            <div className={tableStyles.meta}>{pretty(row.fulfillment_status)}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
