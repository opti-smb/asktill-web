import { useEffect } from 'react';

/** Shared Escape-to-dismiss for overlays / menus. */
export function useDismissOnEscape(onDismiss: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss, enabled]);
}
