# Itemized informational estimate: implementation notes and launch review

**Status:** An informational quantity-and-price snapshot workflow is implemented for the hobby/demo catalogue. This is **not** a checkout, online order, stock reservation, payment, dispatch or sale facility.

## What the website now does

1. A visitor may select products and quantities in the local price calculator and send a clearly labelled non-binding information enquiry.
2. The API accepts product IDs and integer quantities (1–99, up to 50 distinct products), rechecks active products, and snapshots server-verified indicative prices and category names.
3. The snapshot is saved with the enquiry record as a versioned structured envelope in the existing `message` text field, alongside the optional user note. No database migration is required for this demo-compatible change.
4. An authorized admin can view the automatically prefilled quantities and download a branded requested-items estimate PDF showing categories, quantities, original and indicative prices, discounts, savings and totals.
5. Earlier records never containing quantities remain unchanged; the admin can still prepare a separately labelled illustrative estimate for them.
6. Admin PDF routes require authentication. The existing rate limits, idempotency checks, email notification status and 180-day retention process remain intact.

## Restrictions and legal review before commercial use

The Supreme Court of India's October 2018 fireworks directions ban e-commerce websites accepting online firecracker orders or making online sales; PESO reiterated this in April 2023. The informational enquiry workflow must **not** be used to accept or fulfill orders, confirm availability, reserve stock, collect payments, or arrange delivery. The distinction between an informational quantity enquiry and an impermissible online order should be reviewed by qualified Indian counsel before commercial use.

The presence of disclaimers by itself does not establish compliance. If the workflow is determined to be order-like under applicable law, disable the public submission of itemized quantities and keep only the browser-local calculator and admin demonstration.

## Engineering follow-ups

- For a production system, move the versioned snapshot to a dedicated JSON column or related table with a forward-only migration rather than persisting it in the text `message` field.
- Add automated request/response, authorization, PDF and snapshot-integrity integration tests.
- Keep server-side price snapshots private, exclude personal details from public URLs, and continue deleting requests under the documented retention policy.
- Never invent historical customer-selected quantities or prices when old records lack them.
