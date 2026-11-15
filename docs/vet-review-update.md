# Vet workspace review update

Rollback source: Git tag `backup/vet-before-review-2026-11-15` (commit 1b49426).
Git stores source versions, not database backups. Reverting source does not undo patient edits or database migrations. The additive 0001 migration creates plan snapshots and review/sharing metadata; leave these tables in place when rolling back the UI.

## Pitch flow

1. Patients: select Milo; show outstanding reviews.
2. Summary: explain clinic body assessment alongside latest home reading. Partial collar data is clearly labelled.
3. Medical Records: open a result, compare a previous value when available, write an internal note and choose whether to share the reviewed result with the owner.
4. Wearable & Owner Updates: choose activity/itch/rest trend; explain partial readings and owner-reported symptoms. Mark an update reviewed after reading it.
5. Care Plan: open the approved plan, Edit plan, set an appropriate task target and future review date. Save draft preserves the currently approved owner plan. Approve replaces it and archives the previous plan and completion records.
6. Open Owner app and refresh to show the approved plan.

For X-ray evidence use Oliver → Medical Records → Thoracic radiograph. It is a credited reference image, not a real patient study. Milo's ultrasound is report-only.

## Scope and interpretation

- All records are fictional; integrations and diagnostics are not live.
- Clinical focus shows the last recorded assessment. It is not a coded/confirmed active disease register.
- Missing DOB, neuter status, contact details and measurements remain explicitly not recorded; the UI does not invent them.
- Wearable comparisons use the last three complete readings versus up to seven preceding complete readings. This is a descriptive comparison, not a validated personal baseline, clinical threshold or diagnosis. Partial readings remain visible but are excluded from this comparison.
- Progress is a current window of up to 30 days, grouped by calendar day/week/month. Current unfinished periods are in progress, historical missing periods are no data. Weight-check completion means a measurement was recorded, not that target weight was achieved.
- Past-day activity progress uses archived targets where available. No historical plan metadata existed before this update, so earlier target changes cannot be reconstructed.
- View Data → Recorded Task Totals is the existing SQL view of recorded entries. It is not the calendar-period adherence summary shown in Care Plan. Source tables include plan snapshots and review/sharing status.
- New plan snapshots retain the old task definitions and completions when later edits replace/remove them. There is no automatic restoration UI; source rollback is separate from restoring a plan.
- Results already marked reviewed before this update retain existing owner visibility. New reviews can explicitly be clinic-only.
