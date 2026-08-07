import { useEffect } from 'react';

type Props = {
  /** Scroll root containing header + main > section (+ optional footer). */
  rootSelector?: string;
};

/**
 * Every landing section = exactly one full viewport page.
 * Heights match the scrollport; wheel/keys/nav jump page-by-page.
 */
export default function SnapPages({
  rootSelector = '.asktill-v81-root, .asktill-mkt-scroll',
}: Props) {
  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | undefined;
    let retryTimer = 0;

    const pagesOf = (root: HTMLElement) => {
      const sections = Array.from(
        root.querySelectorAll<HTMLElement>('main > section'),
      );
      const footer = root.querySelector<HTMLElement>(':scope > footer');
      return footer ? [...sections, footer] : sections;
    };

    const init = (root: HTMLElement) => {
      root.classList.add('asktill-snap-on');

      const pages = () => pagesOf(root);
      const pageH = () => Math.max(1, Math.round(root.clientHeight));

      let lockUntil = 0;
      let touchY = 0;
      let scrollSnapTimer = 0;

      const syncHeaderOffset = () => {
        const header = root.querySelector<HTMLElement>('#site-header, header');
        const h = header ? Math.round(header.getBoundingClientRect().height) : 72;
        root.style.setProperty('--header-offset', `${h}px`);
        return h;
      };

      const applyHeights = () => {
        syncHeaderOffset();
        const h = pageH();
        const px = `${h}px`;
        root.style.setProperty('--page-h', px);
        for (const el of pages()) {
          el.style.setProperty('height', px, 'important');
          el.style.setProperty('min-height', px, 'important');
          el.style.setProperty('max-height', px, 'important');
          el.style.setProperty('flex', `0 0 ${px}`, 'important');
        }
        return h;
      };

      const currentIndex = () => {
        const h = pageH();
        return Math.max(
          0,
          Math.min(pages().length - 1, Math.round(root.scrollTop / h)),
        );
      };

      const goTo = (index: number, soft = false) => {
        const list = pages();
        if (!list.length) return;
        const next = Math.max(0, Math.min(list.length - 1, index));
        const target = list[next];
        if (!target) return;
        const h = applyHeights();
        lockUntil = Date.now() + (soft ? 320 : 650);
        root.scrollTo({ top: next * h, behavior: soft ? 'smooth' : 'auto' });
        if (target.id) {
          const hash = `#${target.id}`;
          if (window.location.hash !== hash) {
            window.history.replaceState(
              null,
              '',
              `${window.location.pathname}${window.location.search}${hash}`,
            );
          }
        }
      };

      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaY) < 4) return;
        // Allow inner scroll when section content overflows
        const section = (e.target as Element | null)?.closest?.(
          'main > section, footer',
        ) as HTMLElement | null;
        if (section && section.scrollHeight > section.clientHeight + 2) {
          const atTop = section.scrollTop <= 0;
          const atBottom =
            section.scrollTop + section.clientHeight >= section.scrollHeight - 2;
          if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        if (Date.now() < lockUntil) return;
        goTo(currentIndex() + (e.deltaY > 0 ? 1 : -1));
      };

      const onTouchStart = (e: TouchEvent) => {
        touchY = e.touches[0]?.clientY ?? 0;
      };

      const onTouchMove = (e: TouchEvent) => {
        const y = e.touches[0]?.clientY ?? touchY;
        const dy = touchY - y;
        if (Math.abs(dy) < 28) return;
        e.preventDefault();
        if (Date.now() < lockUntil) return;
        touchY = y;
        goTo(currentIndex() + (dy > 0 ? 1 : -1));
      };

      const onKey = (e: KeyboardEvent) => {
        if (
          e.key !== 'PageDown'
          && e.key !== 'PageUp'
          && e.key !== 'ArrowDown'
          && e.key !== 'ArrowUp'
          && e.key !== ' '
        ) {
          return;
        }
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        if (Date.now() < lockUntil) return;
        const dir = e.key === 'PageUp' || e.key === 'ArrowUp' ? -1 : 1;
        goTo(currentIndex() + dir);
      };

      const goToId = (id: string) => {
        if (!id) return;
        const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!el) return;
        const list = pages();
        const idx = list.findIndex((p) => p === el || p.contains(el));
        if (idx >= 0) goTo(idx);
      };

      const onHash = () => {
        goToId(window.location.hash.replace(/^#/, ''));
      };

      const onClick = (e: MouseEvent) => {
        const a = (e.target as Element | null)?.closest?.(
          'a[href^="#"]',
        ) as HTMLAnchorElement | null;
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const id = href.slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target || !root.contains(target)) return;
        e.preventDefault();
        window.history.pushState(null, '', href);
        goToId(id);
      };

      const onScroll = () => {
        if (Date.now() < lockUntil) return;
        window.clearTimeout(scrollSnapTimer);
        scrollSnapTimer = window.setTimeout(() => {
          if (Date.now() < lockUntil) return;
          const h = pageH();
          const nearest = Math.round(root.scrollTop / h);
          const targetTop = nearest * h;
          if (Math.abs(root.scrollTop - targetTop) > 2) {
            goTo(nearest, true);
          }
        }, 60);
      };

      const onResize = () => {
        const idx = currentIndex();
        applyHeights();
        goTo(idx);
      };

      document.addEventListener('click', onClick);
      root.addEventListener('wheel', onWheel, { passive: false, capture: true });
      root.addEventListener('touchstart', onTouchStart, {
        passive: true,
        capture: true,
      });
      root.addEventListener('touchmove', onTouchMove, {
        passive: false,
        capture: true,
      });
      root.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('keydown', onKey);
      window.addEventListener('hashchange', onHash);
      window.addEventListener('resize', onResize);
      window.visualViewport?.addEventListener('resize', onResize);

      const main = root.querySelector('main');
      const mo =
        main instanceof HTMLElement
          ? new MutationObserver(() => {
            const idx = currentIndex();
            applyHeights();
            goTo(idx);
          })
          : null;
      if (main instanceof HTMLElement) {
        mo?.observe(main, { childList: true });
      }

      applyHeights();
      requestAnimationFrame(() => {
        applyHeights();
        if (window.location.hash) onHash();
        else goTo(0);
      });

      return () => {
        mo?.disconnect();
        window.clearTimeout(scrollSnapTimer);
        document.removeEventListener('click', onClick);
        root.removeEventListener('wheel', onWheel, true);
        root.removeEventListener('touchstart', onTouchStart, true);
        root.removeEventListener('touchmove', onTouchMove, true);
        root.removeEventListener('scroll', onScroll);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('hashchange', onHash);
        window.removeEventListener('resize', onResize);
        window.visualViewport?.removeEventListener('resize', onResize);
        root.classList.remove('asktill-snap-on');
        root.style.removeProperty('--page-h');
        root.style.removeProperty('--header-offset');
        for (const el of pages()) {
          el.style.removeProperty('height');
          el.style.removeProperty('min-height');
          el.style.removeProperty('max-height');
          el.style.removeProperty('flex');
        }
      };
    };

    const tryInit = () => {
      const root = document.querySelector(rootSelector);
      if (!(root instanceof HTMLElement)) return false;
      teardown = init(root);
      return true;
    };

    if (!tryInit()) {
      retryTimer = window.setInterval(() => {
        if (cancelled) return;
        if (tryInit()) window.clearInterval(retryTimer);
      }, 40);
    }

    return () => {
      cancelled = true;
      window.clearInterval(retryTimer);
      teardown?.();
    };
  }, [rootSelector]);

  return null;
}
