# Checkapet by Doctapet

Veterinary-side prototype for Gillmore Hackathon, Challenge 1: Prevention that pays.

## Run locally

Node.js 24+ is required for built-in SQLite.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The API runs on port 3001.

```sh
npm run build
npm start
```

The production preview is http://127.0.0.1:3001. The existing `scripts/start-local.command` also builds and starts this preview using the installed runtime. Stop an existing server before starting another on the same port.

## Patient workflow

The app opens directly to 10 fictional patients: 5 dogs, 3 cats and 2 rabbits.

- Search names, owners, patient IDs or microchips. Filter species, review status and last visit dates. Sort by visits, name or next follow-up. Returning from a patient preserves the list state.
- Summary shows outstanding reviews, clinic versus home weight and BCS, activity and care-plan progress.
- Medical Records contains Patient History, Medications & Vaccinations, Weight & Body Condition, and Lab Results & Imaging. Sections fold independently.
- Wearable & Owner Updates shows activity, rest, scratching and licking seconds, head-shaking events, drinking events, night movement, valid wear time, quality, body checks and owner logs. Only dogs have a collar assigned in this concept. Drinking events are not water volume, and rest is not a validated sleep-stage measure.
- Care Plan supports templates, editable tasks, measurement targets, frequency, data source, review dates, drafts and approval. Changing a task's measurement or source clears incompatible completion records. Saving a target recalculates progress against the current target, not historical targets. The owner preview reads saved data and does not send anything to an owner app.
- View Data opens read-only SQL views or source tables scoped to the selected patient. Select a row to inspect the full record, inspect its source, or export the current table to JSON.

## Owner interface

Open `/owner?pet=PT-1042` for Today (one activity ring), Journal, Vet Plan and Healthspan. The patient header in the vet app includes an Owner app link. `/owner?pet=PT-1042&page=healthspan` opens the Health Age design directly. Use `&day=2026-11-14` to present the fictional collar day after that date.

Journal entries, manual owner tasks and monthly body checks persist through the shared SQLite/D1 owner service. Only Published plans and Reviewed results are returned to this interface. A draft plan does not provide an owner activity target. Newly submitted photos do not generate an AI BCS. The Health Age number and trend remain visibly labelled design examples and are independent of clinical data. Care-task consistency uses saved records.

See [the owner + vet walkthrough](docs/owner-demo.md) for a reproducible local demo and the remaining production boundaries. The owner interface and vet workspace share the hosted origin after a Sites deployment. GitHub pushes alone do not update the live version.

## Database

React reads the Node HTTP API backed by SQLite at `data/carelink.sqlite`. The filename remains unchanged to preserve earlier work. Set `DATABASE_PATH` to select another database. Runtime data and backups are excluded from Git.

The additive migration retains imported results and plan edits. One original fictional patient, Luna, becomes a cat to match the requested species mix. A pre-upgrade backup of the original local workspace is kept at `data/before-patient-workspace-v2.sqlite` when created during development.

Source tables:

- `pets`, `programmes`
- `encounters`, `results`, `medications`, `vaccinations`, `allergies`, `body_assessments`, `diagnostic_files`
- `devices`, `wearable`, `owner_logs`
- `plans`, `plan_tasks`, `task_completions`

Read-only SQL views:

- `patient_summary`: one row per patient
- `body_condition_timeline`: one assessment or weight observation per row, combining clinic/home assessments with otherwise unrepresented clinic weight results
- `daily_home_data`: one pet/day, combining wearable readings with aggregated owner check-ins without multiplying rows
- `care_plan_progress`: one task, with completion aggregates against its current target

AI-estimated BCS and vet-assessed BCS retain separate provenance. Rabbit body condition uses a five-point scale in the sample records. No AI photo scoring is executed by this prototype. Missing wearable measurements stay null. Photo slots stay empty when no body-check photos exist.

## Attachments and integration boundaries

A licensed reference canine thoracic X-ray opens in the image viewer with zoom and report navigation. It is reference material, not an examination of the fictional named patient. The ultrasound record has a report but no attached image, so its image action is disabled. No CT/MRI studies are invented. Asset sources and licenses are in `public/asset-credits.txt` and accessible from Workspace information.

Device, PIMS, PACS and external laboratory connections are not implemented. All patient identities, observations, plans and reports are fictional sample data. This is not a validated diagnostic or clinical system. Clinician identity is fixed and fictional. The backend has no production authentication or insurer-sharing system and binds to loopback. Keep real patient data out of this prototype.

## API

- `GET /api/workspace`: tables and derived views
- `POST /api/results`: validate and store an incoming structured result
- `POST /api/results/:id/match`: explicitly associate an unknown source patient
- `POST /api/results/:id/review`: preserve source notes and save a separate clinician review
- `PUT /api/plans/:petId`: save the plan and optional structured tasks transactionally
- `POST /api/reset`: restore the fictional cohort (not exposed in the normal interface)

## Checks

```sh
npm test
npm run build
```

Store tests cover persistence, matching, validation, non-multiplying views, species distribution, null readings, attachment references, structured task ownership and progress recalculation.

## Hosting

The hosted version uses a Cloudflare Worker and persistent D1 database provisioned through Sites. Its project binding is in `.openai/hosting.json`. Local development continues to use SQLite.

`npm run build` builds the React app, checks/generates the initial hosted schema and fictional seed, then creates the deployable Worker at `dist/server/index.js`. Assets are embedded in the Worker so image and report routes stay on the same origin. No local patient database, local edits or database backups are bundled.

`drizzle/0000_checkapet.sql` is schema-only and immutable after deployment. Seed data is separate in `worker/seed.json`, generated from a fresh fictional cohort, and inserted once through a transactional D1 batch. Future deployments retain hosted edits. Hosted reset is disabled. Add a new migration for future schema changes.

The public presentation site shares one fictional dataset across visitors. Saved plan and review changes are visible to other visitors. The local and hosted datasets are independent. This is still a hackathon prototype, not a place for real clinical or owner data.
