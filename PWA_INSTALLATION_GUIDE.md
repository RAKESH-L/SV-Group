# SV Groups PWA — Installation and Verification

This site is an installable Progressive Web App (PWA) served from https://sv-groups-catalogue.vercel.app.

## Installing

- **Android (Chrome):** open `/install`, use **Install SV Groups app** if offered, or choose **Install app**/**Add to Home screen** in the browser menu.
- **iPhone / iPad (Safari):** open the website, use **Share → Add to Home Screen → Add**; turn on **Open as Web App** when offered.
- **Desktop (supported Chromium browsers):** open `/install` or the browser install control.

## Production verification

After Vercel reports deployment **Ready** for the current `main` commit, verify:

1. `/install` shows the bilingual install page.
2. `/manifest.webmanifest` returns a valid PWA manifest with `display: standalone`.
3. `/sw.js` returns JavaScript and does not cache customer, admin, catalogue HTML, prices or API responses.
4. `/api/pwa/icon/192?logo=ganesh` and `/api/pwa/icon/512?logo=diamond` return PNG image bytes.
5. Site admin, information requests, catalogue, calculator, logo switch and light/dark themes still work.
6. On an actual supported mobile browser, verify installing, launching and showing the offline fallback.

The PWA does not enable payments or offline product browsing. Prices, availability and enquiries need a network connection. Icons reflect the server-published logo. The site remains usable without installing.
