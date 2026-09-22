# CLAWW Privacy Policy

**Status: DRAFT — not yet reviewed by a human, not yet legally binding.**
A person must read every word of this before it is published at a real URL or
submitted to Google Play. Placeholders that need a real decision are marked
`[FILL IN]`.

**Last updated:** `[FILL IN — publish date]`
**Effective date:** `[FILL IN]`

This policy describes what CLAWW ("the app", "we", "us") collects, why, and
what you can do about it. It's written against what the app actually does as
of this writing, not a generic template — every data flow named below is
real, traced from `database/schema.sql` and the Edge Functions in
`supabase/functions/`.

## Who this covers

Anyone who creates a CLAWW account or uses the app.

**Legal entity:** `[FILL IN — the developer/company name that will appear on
the Play Console listing]`
**Contact:** `privacy@claww.app` `[FILL IN — replace with a real, monitored inbox before publishing]`

## What we collect

### Account information
Email address and password, handled by Supabase Auth. We never see or store
your raw password — Supabase hashes it.

### Profile information
Name, age, height, weight, gender, fitness goal, experience level, and
available equipment, all provided during onboarding. Stored in the
`profiles` table.

### Health and fitness data
This is a **sensitive data category** under Google Play's policies, and CLAWW
collects several kinds of it:
- Body metrics: height, weight, age
- Free-text injury or limitation descriptions you enter during workout setup
  (e.g. "bad knees, lower back pain") — used to filter which exercises your
  plan can include
- Sleep logs: hours slept, bedtime, wake time
- Workout logs: exercises performed, sets, prescribed vs. actually-achieved
  reps and weight
- Meal and nutrition logs: what you ate, estimated calories/protein/carbs/fats
- Water intake logs
- On Android, with your permission: step count and active calories burned
  today, read from Health Connect to show on the Home screen. This is
  read-only — CLAWW never writes to Health Connect, never reads any other
  data type from it, and this data is processed on your device and never
  sent to our servers or any third party

### Photos
When you log a meal by photo, that image is sent for nutritional analysis
(see "Third parties" below) and the *resulting estimate* — not the photo
itself — is stored in your meal log. `[FILL IN — confirm whether the raw
image bytes are retained anywhere after the API call returns; as of this
writing the code path does not persist the image, only the parsed
nutritional estimate, but this line must be verified against the current
code before publishing]`

### Usage and gamification data
XP events, achievement/streak progress, and how many AI-generation requests
you've made today (to enforce fair-use limits — see `generation_usage`).

### What we do *not* collect
We do not collect precise location, contacts, or payment information — CLAWW
does not currently process payments.

## How we use it

- **Personalizing your plan.** Rep ranges, training frequency, and injury
  filtering are computed deterministically from your profile — never by an
  AI model. A large language model (see "Third parties") is only used to
  select and name specific exercises within limits we've already computed,
  and to estimate nutrition from a text or photo meal description. Every
  AI-produced result is validated against a strict schema before it's shown
  to you, with a safe fallback if it fails validation.
- **Tracking progress.** Workout, sleep, meal, and water logs power your
  recovery score, streaks, and the Tracker tab.
- **Fair use enforcement.** We track how many plan-generation and
  meal-estimation requests you make per day to keep the service usable for
  everyone (see `generation_usage`).
- **Operating the service.** Diagnosing failures — for example, if an AI
  provider is down, we log *that a failure happened and why* (never your
  personal data) to `generation_failures` so we can fix it. This log is never
  shown to you in the app.

## Third parties (subprocessors)

We share data with two subprocessors, both necessary to run the app:

| Subprocessor | What it receives | Why |
|---|---|---|
| **Supabase** | Everything in this policy — it's our database, authentication, and backend hosting provider. | Stores and serves all app data. |
| **Groq** | Your free-text injury description, workout history, and profile fields relevant to plan generation; your free-text or photo meal description when you log a meal. | Runs the AI model that selects/names exercises within our constraints and estimates nutrition. Groq is a third-party, US-based inference provider. |

Both subprocessors have their own privacy policies governing how they handle
data on our behalf: `[FILL IN links to Supabase's and Groq's current privacy
policies]`. Photos and injury text sent to Groq are subject to Groq's own
data-handling and retention practices, which we do not control.

We do not sell your data, and we do not share it with anyone else.

## Data retention

Your data is retained for as long as your account exists. If you delete your
account (see "Your rights" below), every row belonging to you — profile,
workouts, meals, sleep, water, XP, achievements, and generation history — is
deleted immediately from our live database. Routine backups that include
your data are rotated out within `[FILL IN — confirm your Supabase project's
actual backup retention window]` of deletion.

## Your rights

- **Delete your account.** In-app: Profile → Delete Account, with a
  type-to-confirm step. This is immediate and irreversible. If you no longer
  have the app installed, see our [account deletion page](./delete-account.html).
- **Export your data.** `[FILL IN once SHIP PHASE 7.5 ships an in-app export
  — until then: email privacy@claww.app and we'll send you a copy of
  everything tied to your account.]`
- **Correct your data.** Most profile fields (weight, height, goals, etc.)
  can be edited directly in the app.

## Children

CLAWW is not directed at children under `[FILL IN — 13 or 16 depending on
your target markets/COPPA-GDPR-DPDP posture]`, and we do not knowingly
collect data from them.

## Security

- Every table is protected by row-level security — you can only ever read or
  write your own rows, enforced at the database level, not just in app code.
- Your session token is stored in your device's secure keychain
  (`expo-secure-store`), not plain storage.
- All traffic between the app and our backend is encrypted (HTTPS).

## Changes to this policy

If we materially change what we collect or who we share it with, we'll
update this page and notify you in-app. `[FILL IN — decide the actual
notice mechanism, e.g. a forced acknowledgement screen]`

## Contact

Questions about this policy, or a request that isn't covered by an in-app
option: `privacy@claww.app` `[FILL IN — real inbox]`
