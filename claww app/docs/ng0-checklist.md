# NG PHASE 0 checklist

Everything V2 PHASES 1 to 9 still needed, in order, with what is done. Part of NG PHASE 0 in
`nextgen/claww-nextgen-phased-prompts.md` (on `ng/plan`). Devices A, B and C are in
`docs/device-matrix.md`.

Status words: **done** (verified, with how), **to do**, **needs you**.

## 1. Database

| # | Item | Status |
| --- | --- | --- |
| 1.1 | `database/schema.sql` applied live (every V2 table and column) | **done**, applied 2026-10-19; re-verified 2026-11-03 read-only through the Supabase connector: all 54 tables and `ADD COLUMN` entries in `schema.sql` exist live, and row-level security is on for every public table |
| 1.2 | `database/seed_exercise_metadata.sql` | **done**, 183 of 183 exercises have `primary_muscle` (verified 2026-11-03) |
| 1.3 | `database/seed_exercise_form_guides.sql` | **done**, 183 of 183 exercises have `form_steps` (verified 2026-11-03) |
| 1.4 | Lock down two `SECURITY DEFINER` functions the Supabase security advisor flagged: `handle_new_user()` was callable by anyone at `/rest/v1/rpc/handle_new_user`, and `check_and_increment_generation_usage` by signed-out users | **needs you**: the `REVOKE` lines are in `schema.sql` (NG PHASE 0 comments). Applying them live was blocked by Claude Code's safety check, so either allow it once or run the two lines below in the Supabase SQL editor |
| 1.5 | Turn on leaked-password protection (Supabase advisor) | **needs you**: Supabase dashboard > Authentication > Providers > Email (or Attack Protection) > "Prevent use of leaked passwords". It may need a paid plan; skip if it does |
| 1.6 | Advisor notes left as they are | `waitlist` has RLS with no policies on purpose (only the `join-waitlist` function writes it); `pg_net` sits in the `public` schema, low risk, moving it could break the cron call |

SQL for 1.4 (both lines are idempotent):

```sql
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_increment_generation_usage(TEXT, INT) FROM anon;
```

## 2. Edge Functions and secrets

| # | Item | Status |
| --- | --- | --- |
| 2.1 | `generate-plan`, `compute-recovery`, `suggest-meal` deployed with the V2 code | **done** 2026-10-19 (versions 32, 15 and 7, all ACTIVE on 2026-11-03) |
| 2.2 | `send-reminders` deployed without JWT check, `CRON_SECRET` set | **done** 2026-10-19 (version 6, ACTIVE) |
| 2.3 | pg_cron and pg_net on, vault secret `claww_cron_secret`, hourly job `claww-send-reminders` | **done**, job and vault secret present on 2026-11-03 |
| 2.4 | `parse-meal`, `parse-meal-photo`, `health-check`, `delete-account` | **done**, unchanged by V2, ACTIVE |

## 3. Firebase and push

| # | Item | Status |
| --- | --- | --- |
| 3.1 | Firebase project `claww-828a3`, `google-services.json` in `app/` and in `app.json` | **done**, commit `9d79983` |
| 3.2 | FCM V1 service-account key uploaded to EAS (`eas credentials`) | **done** 2026-10-19 by you |
| 3.3 | iOS push (APNs key) | **not started**, needs an Apple Developer account (see device C) |

## 4. Builds

| # | Item | Status |
| --- | --- | --- |
| 4.1 | First V2 preview APK | **done** 2026-10-19 (EAS build `129ed7a6`) |
| 4.2 | New preview APK with the NG 0 changes (speed numbers in Settings, support address fix) | **to do**: `eas build --profile preview --platform android` from `claww app/app` |
| 4.3 | iOS build | **needs you**: an Apple Developer Program membership first (see `docs/device-matrix.md`) |

## 5. Device tests (V2 PHASES 1 to 9)

Run on device A first, then the starred ones on device B. Steps for each are in `CLAUDE.md` under each V2 phase ("Device test").

| # | Test | A | B |
| --- | --- | --- | --- |
| 5.1 | V2 1: greeting, plan card day, sleep ring, past days, meal photo | | |
| 5.2 | * V2 1 / 9: Skia rings and charts render in the release build | | |
| 5.3 | * V2 2: player, one-tap set, rest, rest-over notification with the phone locked | | |
| 5.4 | * V2 2.5: airplane mode for 3 sets, back online, all 3 appear once | | |
| 5.5 | * V2 3: onboarding asks for notifications (Android 13+), 2-minute test reminder arrives locked | | |
| 5.6 | V2 3.3: meal reminder arrives; after logging that meal it doesn't | | |
| 5.7 | V2 4: water row add, long-press, undo; sleep row | | |
| 5.8 | V2 5: three meal suggestions, refine chips, vegetarian check | | |
| 5.9 | V2 6: weekdays pre-selected, Missed day, reps-left chip saved | | |
| 5.10 | V2 7: muscle check, today's prescription, "What changed for next time", added exercise starts as calibration | | |
| 5.11 | * V2 8: guide sheet from a workout day, from the player, and Add exercise > info (nested modals) | | |
| 5.12 | V2 9: Tracker cards, full-screen charts, locked state | | |
| 5.13 | * Steps from Health Connect on Home | | |

## 6. Baseline numbers (NG 0.4)

Recorded into `docs/baseline.md` once 4.2 is installed. Set latency and Home first paint are on
the phone: Settings > Speed numbers (preview builds only).
