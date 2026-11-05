"use client";

import { ArrowUpRight, CheckCircle2, Download, Info, Share2, Smartphone, Wifi } from "lucide-react";
import { usePwaInstall } from "@/components/pwa-provider";
import { useLanguage } from "@/components/language-provider";

export function PwaInstallPanel() {
  const { available, installed, isIos, isSafari, error, install } = usePwaInstall();
  const { t } = useLanguage();

  return <section className="pwa-install-panel" aria-label={t("Install SV Groups")}>
    <div className="pwa-install-card">
      <div className="pwa-install-heading">
        <span className="pwa-install-circle"><Smartphone size={25} aria-hidden="true"/></span>
        <div>
          <span className="pwa-install-overline">{t("YOUR WEBSITE, ONE TAP AWAY")}</span>
          <h2>{t("Install SV Groups")}</h2>
          <p>{t("Add the catalogue to your home screen. It opens in an app-style window while using the same SV Groups website.")}</p>
        </div>
      </div>
      {installed ? (
        <div className="pwa-installed" role="status">
          <CheckCircle2 size={22} aria-hidden="true"/>
          <span>{t("SV Groups is already running as an installed app on this device.")}</span>
        </div>
      ) : available ? (
        <button type="button" className="pwa-install-main-button" onClick={() => void install()}>
          <Download size={19} aria-hidden="true"/> {t("Install SV Groups app")} <ArrowUpRight size={18} aria-hidden="true"/>
        </button>
      ) : (
        <div className="pwa-install-instructions">
          <p className="pwa-install-instruction-title"><Info size={18} aria-hidden="true"/> {t("Install using your browser")}</p>
          {isIos ? (
            <>
              <p><Share2 size={16} aria-hidden="true"/> {t("iPhone / iPad: Open the Share menu, choose Add to Home Screen, then tap Add.")}</p>
              {!isSafari && <p>{t("If Add to Home Screen is missing, open this website in Safari and try again.")}</p>}
            </>
          ) : (
            <p>{t("Android / desktop: Open your browser menu and choose Install app or Add to Home Screen if available.")}</p>
          )}
          <small>{t("Installation availability depends on your browser and device. The website works normally without installing.")}</small>
        </div>
      )}
      {error && <p className="pwa-install-error" role="alert">{error}</p>}
    </div>
    <div className="pwa-install-benefits">
      <div><span><Smartphone size={19}/></span><strong>{t("App-style experience")}</strong><p>{t("A home-screen icon and standalone opening window on supported devices.")}</p></div>
      <div><span><Wifi size={19}/></span><strong>{t("Offline fallback")}</strong><p>{t("An offline notice appears if you lose connectivity. Live prices and availability require internet.")}</p></div>
      <div><span><CheckCircle2 size={19}/></span><strong>{t("Always the same website")}</strong><p>{t("No separate app store, login, payment or additional account is required.")}</p></div>
    </div>
  </section>;
}
