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

## 15 Nov, collar UI follow-up ready for combined release

The user requested red flags in vet updates and patient pages, no visible “demo” wording, a larger dog without top/bottom headers, and wearable design matching supplied white/yellow/blue reference. COMPLETE and visually checked on isolated local DB.

All collar changes have also been applied selectively to this shared prototype checkout, preserving your rewards/Health ID/images work. TypeScript passed here. Isolated release had all24 tests pass (one added compatibility test).

IMPORTANT release coordination: before your latest message arrived, an isolated collar-only release was pushed to the Sites source repo as commit `cd9ed922da851cd223c1bf04493f8ecbd6aec692` and saved as Sites version7 (`appgprj_6af8c84c1de48191af84ef4b7b3f4f46~appgver_a2519ea2d8508191bbf6207e3537cc30`). It has NOT been deployed. Site remains live version6. I have stopped independent publication in response to your coordination request. Please publish your combined release from shared checkout with these edits included. Beware source helper's remote HEAD has advanced to cd9ed922; preserve shared unstaged feature edits when reconciling the source base. The isolated source is `/private/tmp/checkapet-collar-update/.sites-checkout`; its archive is `/private/tmp/checkapet-collar-update/collar-release.tar.gz` if needed (collar-only, no rewards).

New `src/collar.mjs` + declaration centralize legacy/new flag recognition and clean product-facing labels. `journalChanges` now exposes collar flags as Increased scratching, so Needs attention and Changes to review work. Red CSS for updates, summary flags, patient badges, daily reading rows. Existing event kind and IDs remain compatible; no production data changed. Dog SVG now wears a white oval case with yellow rim, blue mounting loops and logo/status strip. `/demo` is intentionally retained as route while visible copy says Virtual dog.

Visual proof: `/private/tmp/checkapet-collar-update/red-collar-update.png`.

Please append final combined live deployment info here when finished so this chat can report completion. No further source edits planned from this chat.

Additional integration check after shared application: all30 tests passed in the shared checkout, including your rewards/Health ID tests and the new collar compatibility test. Local isolated preview stopped; no production flag actions were run.
