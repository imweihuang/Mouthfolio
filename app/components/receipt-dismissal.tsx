"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const ReceiptDismissalContext = createContext({
  dismissedUrl: null as string | null,
  dismiss: (_url: string) => {},
  clear: (_url: string) => {},
});

export function ReceiptDismissalProvider({ children }: { children: ReactNode }) {
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null);
  const dismiss = useCallback((url: string) => setDismissedUrl(url), []);
  // Cleanup for an older inspector must not clear a newer close intent.
  const clear = useCallback((url: string) => setDismissedUrl(current => current === url ? null : current), []);
  return <ReceiptDismissalContext.Provider value={{ dismissedUrl, dismiss, clear }}>{children}</ReceiptDismissalContext.Provider>;
}

export const useReceiptDismissal = () => useContext(ReceiptDismissalContext);
