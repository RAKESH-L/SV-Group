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

## Engagement features — post-deployment verification

The latest SV Groups release also includes five optional engagement features. Confirm these on the active production deployment:

1. **Favorites:** select a heart on an active product and open `/wishlist`; the choice should persist in the same browser.
2. **Save My Selection:** add products to `/cart`, save a named selection and restore it; restored values must use current catalogue prices.
3. **Share Estimate / Selection:** share or copy a selection link from the price calculator; opening it should offer to load the product IDs and quantities, without transmitting personal details.
4. **WhatsApp information enquiry:** check the product detail, wishlist and calculator enquiry links open prefilled *informational* questions only; no booking or payment.
5. **Push Notifications:** open `/notifications` and explicitly subscribe on a compatible browser; in **Admin → Push**, verify opt-in subscriber counts and test a small, consented broadcast. Test browser permission, unsubscribe and a real installed-PWA device. Do not assume delivery was successful without device validation.

All user selections are local-browser features, not online orders. Browser push requires permission and compatible browsers. The release is considered live only when Vercel shows **READY** for the intended production commit and the production alias points to it.

## Performance release verification (November 2026)

The production optimization (PR #19) preserves all existing public layouts, themes, logos, admin features and customer-facing information.

After the latest `main` commit deploys successfully, verify the live routes `/`, `/catalogue`, `/categories`, `/wishlist`, `/cart`, and `/install` alongside the admin interface. Ensure the published theme, logo, three rotating banners and small hero offer retain their prior appearance. Verify product and inventory edits update public listings after saving, including their indicative prices. Recheck that the PWA updates smoothly, and use Vercel runtime metrics to compare page-load performance before and after the release.

Latest release deployment is initiated from `main` by the repository's existing Vercel Git integration. A successful GitHub push does not by itself prove that Vercel has finished building or promoted the release; confirm Vercel reports **Success/Ready** on the new commit before treating it as live.
