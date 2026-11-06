"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
const KEY = "sv-wishlist-v1";
const EVENT = "sv-wishlist-changed";
const LIMIT = 200;
type WishlistValue = { ids: string[]; ready: boolean; has: (id: string) => boolean; toggle: (id: string) => void; remove: (id: string) => void; clear: () => void };
const Context = createContext<WishlistValue | null>(null);
function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 100 && /^[\w-]+$/.test(id);
}
function read(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? Array.from(new Set(value.filter(validId))).slice(0, LIMIT) : [];
  } catch { return []; }
}
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const reload = () => setIds(read());
    reload(); setReady(true);
    window.addEventListener("storage", reload);
    window.addEventListener(EVENT, reload);
    return () => { window.removeEventListener("storage", reload); window.removeEventListener(EVENT, reload); };
  }, []);
  const save = useCallback((update: (existing: string[]) => string[]) => {
    setIds(existing => {
      const next = update(existing);
      try { localStorage.setItem(KEY, JSON.stringify(next)); }
      catch { /* Keep current tab usable even when storage is denied. */ }
      return next;
    });
  }, []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => { if (!validId(id)) return; save(previous => previous.includes(id) ? previous.filter(x => x !== id) : [...previous, id].slice(-LIMIT)); }, [save]);
  const remove = useCallback((id: string) => save(previous => previous.filter(x => x !== id)), [save]);
  const clear = useCallback(() => save(() => []), [save]);
  const value = useMemo(() => ({ ids, ready, has, toggle, remove, clear }), [ids, ready, has, toggle, remove, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWishlist() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("WishlistProvider is missing.");
  return ctx;
}
