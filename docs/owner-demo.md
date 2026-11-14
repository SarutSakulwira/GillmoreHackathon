# Owner + vet demo walkthrough

The owner interface and vet workspace use the same hosted database. Open these two tabs for the online demo:

- Vet: https://checkapet-vet.vivid-coot-4069.chatgpt.site/?pet=PT-1042&tab=care-plan
- Owner: https://checkapet-vet.vivid-coot-4069.chatgpt.site/owner?pet=PT-1042&day=2026-11-14
- Healthspan: https://checkapet-vet.vivid-coot-4069.chatgpt.site/owner?pet=PT-1042&day=2026-11-14&page=healthspan

The `day` parameter selects the fictional collar day for a repeatable presentation. It does not reset or modify the shared database. Existing hosted edits survive redeployment.

## Start

```sh
npm run build
npm start
```

Open two tabs:

- Vet: http://127.0.0.1:3001/?pet=PT-1042&tab=care-plan
- Owner: http://127.0.0.1:3001/owner?pet=PT-1042&day=2026-11-14

The explicit date keeps the sample collar readings useful when presenting after 14 November. Without `day`, the owner app uses the current date in Europe/London and shows missing readings rather than recycling yesterday's activity as today's.

## 1. A plan from the vet

A fresh database has Milo's plan in Draft. The owner sees no draft plan or activity target. Existing local plan approvals are preserved.

In the vet tab, review the fictional plan, keep its example 60-minute activity target or choose another target, and click Approve plan. This is an example workflow, not an exercise recommendation.

In the owner tab, click Refresh health data. The approved plan and target appear in Today and Vet Plan. Switching back into the owner window also refreshes saved records when no form is being edited.

## 2. A daily owner journal

Open Journal, record appetite, comfort, drinking and toileting, add a note, and save. Today shows the completed check-in. Reopening the journal restores the saved answers. Saving the same pet/day updates the entry instead of duplicating it.

Refresh the vet tab, open Wearable & Owner Updates, and find the same structured entry under Owner Updates. View Data > Source Tables > Owner updates shows the stored record.

## 3. Plan progress

The owner can tick a manual owner check-in task from an approved plan. The same task completion appears in the vet's plan progress and `care_plan_progress` view. The owner cannot overwrite collar activity or clinic measurements with a checkbox.

## 4. Monthly body check

Open Monthly Body Check. Add both top and side photos plus a measured weight, or save weight only. The prototype accepts JPEG/PNG/WebP under 10 MB and prepares small JPEG previews for storage. Uploading photos does not calculate a BCS.

Refresh the vet's Wearable & Owner Updates or Summary to see the new home weight and photos. The new BCS stays unassessed. Source body assessments and the combined timeline retain clinic and home provenance separately.

## 5. Healthspan

Open Healthspan. The prominent Health Age and chart are fixed illustrative design fixtures, visibly labelled as not calculated or validated estimates. Actual age comes from the pet record. Care consistency comes from recorded owner task completions and does not predict lifespan or years gained.

## Hosting preparation

The Worker serves `/owner` and the same shared owner service runs against local SQLite or hosted D1. No new schema migration or reset is required for this addition. Owner and vet writes share the hosted database. Local records do not automatically upload to the hosted database.

Owner endpoints:

- `GET /api/owner/:petId`
- `POST /api/owner/:petId/journal`
- `POST /api/owner/:petId/body-check`
- `PUT /api/owner/:petId/tasks/:taskId`

The interface deliberately offers the five fictional dogs with collar data. Pet ID selection scopes responses, but it is not authentication or production access control. Before real use, add verified owner accounts, pet ownership checks, explicit clinical publication permissions, secure file storage, access logging and validated device/model integrations. Do not enter real personal or clinical data into this prototype.
