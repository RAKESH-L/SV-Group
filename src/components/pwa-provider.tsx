"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAnonymousVisitorId } from "@/lib/client-analytics-identity";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type PwaState = {
  available: boolean;
  installed: boolean;
  isIos: boolean;
  isSafari: boolean;
  error: string;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
};
const PwaContext = createContext<PwaState>({
  available: false, installed: false, isIos: false, isSafari: false,
  error: "", install: async () => "unavailable",
});

const INSTALL_RECORDED_KEY = "sv_pwa_install_event_recorded_v1";
let reportingInstall = false;

function reportObservedInstall(source: "appinstalled" | "standalone") {
  // Browser analytics only. No calls from admin pages or privacy opt-outs.
  if (location.pathname === "/admin" || location.pathname.startsWith("/admin/")) return;
  if (reportingInstall) return;
  const visitorId = getAnonymousVisitorId();
  if (!visitorId) return;
  try {
    if (window.localStorage.getItem(INSTALL_RECORDED_KEY) === "yes") return;
  } catch { return; }

  reportingInstall = true;
  void fetch("/api/analytics/pwa-install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    keepalive: true,
    body: JSON.stringify({ visitorId, source }),
  }).then(async response => {
    if (!response.ok) return;
    const body = await response.json() as { counted?: boolean };
    // "counted: false" means this anonymous browser was already recorded
    // recently. Still remember the success so refreshes do not add traffic.
    if (typeof body.counted === "boolean") {
      try { window.localStorage.setItem(INSTALL_RECORDED_KEY, "yes"); }
      catch { /* No local storage: server 35-day dedup still applies. */ }
    }
  }).catch(() => {
    // Analytics must never interrupt the install or browsing experience.
  }).finally(() => { reportingInstall = false; });
}

export function usePwaInstall() { return useContext(PwaContext); }

export function PwaProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const userAgent = navigator.userAgent || "";
    setIsIos(/iPhone|iPad|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setIsSafari(/Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent));
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    if (standalone) reportObservedInstall("standalone");

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }
    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
      reportObservedInstall("appinstalled");
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    // Install only on HTTPS/localhost. Failures never block browsing or admin.
    const register = () => {
      if (!("serviceWorker" in navigator) ||
        (location.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(location.hostname))) return;
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => { /* PWA is optional; public website remains fully functional. */ });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("load", register);
    };
  }, []);

  async function install(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!promptEvent || installed) return "unavailable";
    const current = promptEvent;
    setPromptEvent(null);
    setError("");
    try {
      await current.prompt();
      const choice = await current.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      return choice.outcome;
    } catch {
      setError("The browser could not open its installation prompt. Use the browser menu instead.");
      return "unavailable";
    }
  }

  const value = useMemo(() => ({
    available: promptEvent !== null,
    installed, isIos, isSafari, error, install,
  }), [promptEvent, installed, isIos, isSafari, error]);

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
