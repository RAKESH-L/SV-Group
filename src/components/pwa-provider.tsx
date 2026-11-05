"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }
    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
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
