# Owner shop and own-vet flow

Five bottom tabs: Today, Journal, Vet Plan, Healthspan, Shop. Today also links to Membership and Talk to my vet.

## Presentation routes
- `/owner?pet=PT-1042&scenario=normal`: illustrative normal flow, continue vet routine.
- `/owner?pet=PT-1042&scenario=watch`: illustrative watch flow, routine first; optional products are collapsed below the routine and consultation choices.
- `/owner?pet=PT-1042&scenario=flag`: illustrative flag flow; consult own vet, no products. Shop tab shows a care-first pause screen, including on direct `page=shop` links.
- `/owner?pet=PT-1042&page=shop`: catalogue, category filters, search, details, saved selection.
- `/owner?pet=PT-1042&page=consult`: video/phone request, reason, preferred date/window, optional snapshot of that day’s collar reading and journal.
- `/owner?pet=PT-1042&page=membership`: proposed collar+app subscription and insurer contribution model, no price or insurer benefit invented.

About → Care-flow preview switches Normal/Watch/Flag/Recorded data. Preview choice is visibly labelled and changes no clinical record. Recorded-data mode checks current journal changes and data completeness; it is not an AI triage model. Incomplete data never implies Normal. A Flagged Virtual collar demo log also routes to Flag in Recorded data mode.

## Consultations
Requests persist in the shared SQLite/D1 `consultation_requests` table (additive migration 0002). They appear under the patient’s Needs attention in the vet workspace and in View Data. A consented health snapshot is captured from that patient’s recorded data on the server; unchecked means no attached summary. Preview scenarios are never stored as a clinical finding. Requests are idempotent by client-generated request ID and scoped to pet ID. No availability, confirmation, live call or external clinic notification exists.

## Products
Calm-O-Care reference uses the official Doctapet product name, 20×1g format, official product photo and the user-provided Amazon India link. No retailer price, efficacy claim, dosage or individual vet approval is invented. Syncapet collar, unbranded feeder and cat-only litter station are clearly identified concepts. No manufacturer partnership is represented as signed.

Selection persists per pet in local browser storage. It is an interest list; no order, payment or clinic commission is made. Flag suppresses the entire product flow.

## Suggested pitch
1. Show Today (Normal) and the routine/ring.
2. Switch to Watch in About; follow vet plan first, then optional Shop.
3. Browse Syncapet / Calm-O-Care, add to selection, review it.
4. Switch to Flag; show Shop suppressed, choose Consult my vet.
5. Save a request for a fictional patient; open the same patient’s vet Summary to show the request and consented daily summary.
6. Membership explains the future subscription and insurer model; no active reward, cover or reduced excess is claimed.

Git version history is source rollback, not database backup. No existing patient records are cleared by this release.
