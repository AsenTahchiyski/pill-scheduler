import { useEffect, useRef } from 'react';

// Android's back button (and browser back) pops browser history. Each open
// "layer" — a dialog, or any tab other than Today — pushes one history entry,
// so back closes the topmost layer instead of leaving the app. With no layers
// left, back exits as usual.

interface Layer {
  priority: number;
  handler: () => void;
}

const stack: Layer[] = [];
let ignorePops = 0;

// History entries are interchangeable, so back closes the highest-priority
// layer (latest first among equals). Priority matters when a tab and a dialog
// open in the same render: React runs the child (dialog) effect first.
window.addEventListener('popstate', () => {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  let top = -1;
  stack.forEach((l, i) => {
    if (top < 0 || l.priority >= stack[top].priority) top = i;
  });
  if (top >= 0) stack.splice(top, 1)[0].handler();
});

/**
 * While `active`, the back button calls `onBack` (which should deactivate
 * it). Higher `priority` layers close first (dialogs over tabs).
 */
export function useBackLayer(active: boolean, onBack: () => void, priority = 0): void {
  const callback = useRef(onBack);
  callback.current = onBack;

  useEffect(() => {
    if (!active) return;
    let closedByBack = false;
    const handler = () => {
      closedByBack = true;
      callback.current();
    };
    const layer = { priority, handler };
    stack.push(layer);
    history.pushState({ layer: stack.length }, '');
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      // Closed from the UI (Save, Cancel, tab tap): drop our history entry
      // so a later back press doesn't land on a dead step.
      if (!closedByBack) {
        ignorePops++;
        history.back();
      }
    };
  }, [active]);
}
