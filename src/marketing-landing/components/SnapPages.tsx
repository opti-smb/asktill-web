import { useEffect } from "react";

/**
 * Every landing section = exactly one full viewport page (same as hero).
 * Heights match the scrollport; wheel/keys/nav jump page-by-page.
 */
export default function SnapPages() {
  useEffect(() => {
    const root = document.querySelector(".asktill-mkt-scroll");
    if (!(root instanceof HTMLElement)) return;

    const pages = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>("main > section, footer"),
      );

    /** Visible height of the scroll area — matches what the hero fills. */
    const pageH = () => Math.max(1, Math.round(root.clientHeight));

    let lockUntil = 0;
    let touchY = 0;
    let scrollSnapTimer = 0;

    const applyHeights = () => {
      const h = pageH();
      const px = `${h}px`;
      root.style.setProperty("--page-h", px);
      for (const el of pages()) {
        el.style.setProperty("height", px, "important");
        el.style.setProperty("min-height", px, "important");
        el.style.setProperty("max-height", px, "important");
        el.style.setProperty("flex", `0 0 ${px}`, "important");
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
      root.scrollTo({ top: next * h, behavior: soft ? "smooth" : "auto" });
      if (target.id) {
        const hash = `#${target.id}`;
        if (window.location.hash !== hash) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}${hash}`,
          );
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return;
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
        e.key !== "PageDown" &&
        e.key !== "PageUp" &&
        e.key !== "ArrowDown" &&
        e.key !== "ArrowUp" &&
        e.key !== " "
      ) {
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (Date.now() < lockUntil) return;
      const dir = e.key === "PageUp" || e.key === "ArrowUp" ? -1 : 1;
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
      goToId(window.location.hash.replace(/^#/, ""));
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const id = href.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target || !root.contains(target)) return;
      e.preventDefault();
      window.history.pushState(null, "", href);
      goToId(id);
    };

    /** If scrollbar / momentum drifts mid-page, snap back to a full page. */
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

    document.addEventListener("click", onClick);
    root.addEventListener("wheel", onWheel, { passive: false, capture: true });
    root.addEventListener("touchstart", onTouchStart, {
      passive: true,
      capture: true,
    });
    root.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    const main = root.querySelector("main");
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
      document.removeEventListener("click", onClick);
      root.removeEventListener("wheel", onWheel, true);
      root.removeEventListener("touchstart", onTouchStart, true);
      root.removeEventListener("touchmove", onTouchMove, true);
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      root.style.removeProperty("--page-h");
      for (const el of pages()) {
        el.style.removeProperty("height");
        el.style.removeProperty("min-height");
        el.style.removeProperty("max-height");
        el.style.removeProperty("flex");
      }
    };
  }, []);

  return null;
}
