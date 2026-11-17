import { useEffect } from 'react';
import type React from 'react';

/**
 * Keeps the frameless Electron window exactly as large as the Winamp panels.
 *
 * In a browser this is a no-op, so the app remains normally scrollable during
 * development. In Electron the result is a window with no dead background
 * space.
 *
 * Two observers are used on purpose:
 * - MutationObserver catches windowshade/panel changes immediately, because a
 *   collapsed panel only rewrites an inline style.
 * - ResizeObserver catches layout changes that are not inline styles.
 *
 * Scheduling uses a microtask, not requestAnimationFrame or setTimeout:
 * Chromium pauses rAF and ResizeObserver delivery for occluded windows and
 * throttles timers there as well, so a shaded panel could leave an empty band
 * of background at the bottom of the window until the app got focus again.
 */
export const useFitElectronWindow = (
  targetRef: React.RefObject<HTMLElement>,
  deps: React.DependencyList = []
) => {
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.fitWindow) return;

    const element = targetRef.current;
    if (!element) return;

    let scheduled = false;
    let lastWidth = 0;
    let lastHeight = 0;

    const fit = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      if (width <= 0 || height <= 0) return;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      api.fitWindow(width, height);
    };

    // Coalesce bursts of mutations into a single microtask; the size check in
    // fit() makes redundant calls free.
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        fit();
      });
    };

    fit();

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(element);

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: true,
      subtree: true,
    });

    window.addEventListener('resize', schedule);
    // A CSS transition (if one is ever added around the panels) keeps the
    // measured rect mid-animation, so re-measure once it settles.
    element.addEventListener('transitionend', schedule);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', schedule);
      element.removeEventListener('transitionend', schedule);
    };
    // The hook intentionally re-runs when the caller's layout inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
