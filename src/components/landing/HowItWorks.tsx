import { Link } from 'react-router-dom';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  return (
    <>
      {/* How it works */}
      <section className={styles.how}>
        <div className="wrap">
          <div className={styles.sectionLabel}>How it works</div>
          <h2>Three steps. <em>One answer.</em></h2>
          <div className={styles.steps}>
            <div className={styles.stepCard}>
              <div className={styles.stepIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3>Connect</h3>
              <p>Upload bank, POS, and ecommerce. CSV or PDF. Two minutes.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h3>Reconcile</h3>
              <p>AI matches every transaction. Flags every gap. In seconds.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <h3>Ask</h3>
              <p>Type any question. Get a real answer. Plain English.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Intelligence */}
      <section className={styles.intelligence}>
        <div className="wrap">
          <div className={styles.intelGrid}>
            <div>
              <div className={styles.sectionLabel}>Where AI helps</div>
              <h2>Questions only AI can answer <em>this fast.</em></h2>
              <ul className={styles.intelList}>
                {[
                  { title: 'Reconciliation across sources', desc: 'POS, bank, ecommerce — matched line by line.', path: 'M22 12h-4l-3 9L9 3l-3 9H2' },
                  { title: 'Anomalies, automatically', desc: 'Unexpected fees, drops, spikes — flagged before they cost you.', path: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01' },
                  { title: 'Cohort and LTV insights', desc: 'Customer segments, retention, lifetime value — in one sentence.', path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
                  { title: 'Cash flow forecasts', desc: '"Can I make payroll Friday?" — answered with math, not gut.', path: 'M12 20v-10M18 20V4M6 20v-4' },
                  { title: 'Peer benchmarking', desc: '"Are your card fees competitive?" — anonymous, real-time.', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' },
                ].map((item) => (
                  <li key={item.title}>
                    <div className={styles.intelIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.path} />
                      </svg>
                    </div>
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.askDemo}>
              {[
                { from: 'M', q: 'How was the till this weekend?', isAnswer: false },
                { from: 'T', q: '$3,847 — up 18%.', sub: 'Saturday was your best day this month. Walk-ins after 2pm drove it.', isAnswer: true },
                { from: 'M', q: 'Why is my balance lower than expected?', isAnswer: false },
                { from: 'T', q: '$5,224 in flight.', sub: 'Square payouts settle Apr 1-2. Stripe batches Mon. All accounted for.', isAnswer: true },
                { from: 'M', q: "Can I cover Friday's payroll?", isAnswer: false },
                { from: 'T', q: 'Yes — with $2,180 to spare.', sub: 'Square hits Thu. Stripe lands Fri AM. You\'ll be at $11,420 by 2pm.', isAnswer: true },
              ].map((line, i) => (
                <div key={i} className={styles.askLine}>
                  <div className={`${styles.askBubble} ${line.from === 'M' ? styles.you : styles.till}`}>{line.from}</div>
                  <div>
                    <div className={styles.askQ}>
                      {line.isAnswer ? <span className={styles.askNum}>{line.q.split(' — ')[0]}</span> : line.q}
                      {line.isAnswer && line.q.includes(' — ') && ` — ${line.q.split(' — ')[1]}`}
                    </div>
                    {'sub' in line && <div className={styles.askA}>{line.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className={styles.questions}>
        <div className="wrap">
          <div className={styles.sectionLabel}>Real questions</div>
          <h2>Things people ask <em>every week.</em></h2>
          <div className={styles.qGrid}>
            {[
              { text: '"Which channel drove repeat customers, not just one-time orders?"', path: 'M12 20v-10M18 20V4M6 20v-4' },
              { text: '"What\'s my real margin after fees, refunds, and chargebacks?"', path: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
              { text: '"Why is location #3\'s labor cost 8% higher than the others?"', path: 'M3 3h18v18H3zM9 3v18M15 3v18' },
              { text: '"Roll up all three entities into one P&L for last month."', path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6' },
              { text: '"Which 5 vendors had the biggest cost increase vs last year?"', path: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6' },
              { text: '"If I cut Tuesday hours by 25%, what\'s the impact on weekly margin?"', path: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2' },
            ].map((card) => (
              <div key={card.text} className={styles.qCard}>
                <div className={styles.qIconBg}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.path} />
                  </svg>
                </div>
                <div className={styles.qText}>{card.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className={styles.forSection}>
        <div className="wrap">
          <div className={styles.sectionLabel}>Built for</div>
          <h2>The people who <em>run the place.</em></h2>
          <div className={styles.forGrid}>
            {[
              { icon: '☕', title: 'Cafés & restaurants', desc: 'Square, Toast. Tips and fees handled.' },
              { icon: '🛍️', title: 'Boutiques & retail', desc: 'Shopify + in-store. BNPL modeled correctly.' },
              { icon: '🔧', title: 'Home services', desc: 'Stripe Invoices, ServiceTitan, mixed pay.' },
              { icon: '🌮', title: 'Mobile & multi-location', desc: 'Cash-heavy, weather-volatile. We model the float.' },
            ].map((card) => (
              <div key={card.title} className={styles.forCard}>
                <span className={styles.forIcon}>{card.icon}</span>
                <h4>{card.title}</h4>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How this works / grow */}
      <section className={styles.grow}>
        <div className="wrap">
          <div className={styles.growWrap}>
            <div>
              <span className={styles.growTag}>How this works</span>
              <h3>Analytics is free. <em>The bank pays us.</em></h3>
              <p>We don't charge for the analytics — we earn when you choose financial services that actually fit your business. Working capital based on real cash flow. A bank account that understands your seasons. A card with limits that flex.</p>
              <p className={styles.growNote}>No monthly fees. No data sold. No bait-and-switch.</p>
            </div>
            <div className={styles.growFeatures}>
              {[
                { title: 'Working capital', desc: '$2K-25K loans, underwritten from your real numbers. Funded in 24 hours.', path: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
                { title: 'Business banking', desc: 'Account + debit card, built on data we already understand.', path: 'M2 5h20v14H2zM2 10h20' },
                { title: 'Business card', desc: 'Spending limits that flex with your seasons. Cashback on the things you buy.', path: 'M1 4h22v16H1zM1 10h22' },
                { title: 'You stay free', desc: "Don't want financial services? Keep using the analytics. Always free.", path: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
              ].map((feat) => (
                <div key={feat.title} className={styles.growFeat}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={feat.path} />
                  </svg>
                  <h4>{feat.title}</h4>
                  <p>{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className={styles.founder}>
        <div className="wrap">
          <div className={styles.founderWrap}>
            <div className={styles.sectionLabel}>A note from the founder</div>
            <div className={styles.founderQuote}>
              <span className={styles.founderMark}>"</span>I watched my mother run her boutique for fifteen years without ever knowing — on any given Tuesday — whether the business was actually working. The data was there. Nobody read it back to her in time. We're fixing that.
            </div>
            <div className={styles.founderAttribution}>— Founder, AskTill</div>
          </div>
        </div>
      </section>

      {/* Sign up CTA */}
      <section className={styles.signup} id="signup">
        <div className="wrap">
          <div className={styles.signupSectionLabel}>Get started</div>
          <h2>Create your <em>free account.</em></h2>
          <p className={styles.lead}>
            Sign up with your email, verify your address, and start connecting your business data.
          </p>
          <Link to="/register" className={styles.signupBtn}>
            Create your account →
          </Link>
          <p className={styles.signupNote}>No card required · Free analytics</p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="wrap">
          <div className={styles.footerInner}>
            <span className={styles.footerMeta}>© 2026 AskTill. All rights reserved.</span>
            <div className={styles.footerLinks}>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
