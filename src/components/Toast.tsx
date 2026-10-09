import { useCallback, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);
  const node = toast && (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] rounded-full bg-ink text-surface px-4 py-2 text-sm shadow-lg">
      {toast}
    </div>
  );
  return { flash, node };
}
