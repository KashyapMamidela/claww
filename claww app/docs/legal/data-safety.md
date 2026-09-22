# CLAWW — Play Console Data Safety Form Answer Sheet

**Status: DRAFT — not yet reviewed by a human.** This is a field-by-field
answer key for filling out Play Console's Data Safety form, derived from the
same code/schema audit as [`privacy-policy.md`](./privacy-policy.md). It is
not the form submission itself — a human transcribes these answers into
Play Console and makes the calls flagged `[DECISION NEEDED]` below.

Audited against: `database/schema.sql`, `supabase/functions/generate-plan`,
`parse-meal`, `parse-meal-photo`, `compute-recovery`, `delete-account`, and
`app/lib/*.ts`, as of commit `411c968`.

## How to read this

Play's form asks, per data type: **Collected?** → **Shared?** → **Processed
ephemerally?** → **Required or optional?** → **Purpose(s)**. "Shared" in
Play's specific sense means transferred to a party who can use it for their
*own* purposes — a service provider processing data solely to run your app
on your behalf (Supabase, Groq) is a narrower category ("Service Provider")
that Play distinguishes from third-party sharing, but only if your data
processing agreement with that provider restricts them from using the data
for their own purposes. **`[DECISION NEEDED]`** — someone must confirm
Groq's and Supabase's actual terms before answering "shared" one way or the
other; this sheet defaults to the *more disclosed, more conservative* answer
(mark as shared) until that's confirmed, since under-disclosing is the
riskier direction for a Play policy violation.

---

## Personal info

| Data type | Collected | Shared | Required/Optional | Purpose | Notes |
|---|---|---|---|---|---|
| Name | Yes | With Supabase (storage) | Optional | App functionality, Personalization | `profiles.name`, first name only, collected during onboarding |
| Email address | Yes | With Supabase (auth provider) | Required | Account management, App functionality | Supabase Auth; also the account identifier |
| User IDs | Yes | With Supabase | Required | App functionality, Account management | `auth.users.id` / `profiles.id` (UUID) |
| Other personal info | Yes — age, gender | With Supabase; with Groq for plan generation `[DECISION NEEDED]` | Required | App functionality, Personalization | `profiles.age`, `profiles.gender`; age feeds deterministic rep-range/volume rules (see `generate-plan/index.ts`'s `computeRepRange`), gender is stored but not currently sent to Groq — confirm before submitting |

## Health and fitness

Play treats this as a **sensitive category** with extra requirements
(a prominent in-app disclosure and, in some cases, a declaration form).
CLAWW collects real data here — this section needs the most careful review.

| Data type | Collected | Shared | Required/Optional | Purpose | Notes |
|---|---|---|---|---|---|
| Health info | Yes — free-text injury/limitation descriptions | With Groq (sent as part of the generation prompt) `[DECISION NEEDED]` | Optional | App functionality | `personalization_profile.workoutDefaults.injuries`; used to exclude contraindicated exercises (`excludeInjuredExercises` — currently a heuristic filter, see SHIP PHASE 10.1) |
| Fitness info | Yes — height, weight, workout logs, sleep logs, water logs, activity/experience level, goals, **and (Android only) step count + active calories burned read from Health Connect** | With Groq for plan generation only (workout history + profile fields); Supabase for storage `[DECISION NEEDED]`. **Health Connect steps/calories are read-only, processed on-device for the Home screen's stat cards, and never leave the device or reach Groq/Supabase.** | Required (core function) for logged data; Optional for Health Connect steps/calories (declined permission just shows "no data yet") | App functionality, Personalization | `profiles.height/weight`, `workout_logs`, `sleep_logs`, `water_logs`, `nutrition_logs`/`meal_logs` macros; Health Connect via `lib/steps.ts` (`react-native-health-connect`, `Steps` + `ActiveCaloriesBurned` read permissions only — no write access, no other record types) |

**Health Connect declaration — now applicable.** SHIP PHASE 11.1 partially
shipped (2026-09-22): Android reads real step count and active-calorie
totals from Health Connect for the Home screen, scoped to exactly those two
record types, read-only. This requires Play Console's separate Health
Connect data-access declaration (see
[Google's guidance](https://support.google.com/googleplay/android-developer/answer/14738291))
before this build can go to Play — budget ~7 days for that approval plus
another ~5-7 business days for the whitelist to propagate to Health Connect's
servers, per `react-native-health-connect`'s own docs. Sleep-log replacement
and workout-writing (the rest of 11.1's original vision) are still deferred,
not yet built — this declaration only needs to cover Steps + Active Calories
Burned read access, not the broader scope.

## Photos and videos

| Data type | Collected | Shared | Required/Optional | Purpose | Notes |
|---|---|---|---|---|---|
| Photos | Yes — meal photos, when the user chooses photo-based meal logging | With Groq (vision model call) `[DECISION NEEDED]` | Optional (text-based meal logging is the alternative) | App functionality | `parse-meal-photo/index.ts`; the raw photo is sent to Groq as a data URI and is not persisted server-side after the estimate is parsed — only the resulting macro estimate is stored in `meal_logs`. **Verify this against the current code before submitting**, since this is a factual claim about data flow, not a policy choice |

## Financial info

**Not collected.** CLAWW does not process payments as of this writing
(SHIP PHASE 11.5, monetization, hasn't shipped). Revisit this whole section
before that phase goes live — subscription/billing data via RevenueCat will
need its own entries.

## Messages

**Not collected.** CLAWW has no messaging, chat, or communication feature.

## Audio files

**Not collected.**

## Files and docs

**Not collected.**

## Calendar

**Not collected.**

## Contacts

**Not collected.**

## App activity

| Data type | Collected | Notes |
|---|---|---|
| App interactions | **Not collected** (no analytics pipeline exists yet) | Revisit once SHIP PHASE 9.2 (PostHog) ships — that phase must add its own entries here and update this file, not just the code |
| In-app search history | Not collected | No search feature exists |
| Other user-generated content | Yes, functionally, but not for analytics purposes — see Health and fitness / Photos above | The workout/meal/sleep logs *are* user-generated content, already covered above under their substantive category rather than listed twice here |

## Web browsing

**Not collected.**

## App info and performance

| Data type | Collected | Notes |
|---|---|---|
| Crash logs | **Not collected** | No crash reporting exists yet — revisit once SHIP PHASE 9.1 (Sentry) ships; that phase must update this file |
| Diagnostics | Not collected | Same as above |

## Device or other IDs

**Not collected** by the app directly. Standard infrastructure-level logging
(e.g. IP addresses in Supabase/Groq request logs) is outside the app's own
data collection and governed by those providers' own policies — `[DECISION
NEEDED]` on whether Play expects this disclosed regardless.

---

## Standard practices questions

| Question | Answer | Notes |
|---|---|---|
| Is all user data encrypted in transit? | **Yes** | HTTPS to Supabase and Groq throughout; no exceptions in the codebase |
| Do you provide a way for users to request data deletion? | **Yes** | Live as of SHIP PHASE 7.1 — in-app (Profile → Delete Account) and via `docs/legal/delete-account.html` for users without app access |
| Can users request their data be exported? | **Not yet in-app** | SHIP PHASE 7.5 hasn't shipped; until then this is answered as "yes, via a support request" per `privacy-policy.md`, which is a real (if manual) process, not a false "no" |
| Was this app independently security-reviewed? | `[DECISION NEEDED]` | Answer based on whatever audit process actually happened before submission — do not claim one didn't |
| Do you commit to following Play's Families Policy? | `[DECISION NEEDED]` | Depends on target audience/age floor decided in `privacy-policy.md` |

---

## Before submitting

- [ ] Resolve every `[DECISION NEEDED]` — most hinge on Groq's and
      Supabase's data-processing terms actually being read, not assumed
- [ ] Re-verify the "photo not persisted server-side" claim against the
      live `parse-meal-photo` code at submission time, not this audit's date
- [ ] Re-run this whole audit after SHIP PHASE 9.1/9.2 (crash reporting,
      analytics) or 11.1/11.5 (Health Connect, monetization) ship — each
      one adds real data collection this sheet currently says doesn't exist
