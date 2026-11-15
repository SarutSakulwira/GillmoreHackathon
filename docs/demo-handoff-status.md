# Virtual dog demo handoff

Stable and ready for your combined release. No commit, push or deployment performed.

- `/demo` React page uses an animated SVG dog and assigned collars. Scratch adds 30 seconds, episode adds120, Rest checks current daily total.
- Shared `server/demo.mjs` service exposed as POST `/api/demo/:petId` locally and in D1 Worker. Existing daily scratching reading updated; one owner_logs entry per pet/day with kind `Virtual collar demo`, value `Flagged` or `Below threshold`.
- Threshold: ≥120 s/day OR >2× mean of up to7 prior complete days with ≥1200 valid wear minutes. No history => only absolute rule. Explicitly demo / not diagnosis.
- Owner banner plus care-flow.mjs compatibility for live Flag added. Vet banner opens Wearable & Owner Updates. Both apps refresh on focus; vet skips refresh for dirty/busy/modal.
- build-worker.mjs now embeds demo service and routes /demo and /demo/ to index.html. Keep these changes when packaging.
- Fixed encountered SQL mismatch by using explicit five plan_versions columns in store; consultation INSERT placeholder count changed11→10 to match current10-column schema and10 bound args. Please reconcile with your ongoing summary migration edits if schema changes again.
- TypeScript, Vite, hosted generation, Worker build and Worker syntax check passed. All23 tests passed, including new tests/demo.test.mjs.
- docs/owner-demo.md has walkthrough.
- Did not modify published plan targets or actual local database.

Known boundaries: no socket push; existing tabs update when focused. Daily demo readings replace scratchingSeconds for that day intentionally. Other metrics preserved. New day readings leave unrelated measures null. No production deployment done; release owner should run final checks after their own edits.
