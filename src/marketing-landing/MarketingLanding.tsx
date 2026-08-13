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
  .section-head{margin-bottom:18px!important;}
  .pricing .section-head,.pricing-v8 .section-head{margin:0 auto 18px!important;}
  .hero-v8{padding:32px 0 28px!important;}
  .hero-v8-grid{gap:28px!important;}
  .hero-v8 .positioning{margin-top:12px!important;}
  .hero-v8 .category-claim{margin-top:12px!important;padding:10px 12px!important;}
  .hero-v8-actions{margin-top:14px!important;}
  .hero-v8-trust{margin-top:12px!important;}
  .hero-pulse-bg{height:80px!important;}
  .problem,.how,.at-letter,.founder{padding:40px 0!important;}
  .qa-section,.suite,.commercial-pillars,.chargeback-model,
  .pulse-section,.coming-soon,.pricing-v8{padding:42px 0!important;}
  .integrations{padding:28px 0!important;}
  .integrations .int-label{margin-bottom:14px!important;}
  .cta-v8{padding:40px 0 36px!important;}
  .cta-v8 p{margin:0 auto 14px!important;}
  .cta-v8 h2{margin-bottom:10px!important;}
  .qa-grid{gap:24px!important;}
  .chargeback-layout{gap:24px!important;}
  .at-letter .wrap-inner{gap:28px!important;}
  .pulse-inner{gap:28px!important;}
  .pulse-caption{margin-top:14px!important;}
  .security-strip{margin-top:14px!important;padding:12px 16px!important;}
  .roadmap{margin-top:14px!important;padding:16px!important;}
  .partner-trust{margin-top:12px!important;padding:10px 14px!important;}
  .footer-main{padding:36px 0 28px!important;}
  .footer-grid{gap:22px!important;}
  .problem-grid,.suite-grid,.coming-grid{gap:12px!important;}
  .suite-card{min-height:0!important;padding:18px!important;}
  .suite-icon{margin-bottom:12px!important;}
  .suite-card p{margin:0 0 10px!important;}
  .future-card{min-height:0!important;padding:18px!important;}
  .pillar-card{padding:22px!important;}
  .pillar-icon{margin-bottom:12px!important;}
  .pillar-card>p{margin:0 0 12px!important;}
  .partner-features{margin-bottom:12px!important;}
  /* Global app .wrap is locked to 1080px — free landing nav/sections. */
  .asktill-v81-root .wrap{
    max-width:1180px!important;
    min-width:0!important;
    width:100%!important;
    box-sizing:border-box;
  }
  .asktill-v81-root nav.wrap{
    display:flex!important;
    align-items:center!important;
    justify-content:space-between!important;
    gap:14px!important;
    flex-wrap:nowrap!important;
  }
  .asktill-v81-root .nav-links{
    gap:14px!important;
    flex:1 1 auto;
    justify-content:center;
    flex-wrap:nowrap!important;
    min-width:0;
  }
  .asktill-v81-root .nav-links a{white-space:nowrap;}
  .asktill-v81-root .nav-right{
    display:flex!important;
    align-items:center!important;
    gap:10px!important;
    flex:0 0 auto!important;
    white-space:nowrap;
  }
  /* Login matches Start Free (.btn) pill — keep visible vs HTML mobile hide */
  .asktill-v81-root .nav-right .btn.nav-login,
  .asktill-v81-root a.btn.nav-login{
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    white-space:nowrap!important;
    flex-shrink:0!important;
    margin:0!important;
    color:#fff!important;
  }
  .asktill-v81-root a.btn.btn-primary,
  .asktill-v81-root a.btn.btn-primary:hover,
  .asktill-v81-root a.btn.btn-primary:focus,
  .asktill-v81-root a.btn.btn-primary.nav-login,
  .asktill-v81-root a.btn.btn-primary.nav-login:hover{
    color:#fff!important;
  }
  .asktill-v81-root .nav-right .btn{flex-shrink:0!important;white-space:nowrap!important;}
  @media (max-width:860px){
    .asktill-v81-root .nav-login{display:inline-flex!important;}
  }
  @media (max-width:600px){
    .hero-v8{padding:24px 0 20px!important;}
    .problem,.how,.at-letter,.founder,
    .qa-section,.suite,.commercial-pillars,.chargeback-model,
    .pulse-section,.coming-soon,.pricing-v8{padding:32px 0!important;}
    .cta-v8{padding:32px 0 28px!important;}
  }
`;

/** Monarch-like motion layer: soft ambience, staggered entrances, polished hovers. */
const MOTION_CSS = `
  .asktill-v81-root{
    --ease-out:cubic-bezier(.22,1,.36,1);
    --ease-soft:cubic-bezier(.4,0,.2,1);
  }
  .asktill-landing-v81-active{scroll-behavior:smooth;}
  .asktill-v81-root section[id],
  .asktill-v81-root article[id],
  .asktill-v81-root .security-strip[id]{
    scroll-margin-top:92px;
  }
  /* Keep top nav locked — sticky breaks under app overflow-x on #root */
  .asktill-v81-root #site-header{
    position:fixed!important;
    top:0!important;
    left:0!important;
    right:0!important;
    width:100%!important;
    z-index:200!important;
    transition:background .35s var(--ease-soft),border-color .35s var(--ease-soft),box-shadow .35s var(--ease-soft)!important;
  }
  .asktill-v81-root main{
    padding-top:var(--header-offset,74px);
  }
  .asktill-v81-root #site-header.scrolled{
    background:rgba(255,255,255,.92)!important;
    backdrop-filter:saturate(160%) blur(14px);
    -webkit-backdrop-filter:saturate(160%) blur(14px);
    box-shadow:0 8px 28px rgba(16,35,29,.06);
  }

  /* Ambient floating gradients (Monarch-style soft orbs) */
  .asktill-v81-root .hero-v8{position:relative;isolation:isolate;overflow:hidden;}
  .asktill-v81-root .motion-orb{
    position:absolute;border-radius:50%;pointer-events:none;z-index:0;filter:blur(2px);
    opacity:.55;will-change:transform;
    animation:asktill-orb-float 12s var(--ease-soft) infinite alternate;
  }
  .asktill-v81-root .motion-orb-a{
    width:420px;height:420px;left:-120px;top:-80px;
    background:radial-gradient(circle,rgba(47,111,237,.22),transparent 68%);
  }
  .asktill-v81-root .motion-orb-b{
    width:360px;height:360px;right:-80px;top:10%;
    background:radial-gradient(circle,rgba(27,138,90,.20),transparent 68%);
    animation-delay:-4s;animation-duration:15s;
  }
  .asktill-v81-root .motion-orb-c{
    width:280px;height:280px;left:38%;bottom:-90px;
    background:radial-gradient(circle,rgba(124,77,255,.16),transparent 70%);
    animation-delay:-7s;animation-duration:18s;
  }
  @keyframes asktill-orb-float{
    from{transform:translate3d(0,0,0) scale(1);}
    to{transform:translate3d(28px,-22px,0) scale(1.08);}
  }

  /* Hero entrance */
  .asktill-v81-root .hero-v8-copy > *,
  .asktill-v81-root .hero-brief-shell{
    opacity:0;transform:translateY(28px);
    animation:asktill-rise .95s var(--ease-out) forwards;
  }
  .asktill-v81-root .hero-v8-copy > *:nth-child(1){animation-delay:.05s;}
  .asktill-v81-root .hero-v8-copy > *:nth-child(2){animation-delay:.14s;}
  .asktill-v81-root .hero-v8-copy > *:nth-child(3){animation-delay:.24s;}
  .asktill-v81-root .hero-v8-copy > *:nth-child(4){animation-delay:.34s;}
  .asktill-v81-root .hero-v8-copy > *:nth-child(5){animation-delay:.44s;}
  .asktill-v81-root .hero-v8-copy > *:nth-child(6){animation-delay:.54s;}
  .asktill-v81-root .hero-brief-shell{animation-delay:.28s;}
  @keyframes asktill-rise{
    to{opacity:1;transform:translateY(0);}
  }

  /* Soft float on product mock */
  .asktill-v81-root .hero-brief-shell.is-ready{
    animation:asktill-rise .95s var(--ease-out) .28s forwards;
  }
  .asktill-v81-root .hero-brief-shell.is-floating{
    opacity:1;
    animation:asktill-float 6.5s var(--ease-soft) infinite alternate;
  }
  @keyframes asktill-float{
    from{transform:translateY(0);}
    to{transform:translateY(-10px);}
  }
  .asktill-v81-root .hero-brief{
    transition:transform .45s var(--ease-out),box-shadow .45s var(--ease-out);
    transform-style:preserve-3d;
  }

  /* Richer scroll reveals + stagger */
  .asktill-v81-root .reveal{
    opacity:0!important;
    transform:translateY(28px) scale(.985)!important;
    filter:blur(4px);
    transition:
      opacity .85s var(--ease-out),
      transform .85s var(--ease-out),
      filter .85s var(--ease-out)!important;
    transition-delay:var(--d,0ms)!important;
  }
  .asktill-v81-root .reveal.in{
    opacity:1!important;
    transform:none!important;
    filter:blur(0)!important;
  }

  /* Hand cursor everywhere on the landing (all text/lines), except typing fields */
  .asktill-v81-root,
  .asktill-v81-root *{
    cursor:pointer!important;
  }
  .asktill-v81-root input,
  .asktill-v81-root textarea,
  .asktill-v81-root select,
  .asktill-v81-root input *,
  .asktill-v81-root textarea *{
    cursor:text!important;
  }

  /* Cards / CTAs — Monarch-soft lift */
  .asktill-v81-root .btn{
    transition:transform .25s var(--ease-out),box-shadow .25s var(--ease-out),background .25s var(--ease-soft)!important;
    cursor:pointer!important;
  }
  .asktill-v81-root .btn:hover{
    transform:translateY(-2px)!important;
  }
  .asktill-v81-root .btn-primary:hover{
    box-shadow:0 14px 34px rgba(16,169,88,.32)!important;
  }
  .asktill-v81-root .problem-card,
  .asktill-v81-root .suite-card,
  .asktill-v81-root .future-card,
  .asktill-v81-root .pillar-card,
  .asktill-v81-root .price-v8,
  .asktill-v81-root .letter-card,
  .asktill-v81-root .cb-demo,
  .asktill-v81-root .coming-card,
  .asktill-v81-root .qa-row > *{
    transition:transform .35s var(--ease-out),box-shadow .35s var(--ease-out),border-color .35s var(--ease-soft)!important;
    cursor:pointer!important;
  }
  .asktill-v81-root .problem-card:hover,
  .asktill-v81-root .suite-card:hover,
  .asktill-v81-root .future-card:hover,
  .asktill-v81-root .pillar-card:hover,
  .asktill-v81-root .price-v8:hover,
  .asktill-v81-root .letter-card:hover,
  .asktill-v81-root .cb-demo:hover{
    transform:translateY(-8px)!important;
    box-shadow:0 22px 50px rgba(22,63,46,.14)!important;
  }
  .asktill-v81-root .nav-links a{
    position:relative;
    transition:color .2s var(--ease-soft)!important;
  }
  .asktill-v81-root .nav-links a::after{
    content:"";position:absolute;left:0;right:0;bottom:-6px;height:2px;border-radius:99px;
    background:linear-gradient(90deg,#168755,#2F6FED);transform:scaleX(0);transform-origin:left;
    transition:transform .28s var(--ease-out);
  }
  .asktill-v81-root .nav-links a:hover::after{transform:scaleX(1);}
  .asktill-v81-root .int-badge{
    transition:transform .3s var(--ease-out),box-shadow .3s var(--ease-out)!important;
  }
  .asktill-v81-root .int-badge:hover{
    transform:translateY(-4px) scale(1.03)!important;
    box-shadow:0 14px 28px rgba(16,35,29,.1)!important;
  }
  .asktill-v81-root .int-row{
    animation:asktill-drift 18s linear infinite alternate;
  }
  @keyframes asktill-drift{
    from{transform:translateX(-6px);}
    to{transform:translateX(6px);}
  }

  @media (prefers-reduced-motion:reduce){
    .asktill-v81-root .motion-orb,
    .asktill-v81-root .hero-v8-copy > *,
    .asktill-v81-root .hero-brief-shell,
    .asktill-v81-root .hero-brief-shell.is-ready,
    .asktill-v81-root .int-row{animation:none!important;}
    .asktill-v81-root .hero-v8-copy > *,
    .asktill-v81-root .hero-brief-shell,
    .asktill-v81-root .reveal{opacity:1!important;transform:none!important;filter:none!important;}
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

    const motion = document.createElement('style');
    motion.id = 'asktill-v81-motion';
    motion.textContent = MOTION_CSS;
    document.head.appendChild(motion);
    styleNodes.push(motion);

    // Body markup (header → footer)
    const root = document.createElement('div');
    root.className = 'asktill-v81-root';
    root.innerHTML = doc.body.innerHTML;
    // Remove inline <script> tags from HTML — we re-run them safely below
    root.querySelectorAll('script').forEach((s) => s.remove());
    host.replaceChildren(root);

    // Pin nav height so content clears the fixed header
    const headerEl = root.querySelector<HTMLElement>('#site-header');
    const syncHeaderOffset = () => {
      if (!headerEl) return;
      const h = Math.round(headerEl.getBoundingClientRect().height) || 74;
      root.style.setProperty('--header-offset', `${h}px`);
    };
    syncHeaderOffset();
    window.addEventListener('resize', syncHeaderOffset);

    // Monarch-like ambience + staggered reveals + subtle parallax
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero = root.querySelector('.hero-v8');
    if (hero && !reduceMotion) {
      ['motion-orb-a', 'motion-orb-b', 'motion-orb-c'].forEach((cls) => {
        const orb = document.createElement('div');
        orb.className = `motion-orb ${cls}`;
        orb.setAttribute('aria-hidden', 'true');
        hero.prepend(orb);
      });
    }
    const briefShell = root.querySelector('.hero-brief-shell');
    if (briefShell && !reduceMotion) {
      briefShell.classList.add('is-ready');
      const onRiseEnd = () => {
        briefShell.classList.add('is-floating');
        briefShell.removeEventListener('animationend', onRiseEnd);
      };
      briefShell.addEventListener('animationend', onRiseEnd);
    }
    // Stagger cards within each section grid
    root.querySelectorAll(
      '.problem-grid, .suite-grid, .coming-grid, .price-grid, .pricing-v8-grid, .how-steps, .pillar-grid',
    ).forEach((group) => {
      group.querySelectorAll('.reveal').forEach((el, index) => {
        (el as HTMLElement).style.setProperty('--d', `${Math.min(index, 6) * 70}ms`);
      });
    });

    const brief = root.querySelector('.hero-brief') as HTMLElement | null;
    const onPointerMove = (event: PointerEvent) => {
      if (!brief || reduceMotion) return;
      const rect = brief.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      brief.style.transform = `rotateY(${px * 7}deg) rotateX(${-py * 5}deg) translateY(-2px)`;
    };
    const onPointerLeave = () => {
      if (!brief) return;
      brief.style.transform = '';
    };
    if (brief && !reduceMotion) {
      brief.addEventListener('pointermove', onPointerMove);
      brief.addEventListener('pointerleave', onPointerLeave);
    }

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

    // In-page section map: footer / nav hash links scroll to the matching section
    const HEADER_OFFSET = 88;
    const scrollToHash = (hash: string) => {
      const id = hash.replace(/^#/, '');
      if (!id) return false;
      const target = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!target) return false;
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      try {
        history.replaceState(null, '', `#${id}`);
      } catch {
        /* ignore */
      }
      return true;
    };

    // Hash links: scroll only when the target exists. Missing targets and bare "#"
    // stay put (never jump to top / mismap to another section).
    root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (event) => {
        const href = a.getAttribute('href') || '';
        event.preventDefault();
        if (!href || href === '#') return;
        scrollToHash(href);
      });
    });

    // If landing opened with a hash (e.g. /#chargebacks), scroll after layout
    if (window.location.hash) {
      requestAnimationFrame(() => {
        scrollToHash(window.location.hash);
      });
    }

    // Ensure a Login control exists — same pill button style as Start Free
    const navRight = root.querySelector('.nav-right');
    if (navRight && !navRight.querySelector('a[href="/login"]')) {
      const login = document.createElement('a');
      login.href = '/login';
      login.className = 'btn btn-primary nav-login';
      login.textContent = 'Login';
      login.setAttribute('aria-label', 'Log in');
      login.addEventListener('click', (event) => {
        event.preventDefault();
        navigate('/login');
      });
      const start = navRight.querySelector('a.btn-primary:not(.nav-login)');
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
      window.removeEventListener('resize', syncHeaderOffset);
      if (brief) {
        brief.removeEventListener('pointermove', onPointerMove);
        brief.removeEventListener('pointerleave', onPointerLeave);
      }
      host.replaceChildren();
    };
  }, [navigate]);

  return <div ref={hostRef} id="asktill-landing-v81-host" />;
}
