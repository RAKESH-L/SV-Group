# Stage B: Itemized informational estimate (disabled pending written clearance)

**Status: Not implemented. Do not enable from a disclaimer or environment variable alone.**

This plan is separate from Stage A. Stage A stores and displays product topics only. There is no quantity, price-snapshot, estimate-line, order, reservation, payment, or fulfilment behavior in the deployed enquiry flow.

## Required approval gate

Before implementation, obtain written advice from qualified Indian counsel addressing the exact flow: transmitting customer contact details together with selected fireworks, quantities, and price calculations; retaining an informational PDF; and emailing it to the business. Record approval of the final UX wording and request payload. If the flow is not approved, keep Stage B out of production.

## Proposed technical shape after approval

1. Keep the public request explicitly informational and keep a hard-coded server feature gate off by default. Enabling requires a code-reviewed change after the written clearance, not merely setting a Vercel variable.
2. Accept product IDs and integer quantities only. Re-fetch active products and categories on the server; never trust client-supplied names, prices, discounts, or totals.
3. Calculate all amounts as integer paise, validate a documented quantity cap, and snapshot the product name, category name, quantity, original and indicative unit prices, line totals, and savings at submission time.
4. Store snapshots in a new related table or JSON field using a forward-only migration. Existing enquiries remain topic-only; do not backfill guessed quantities or prices. Do not reset or rewrite existing rows.
5. Generate the admin PDF from stored snapshots, label every total as indicative, and keep the non-transactional disclaimer visible. Do not add order acceptance, reservations, inventory holds, payment, delivery, or fulfilment states.
6. Keep snapshots private, admin-authenticated, rate-limited, protected from duplicate submission, and covered by an approved retention policy. Exclude itemized values from public URLs and logs.
7. Before release, test migration rollback planning, old topic-only PDFs, snapshot immutability after catalogue edits, authorization, redaction, and the disabled-by-default behavior in both Preview and Production.

## Data availability in current records

`InformationEnquiry` currently persists the enquiry reference, customer name and mobile, optional message, product name strings, consent timestamp, status, email metadata, and timestamps. It does not persist product IDs, categories, quantities, or price snapshots. Category and descriptive enrichment in the Stage A admin PDF is resolved from the current catalogue when possible and is labeled as current catalogue data, not historical data.
