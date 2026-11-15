# Rewards, photo tasks and Pet Health ID

## Owner navigation
Today → Rewards or Pet Health ID. Both are secondary pages; the five existing bottom tabs remain. Direct routes: `/owner?pet=PT-1042&page=rewards` and `/owner?pet=PT-1042&page=health-id`.

## Rewards
- Journal: ten distinct consecutive completed Health journal dates earn one 5% coupon per pet. Future entries do not count; missed dates reset the current streak, not already-earned coupons.
- Plan: the vet assigns a fixed 1–30 day milestone from an approved plan. The task snapshot preserves the agreed targets if the plan changes later. Every scheduled action must be met before the period ends. Daily activity needs a complete collar reading at/above target; manual owner tasks need completion evidence; a weight check rewards the measurement, not weight loss. Weekly tasks are grouped in seven-day blocks from the challenge start; a monthly task is once within the <=30-day challenge.
- Photo: the vet assigns instructions and a date range, e.g. Daily teeth photo for five days. The owner uploads one photo per scheduled day. Uploads can be replaced on the same day but cannot be backdated or future-dated. All days must be present. Photos record the action only; no AI dental assessment or image authenticity verification is claimed.
- Vet chooses a 5%, 10% or 15% prototype discount for assigned challenges.
- Eligibility and coupon issuance run on the server. Coupon IDs are deterministic per pet/challenge; retries/refresh cannot issue duplicates. Coupons expire after 30 days and can be applied once to a saved selection. No real retailer redemption, checkout or payment exists.
- Wallet and challenge evidence persist in D1/SQLite via additive migration 0003. No existing records are reset.

## Vet workflow
Patient → Care Plan → Care rewards & photo tasks → Add reward task. Choose Daily photo task or Complete approved plan; title, instructions, start/end and coupon amount. Uploaded evidence appears under Photo submissions in the same panel, and the new source tables are in View Data.

## Health ID
Reads the same patient, allergy, medicine, vaccine, encounter, body assessment and approved-plan tables as the vet workspace. Test results and imaging are restricted to reviewed, owner-shared results. Internal review notes and clinic-only results/reports are excluded. Owner can show the card, print/save PDF, download a JSON record, or copy the owner-app URL. This is a fictional public prototype, not an authenticated portable medical-record exchange. Unknown demographics remain unknown; the app does not invent DOB/neuter/contact data.

## Product images
The uploaded wearable device, Food, water, toilet and scale PNGs replace the earlier stock concept drawings. All five supplied designs appear in Shop alongside the existing Calm-O-Care reference. Prices remain unconfirmed and product capabilities remain concepts.

## Demo
1. In vet Care Plan, assign Daily teeth photo starting today for five days.
2. Open owner Vet Plan/Rewards; upload today's image and see 1/5.
3. Return to the vet and refresh; show the same uploaded evidence.
4. Open Health ID and compare vaccines, clinic weight, reviewed results and plan against the vet record.
5. Rewards accrue on actual recorded days; the production dataset is not seeded with fabricated completion evidence. Automated isolated tests fast-forward a controlled clock to verify earning, duplicates and expiry.

Today layout: the activity ring is directly below the pet header and compact date/sync row. The large Collecting data/Normal card is removed. Data quality is a short note under the ring. Membership, Rewards, Health ID and vet-contact shortcuts follow the ring. Watch/Flag guidance remains below it, with a compact vet-review shortcut above the ring for Flag.
