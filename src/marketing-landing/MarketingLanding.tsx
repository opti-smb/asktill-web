import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { warmupServices } from '../lib/api';
import rawHtml from './Asktill_Landing_Page_V8_1_Final_Page_Aligned.html?raw';

// Monarch.com uses licensed ABC Oracle (UI) + Copernicus (display).
// Closest freely licensed stand-ins for local landing:
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap';

const FONT_CSS = `
  :root{
    --font-sans:'Plus Jakarta Sans',ui-sans-serif,system-ui,-apple-system,sans-serif;
    --font-mono:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;
    --font-display:'Source Serif 4',Georgia,'Times New Roman',serif;
  }
  #asktill-landing-v81-host,
  .asktill-v81-root{
    font-family:var(--font-sans)!important;
  }
  .asktill-v81-root .btn,
  .asktill-v81-root .nav-links a,
  .asktill-v81-root .nav-login,
  .asktill-v81-root p,
  .asktill-v81-root li,
  .asktill-v81-root small,
  .asktill-v81-root span,
  .asktill-v81-root .eyebrow,
  .asktill-v81-root .hero-pill,
  .asktill-v81-root .category-chip,
  .asktill-v81-root .num,
  .asktill-v81-root [class*="price"],
  .asktill-v81-root [data-count],
  .asktill-v81-root input,
  .asktill-v81-root button{
    font-family:var(--font-sans)!important;
  }
  .asktill-v81-root h1,
  .asktill-v81-root h2,
  .asktill-v81-root h3,
  .asktill-v81-root .section-head h2,
  .asktill-v81-root .hero-v8 h1,
  .asktill-v81-root .qa-copy h2,
  .asktill-v81-root .cb-copy h2,
  .asktill-v81-root .cta-v8 h2,
  .asktill-v81-root .founder-quote,
  .asktill-v81-root .letter-title,
  .asktill-v81-root .pillar-card h3{
    font-family:var(--font-display)!important;
    letter-spacing:-0.02em;
    font-weight:500;
  }
`;

/** Tighten vertical rhythm — applied last so it wins over stacked V3–V8.1 rules. */
const DENSITY_CSS = `
  .section-head{margin-bottom:28px!important;}
  .pricing .section-head,.pricing-v8 .section-head{margin:0 auto 28px!important;}
  .hero-v8{padding:44px 0 40px!important;}
  .hero-v8-grid{gap:36px!important;}
  .hero-v8 .positioning{margin-top:16px!important;}
  .hero-v8 .category-claim{margin-top:14px!important;padding:11px 14px!important;}
  .hero-v8-actions{margin-top:18px!important;}
  .hero-v8-trust{margin-top:14px!important;}
  .hero-pulse-bg{height:100px!important;}
  .problem,.how,.at-letter,.founder{padding:56px 0!important;}
  .qa-section,.suite,.commercial-pillars,.chargeback-model,
  .pulse-section,.coming-soon,.pricing-v8{padding:60px 0!important;}
  .integrations{padding:40px 0!important;}
  .integrations .int-label{margin-bottom:18px!important;}
  .cta-v8{padding:52px 0 48px!important;}
  .cta-v8 p{margin:0 auto 18px!important;}
  .cta-v8 h2{margin-bottom:12px!important;}
  .qa-grid{gap:32px!important;}
  .chargeback-layout{gap:32px!important;}
  .at-letter .wrap-inner{gap:36px!important;}
  .pulse-inner{gap:40px!important;}
  .pulse-caption{margin-top:20px!important;}
  .security-strip{margin-top:18px!important;padding:14px 18px!important;}
  .roadmap{margin-top:20px!important;padding:18px!important;}
  .partner-trust{margin-top:16px!important;padding:12px 16px!important;}
  .footer-main{padding:44px 0 32px!important;}
  .footer-grid{gap:28px!important;}
  .problem-grid,.suite-grid,.coming-grid{gap:14px!important;}
  .suite-card{min-height:0!important;padding:20px!important;}
  .suite-icon{margin-bottom:14px!important;}
  .suite-card p{margin:0 0 12px!important;}
  .future-card{min-height:0!important;padding:20px!important;}
  .pillar-card{padding:26px!important;}
  .pillar-icon{margin-bottom:14px!important;}
  .pillar-card>p{margin:0 0 16px!important;}
  .partner-features{margin-bottom:16px!important;}
  .reveal{transform:translateY(10px);}
  @media (max-width:600px){
    .hero-v8{padding:32px 0 28px!important;}
    .problem,.how,.at-letter,.founder,
    .qa-section,.suite,.commercial-pillars,.chargeback-model,
    .pulse-section,.coming-soon,.pricing-v8{padding:44px 0!important;}
    .cta-v8{padding:40px 0 36px!important;}
  }
`;

/**
 * Exact Asktill Landing V8.1 HTML mounting at `/`.
 * Local-only swap of the previous marketing landing; app routes unchanged.
 */
export default function MarketingLanding() {
  const hostRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    warmupServices();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');

    // Fonts
    const ensureLink = (id: string, rel: string, href: string, crossOrigin?: string) => {
      const existing = document.getElementById(id) as HTMLLinkElement | null;
      if (existing) {
        if (existing.href !== href && existing.tagName === 'LINK') existing.href = href;
        return;
      }
      const link = document.createElement('link');
      link.id = id;
      link.rel = rel;
      link.href = href;
      if (crossOrigin) link.crossOrigin = crossOrigin;
      document.head.appendChild(link);
    };
    ensureLink('asktill-v81-fonts-preconnect', 'preconnect', 'https://fonts.googleapis.com');
    ensureLink('asktill-v81-fonts-preconnect-gstatic', 'preconnect', 'https://fonts.gstatic.com', 'anonymous');
    ensureLink('asktill-v81-fonts', 'stylesheet', FONT_HREF);

    // Page styles from the HTML <style> blocks
    const styleNodes: HTMLStyleElement[] = [];
    doc.querySelectorAll('style').forEach((styleEl, index) => {
      const style = document.createElement('style');
      style.id = `asktill-v81-style-${index}`;
      style.textContent = styleEl.textContent ?? '';
      document.head.appendChild(style);
      styleNodes.push(style);
    });

    const fonts = document.createElement('style');
    fonts.id = 'asktill-v81-fonts-override';
    fonts.textContent = FONT_CSS;
    document.head.appendChild(fonts);
    styleNodes.push(fonts);

    const density = document.createElement('style');
    density.id = 'asktill-v81-density';
    density.textContent = DENSITY_CSS;
    document.head.appendChild(density);
    styleNodes.push(density);

    // Body markup (header → footer)
    const root = document.createElement('div');
    root.className = 'asktill-v81-root';
    root.innerHTML = doc.body.innerHTML;
    // Remove inline <script> tags from HTML — we re-run them safely below
    root.querySelectorAll('script').forEach((s) => s.remove());
    host.replaceChildren(root);

    // Wire app routes without changing visual design
    const rewrite = (selector: string, path: string) => {
      root.querySelectorAll<HTMLAnchorElement>(selector).forEach((a) => {
        a.setAttribute('href', path);
        a.addEventListener('click', (event) => {
          event.preventDefault();
          navigate(path);
        });
      });
    };

    // Primary CTAs → register / pricing; add Login if present
    root.querySelectorAll<HTMLAnchorElement>('a.btn-primary, a.btn-ghost').forEach((a) => {
      const label = (a.textContent || '').trim().toLowerCase();
      if (
        label.includes('start free')
        || label.includes('create my free business brief')
        || label.includes('business brief')
      ) {
        a.setAttribute('href', '/register');
        a.addEventListener('click', (event) => {
          event.preventDefault();
          navigate('/register');
        });
      } else if (label.includes('choose $20') || label.includes('$20 monthly')) {
        a.setAttribute('href', '/pricing');
        a.addEventListener('click', (event) => {
          event.preventDefault();
          navigate('/pricing');
        });
      }
    });
    rewrite('a.nav-login', '/login');

    // Ensure a Login control exists in the nav actions cluster
    const navRight = root.querySelector('.nav-right');
    if (navRight && !navRight.querySelector('a[href="/login"]')) {
      const login = document.createElement('a');
      login.href = '/login';
      login.className = 'nav-login';
      login.textContent = 'Log in';
      login.addEventListener('click', (event) => {
        event.preventDefault();
        navigate('/login');
      });
      const start = navRight.querySelector('a.btn-primary');
      if (start) navRight.insertBefore(login, start);
      else navRight.appendChild(login);
    }

    // Run original page scripts (animations / reveals). Track window listeners so
    // React StrictMode remounts do not stack scroll handlers.
    const windowListeners: Array<[string, EventListenerOrEventListenerObject]> = [];
    const origAdd = window.addEventListener.bind(window);
    const origRemove = window.removeEventListener.bind(window);
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      windowListeners.push([type, listener]);
      return origAdd(type, listener, options);
    }) as typeof window.addEventListener;

    try {
      doc.querySelectorAll('script').forEach((scriptEl) => {
        if (scriptEl.src) return;
        const code = scriptEl.textContent ?? '';
        if (!code.trim()) return;
        try {
          // eslint-disable-next-line no-new-func
          const run = new Function(code);
          run();
        } catch (err) {
          console.warn('[landing-v81] script error', err);
        }
      });
    } finally {
      window.addEventListener = origAdd;
    }

    document.documentElement.classList.add('asktill-landing-v81-active');
    document.body.style.margin = '0';

    return () => {
      document.documentElement.classList.remove('asktill-landing-v81-active');
      styleNodes.forEach((node) => node.remove());
      windowListeners.forEach(([type, listener]) => origRemove(type, listener));
      host.replaceChildren();
    };
  }, [navigate]);

  return <div ref={hostRef} id="asktill-landing-v81-host" />;
}
