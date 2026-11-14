# Owner UI handoff

The owner interface can be restyled without replacing the vet workspace or database.

## UI files

- `src/owner/OwnerApp.tsx`: owner screens, navigation, form state and API calls
- `src/owner/owner.css`: owner-scoped visual styles
- `src/main.tsx`: routes `/owner` to OwnerApp, retains the vet workspace at `/`

Replace the owner screen layout and styling with the teammate's design while retaining the data and action contracts below. Avoid global CSS changes that would restyle the vet interface.

## Data contract

`GET /api/owner/:petId` returns `pet`, `plan`, `planTasks`, `taskCompletions`, `wearable`, `ownerLogs`, `bodyAssessments`, `results` and `devices`.

- `plan` is null until a vet publishes it. Use the approved daily activity task for the ring target rather than a hardcoded number.
- Read the selected day's collar value. Missing or stale readings are not zero activity or today's readings.
- Manual task updates belong to the selected patient and published plan. Owners cannot replace collar or clinic readings with checkboxes.
- Journal entries update one pet/day and remain visible in the vet workspace.
- Body checks preserve clinic/home provenance. New submissions do not create an AI BCS.

Write contracts and examples are in `docs/owner-demo.md`. The shared service is `server/owner.mjs`, called by both `server/index.mjs` (SQLite) and `worker/api.mjs` (hosted D1).

## Health Age design

The prominent Health Age and trend are illustrative fixtures, not a validated calculation or a forecast of years gained. Retain their visible concept labels until a validated model exists. Actual pet age and saved care-task consistency are separate, data-backed fields.

## Release check

Run `npm test` and `npm run build`, then verify the two-tab flow in `docs/owner-demo.md`. Publish a new version to the existing Site using its existing project ID and D1 binding. Do not reset the hosted database or replace the immutable initial migration for a visual-only change.
