# Syncapet veterinary prevention workspace

Veterinary-side prototype for Gillmore Hackathon 2026, Challenge 1, Prevention that pays. Clinical results, synthetic home wearable readings and owner check-ins appear in one patient record, where a veterinarian can review results and approve a prevention plan.

## Run locally

Use Node.js 24 or newer. The backend uses the built-in SQLite module.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` requests to the Node server on port 3001.

For a production build served locally:

```sh
npm run build
npm start
```

Open http://127.0.0.1:3001. On the original development Mac, `scripts/start-local.command` can also build and launch the app using the installed runtime. Stop the existing server before starting another on the same port.

The project includes a pnpm lockfile. For reproducible installs, use `pnpm install --frozen-lockfile` instead of npm. `pnpm run build`, `pnpm dev` and `pnpm test` are equivalent commands.

## Demonstration journey

1. Open Milo from Overview. Compare clinical weight, activity, rest and owner observations. Missing sensor data is shown as a gap rather than zero activity.
2. In Clinical results or Data explorer, choose Import result. Load the matched example or `examples/lab-result.json`. It is validated by the API, stored in SQLite and displayed in the table and patient record.
3. Import an unmatched example. It is quarantined as Needs matching, with no patient association. Open it, verify identity against the originating source, then explicitly assign a patient.
4. Open a pending result and add a veterinary review note. The source note is preserved; reviewer identity, review note and timestamp are saved separately.
5. Edit and save a prevention plan, or approve it. Refresh to confirm persistence. Approval stores a Published status; delivery to an owner app is not implemented.
6. Use Reset demo to restore the original synthetic data.

## What is real and what is simulated

| Component | State |
| --- | --- |
| React veterinary UI and responsive charts | Working |
| HTTP API, validation and SQLite persistence | Working |
| Result imports, patient matching and reviews | Working |
| Draft and approved plan storage | Working |
| Wearable readings and owner logs | Seeded synthetic data |
| Imaging records | Metadata and notes only; no diagnostic images or DICOM/PACS receiver |
| Physical analyser, wearable or PIMS connection | Not implemented |
| Owner app, insurer access and underwriting | Not implemented |
| Clinician identity | Fixed fictional demo identity; no login |

This is a local synthetic demonstration, not a clinical system. Do not enter real patient or owner data. The server binds to loopback only. Do not publicly expose this backend without authentication, authorisation, access logging and an appropriate data-governance design.

## Data and architecture

`React UI -> Node HTTP API -> SQLite`

The database is created at `data/carelink.sqlite` and excluded from Git. Set `DATABASE_PATH` to use a different file. Reset is transactional and restores three patients, 11 result records, 42 wearable daily readings, 21 owner check-ins, three plans and programme enrolments.

Tables: `pets`, `results`, `wearable`, `owner_logs`, `plans`, `programmes`. Source, observation time and receipt time are preserved on results. Imported numeric results require units. Reference ranges must be supplied together and are illustrative in the demo, not universal clinical thresholds.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/workspace` | Read the shared dataset |
| `POST /api/results` | Validate and import a result |
| `POST /api/results/:id/match` | Explicitly assign an unmatched result |
| `POST /api/results/:id/review` | Save a clinician review |
| `PUT /api/plans/:petId` | Save a draft or approved plan |
| `POST /api/reset` | Restore synthetic demo data |

## Checks

```sh
npm test
npm run build
```

Tests cover persistence, unmatched-patient quarantine, explicit matching, validation, plan updates and reset. Browser checks cover result import and review, matching, plan approval after refresh, and responsive layout.

## Hosting

Not deployed. This backend requires a writable persistent filesystem for SQLite. Uploading only the Vite build to a static host does not deploy the API. For a shared online version, choose a persistent Node host or adapt the API to serverless functions with a hosted database. Do not assume local SQLite persists on Vercel functions.

## Visual references

Syncapet uses a cream, yellow and near-black theme inspired by the Doctapet veterinary website, with rounded cards and soft green accents informed by its published owner-app screenshots. The Syncapet name and paw mark identify this hackathon concept; they are not the Doctapet logo.

- Website: https://doctapet.ai/#vets
- Published app screenshots: https://apps.apple.com/gb/app/doctapet/id6760935053
