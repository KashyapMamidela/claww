# CLAWW v2: phased Claude Code prompts

Source of truth for the v2 change plan agreed on 2026-10-10. The visual plan, with screen
mockups for every change, is `docs/change-plan-v2.html`. Open it in a browser before starting
a phase that touches UI. The plan's change numbers (01–17) and decision numbers (D1–D16)
are used throughout this file.

Phases here are labelled **V2 PHASE N** so they can't be confused with `claww-phased-prompts.md`
(PHASE N, done), `claww-ship-roadmap.md` (SHIP PHASE N) or `claww-full-roadmap.md`
(Engine Phase N). Where a V2 phase absorbs an open item from another roadmap, it says so.

Based on commit `9f3e387` (2026-09-25). Nothing had changed in the repo between that commit and
this plan.

---

## Standing rules for every V2 phase

1. Read `CLAUDE.md` first. Its four design principles are non-negotiable. The ones that matter
   most here: the LLM never computes numbers, and every schema change goes into
   `database/schema.sql` in the existing idempotent style.
2. One branch per phase: `v2/phase-N-<slug>`. Open a pull request into `main` at the end of the
   phase. Don't merge it yourself; the user merges after testing on a phone.
3. Before opening the PR, `cd app && npx tsc --noEmit && npm test -- --run` must both pass. Any
   new deterministic logic gets unit tests next to the existing ones (Vitest).
4. Anything that only runs on a device (notifications, Health Connect, haptics, lock-screen
   timer) must be listed in the PR description under "Needs device test", with exact steps.
   Never claim it was verified if it ran only on web.
5. Colors come from the theme file only (see V2 PHASE 4's color map). No new hard-coded hex
   values in screens.
6. No emojis in UI. Use the existing `Icon` component.
7. At the end of each phase, add a checklist entry for it under a new `## V2 phases` heading in
   `CLAUDE.md`, in the same style as the existing completed-phase notes: what was done, what was
   verified and how, what still needs the user.
8. If a prompt conflicts with what the code actually does, stop and say so in the PR rather than
   guessing.

---

## V2 PHASE 1: Quick fixes (no schema changes)

Changes 01, 05 (completed and skipped only), 10, 14, 15.

### 1.1 Time-of-day greeting (change 01)

> In `app/app/(tabs)/index.tsx` the greeting is hardcoded to "Good morning". Replace it with a
> small pure function `greetingFor(date: Date)` in `app/lib/` returning Good morning
> (05:00–11:59), Good afternoon (12:00–16:59), Good evening (17:00–21:59) or Good night
> (22:00–04:59), using local time. Re-evaluate it when the app returns to the foreground
> (AppState listener) so it's never stale. Add unit tests for every boundary.

### 1.2 Plan card shows the suggested day (change 14)

> Home's "Your Plan" card reads `latestWorkout.plan.days[0]`, so it always shows Day 1. Make it
> use the same suggested day as Workouts (`getSuggestedDayIndex` with the day events), show
> "Day X of N", and make tapping the card open Workouts with that day selected.

### 1.3 Sleep ring shows sleep (change 15)

> In Home's Daily Progress card, the middle ring's percentage is derived from the recovery score,
> so it always duplicates the outer ring. Make it last night's logged sleep hours against an
> 8-hour target, capped at 100%, and 0 when no sleep is logged. Keep the existing ring styling.

### 1.4 Past day states in Workouts (change 05, part 1)

> In `app/app/(tabs)/workouts.tsx`, `getWorkoutDayEvents` is fetched but only used to pick the
> suggested day. Use the events to give each day pill a state: completed (green check), skipped
> (red cross), today/suggested (blue dot), upcoming (plain). When a completed day is selected,
> replace Begin Workout with a summary card: date and time, duration if known, total volume,
> sets done, and each exercise's achieved sets from `workout_logs`, plus a "View full session"
> button. When a skipped day is selected, show "Skipped" with the date, what the day was, and two
> buttons: "Do it today instead" (starts that day's session) and "Keep today's plan". Never show
> Begin Workout for a completed or skipped day. A day with several events uses the most recent one.
> "Missed" (a date that passed with no event) needs real weekdays and is done in V2 PHASE 6. Don't
> fake it here.

### 1.5 Meal photo in the timeline (change 10)

> `meal_logs.photo_url` already stores a path in the private `meal-photos` bucket, and the
> "Eaten this before?" strip already displays these photos. Reuse that same signed-URL approach in
> `app/components/MealDetailModal.tsx`: when the meal has a photo, show it full width at the top of
> the sheet. In the Nutrition tab's Meal Timeline, replace the meal-type emoji with a small round
> photo thumbnail when there is one, and an `Icon` for the meal type when there isn't. Remove the
> `MEAL_ICON` emoji map entirely. Handle a failed or expired signed URL by falling back to the icon,
> not a broken image.

---

## V2 PHASE 2: Workout player rebuilt for speed (change 16)

The user's complaint: the player feels laggy and slow to use. Today `LiveWorkoutPlayer.tsx` is a
bottom bar where each set takes two taps (Finish Set, then Confirm Set), and reps or weight change
via 24 px chevrons one step at a time. The rest timer's `setInterval` in `workoutSession.tsx`
re-renders the whole session tree every second. Read both files fully before starting, and load
the repo's `animate-expo` skill (`.claude/skills/`) for the sheet, swipe, ring and haptics work.

### 2.1 Profile first

> Before changing anything, measure. Use the React DevTools profiler or simple timing logs in a
> dev build to record how long the whole player takes to re-render per rest-timer tick, and how
> long a set takes from tap to the next set showing. Put the numbers in the PR description; we'll
> compare after.

### 2.2 Isolate the timer

> Move the rest countdown out of the shared session context so that a tick only re-renders the
> timer component itself. Store the rest end as a timestamp (not a counter decremented every
> second) so the timer stays correct after the app is backgrounded. The context should expose
> `restEndsAt`, not a value that changes every second.

### 2.3 Full-screen set-row player

> Rebuild the player as a full-screen view, keeping the existing minimize-to-bar behaviour. Match
> the "Logging a set" mockup in `docs/change-plan-v2.html`:
> - The exercise name, with a one-line reason slot under it (empty until V2 PHASE 7 fills it).
> - Every set of the current exercise as a row: set number, last time's numbers (most recent
>   `workout_logs` for this exercise), kg, reps, and a check button. Rows are prefilled with the
>   prescription.
> - A big "Done · {reps} × {kg}" button that logs the current row in one tap. Logging must update
>   the UI immediately and save in the background. Reuse `finishSet`; it already doesn't await
>   the network.
> - Tapping a kg or reps value opens a quick picker: the 4 most likely values as one-tap chips
>   (prescribed, ±1 step, last time's), then a wheel for anything else. Changing set 1's weight
>   carries forward to later unlogged sets.
> - Swipe left to skip the exercise, swipe right to go back, a list button to jump to any
>   exercise, and an "Up next" strip.
> - Haptics on Done and on rest end (`expo-haptics`, already installed).
> Remove the separate confirm step. One tap is the whole interaction when the set went as planned.
> Leave a slot for the optional reps-in-reserve chip (0, 1, 2, 3+) under the rows, hidden behind a
> flag; V2 PHASE 6 adds the column it saves to.

### 2.4 Rest screen and lock-screen timer

> After Done, show the rest view: a large ring with the remaining time, −15 s, +15 s and Skip, and
> the next set's numbers. Schedule a local notification for the rest end time, so the phone buzzes
> even if the app is closed or the screen is locked, and cancel it on Skip or when the app is in
> the foreground. Also show an ongoing "Rest m:ss" notification while resting on Android if
> `expo-notifications` supports it cleanly; if it needs a native module we don't have, skip that
> part and say so in the PR.

### 2.5 Never lose a set (absorbs SHIP PHASE 10.3)

> Queue set logs locally (AsyncStorage) and flush them when the network is back. A set must never
> be lost because the gym has bad signal. The queue must be idempotent: give each set a client-
> generated id and make the insert ignore duplicates, adding a unique column to `workout_logs` in
> the idempotent schema style if needed. Add tests for the queue logic.

Target: under 100 ms from tapping Done to the UI showing the next set, on a mid-range Android
phone. Record before and after numbers in the PR.

---

## V2 PHASE 3: Reminders that actually arrive (change 17)

What exists: `lib/notifications.ts` schedules 3 fixed daily local reminders (workout 18:00, meal
13:00, sleep 22:00), only after the one-time prompt after the first workout or the Settings switch.
The user reports reminders don't work. Likely causes to check first: no Android notification
channel is ever created; nothing reschedules on app start or update; permission is asked late;
testing in Expo Go, which doesn't support this properly.

### 3.1 Diagnose on a real device

> Read `lib/notifications.ts`, `NotificationPromptCard.tsx`, `settings.tsx` and `app.json`. List
> every reason a reminder could fail to show on Android 13+ and on iOS. Then fix the confirmed
> causes: create an Android channel (`setNotificationChannelAsync`) with sensible importance
> before requesting permission, re-run scheduling on every app start when notifications are
> enabled (idempotent, cancels first), and make sure the notification handler is registered
> before any notification can arrive. Write a short manual test script in the PR (install an
> EAS preview build, enable reminders, set a reminder 2 minutes ahead via a dev-only button,
> lock the phone, wait).

### 3.2 Ask at the right moment

> Move the permission ask to the end of onboarding, shown as a soft-ask card with a clear reason,
> and keep the existing post-first-workout prompt only for users who skipped it. Never ask on
> cold start.

### 3.3 Smart local reminders

> Replace the fixed list with per-type settings stored on the profile (new columns or a JSON
> field, idempotent): workout, meals, sleep log and water, each with on/off and a time. Behaviour:
> - Workout: only on training days, a set number of minutes before the user's usual training
>   time, and the text names today's session. Until V2 PHASE 6 adds real weekdays, schedule it
>   every day but cancel it for today once a session is completed or skipped.
> - Meals: fire only if that meal isn't logged yet. Cancel today's when it's logged.
> - Sleep: morning, after the usual wake time, only if last night isn't logged.
> - Hard cap of 2 reminders per day in total.
> Add a Reminders section to Settings with these switches and times. Put the scheduling decisions
> in pure functions with unit tests.

### 3.4 Real push

> Add server push for things the phone can't know, using Expo's push service:
> - Register the Expo push token after permission is granted and save it in a new
>   `push_tokens` table (user_id, token, platform, updated_at), with RLS and an owner-only
>   policy. Delete the token on sign-out and in account deletion (check the cascade).
> - New Edge Function `send-reminders`, run on a schedule (pg_cron calling the function, or
>   Supabase scheduled functions, whichever the project supports; document which). First
>   messages: a missed-workout nudge the next morning, and a streak-about-to-break nudge in the
>   evening. Respect the per-type switches and the 2-a-day cap across local and push.
> - Android push needs FCM credentials uploaded to EAS. Write down exactly what the user must do
>   (Firebase project, `google-services.json`, `eas credentials`) because only they can create
>   the accounts.
> Update `docs/legal/privacy-policy.md` and `data-safety.md` to mention push tokens.

---

## V2 PHASE 4: Home redesign and the color map

Changes 02 (Steps and Streak only; Burned has no detail card), 03, 04.

### 4.1 Color map in the theme

> Add these tokens to `app/lib/theme.ts` as a named `AREA_COLORS` map and use them everywhere
> each area appears (Home, Tracker, sheets):
> workouts `#3B82F6`, nutrition `#22C55E` (fats keep `#EF4444` inside macro charts only),
> recovery `#2DD4BF` (replaces the blue recovery ring on Home), sleep `#818CF8`, steps
> `#F59E0B`, burned `#FB923C`, streak `#F472B6`, water `#38BDF8`, engine/insights `#A855F7`.
> The CLAWW Score stays white. Cards stay black; color goes only on data (lines, bars, rings,
> section labels).

### 4.2 Stat tiles and detail sheets (change 02)

> Make the Steps, Burned and Streak tiles smaller, each with a hint of its data (a progress line
> for steps, "kcal active" for burned, a 7-segment week for streak). Steps and Streak open an
> elevated bottom sheet; Burned does not.
> - Steps sheet: ring against the daily goal (8,000 default, editable), distance, calories from
>   steps, hourly bars for today, and Day/Week/Month bars with a dashed goal line. Data from the
>   existing `lib/steps.ts` (Health Connect on Android, Pedometer on iOS). If no data source is
>   available, the sheet explains what it unlocks and how to enable it.
> - Streak sheet: current and best streak and a 3-week grid of which days counted, from the same
>   rule `getActivityStreak` uses.
> Draw charts with Skia, like the existing rings. No new chart library.

### 4.3 Water row (change 03)

> Replace the compact `WaterWidget` on Home with a single 48 px row: drop icon, litres against
> target, 8 segments (one per 250 ml), and a + button that adds 250 ml. Long-press + for 500 ml,
> 1 L or custom. Tapping the row opens a sheet with today's entries (with undo) and the existing
> bottle and presets.

### 4.4 Sleep row (change 04)

> Replace `SleepArcDial` on Home with a matching single row: moon icon, hours slept and a quality
> word (Good 7 h+, Fair 6–6.9 h, Short under 6 h), bed and wake times as text, and a 7-night mini
> bar chart. Tapping opens the existing `SleepLogModal`. If last night isn't logged, the whole row
> becomes "Log last night's sleep". No emojis, no score out of 100 on this row.

---

## V2 PHASE 5: Nutrition suggestions (changes 09, 11)

What the code shows: `suggestMeal` sends only meal type, free-text preference, dietary
restrictions, remaining calories and remaining protein. It doesn't know the goal, remaining carbs
and fats, or what's already eaten today, and setup never asks about cuisine or foods to avoid.

### 5.1 Food profile

> Add two optional setup questions to the nutrition-setup flow (new steps in
> `screens/nutrition-setup/`): preferred cuisines (multi-select, Indian regional options first:
> South Indian, North Indian, Andhra/Telangana, plus Continental, Chinese/Indo-Chinese and
> "Anything") and foods to avoid (free text, short). Store them in
> `personalization_profile`. Existing users with targets set get asked once, inline on the
> Nutrition tab, dismissible. Both are editable from Profile.

### 5.2 Three suggestions

> Change `suggest-meal` to return 3 options. Send it: meal type, goal, dietary restrictions
> (still hard rules, still checked after generation), cuisines, foods to avoid, all four
> remaining macros, today's logged meals (names only) so it doesn't repeat, and whether the user
> trained today. The model only names meals and estimates their macros; deterministic code ranks
> the 3 by fit to the remaining macros and writes the one-line "why it fits" from the numbers.
> Validate with Zod and fall back to the existing generic suggestion on failure.

### 5.3 Suggestion screen

> Rebuild the suggestion UI to match the "Meal suggestion" mockup: the remaining macros and active
> preferences at the top, 3 option cards (name, macros, prep time, why it fits, best-fit badge on
> the top one), refine chips ("More protein", "Quicker", "Something else") that re-ask without
> typing, free text still available, and one-tap logging that goes through the existing review
> step. Respect the existing meal-call daily cap.

---

## V2 PHASE 6: Real weekdays and the adaptive engine foundation (change 13, part 1)

Absorbs the open "no day-of-week picker" bug in `CLAUDE.md` and the start of SHIP PHASE 10.1
(structured movement patterns). Read both co-founder spec sections in
`docs/change-plan-v2.html` (section 13) before starting.

### 6.1 Training weekdays (D13)

> Add a weekday picker step to workout setup (which days you train, defaulting from the existing
> days-per-week answer). Store the chosen weekdays and an optional usual training time. Make
> `generate-plan` label plan days by weekday when weekdays exist. With real dates, add the
> "Missed" state to Workouts: a planned weekday in the past with no event shows a red cross and
> "Missed". Existing plans without weekdays keep working as before.

### 6.2 Catalog enrichment (D12)

> Add columns to `exercises`, idempotently: `primary_muscle`, `secondary_muscles text[]`,
> `movement_pattern`, `role` ('main' | 'accessory'), `loadable boolean`, `stimulus_type`,
> `load_increment_kg`, `harder_variation_id`, `easier_variation_id`, `form_steps text[]`,
> `common_mistake`. Fill them for all 183 rows in a new `database/seed_exercise_metadata.sql`
> (re-runnable, updates by name). Draft the values carefully; mark the file as needing review by
> the co-founder in its header. Use the major muscle list: chest, back, shoulders, biceps,
> triceps, quads, hamstrings, glutes, calves, core.

### 6.3 Logging and state tables

> - `workout_logs`: add `set_number`, `rir` (nullable smallint 0–3, where 3 means 3+) and
>   `session_id`.
> - New `exercise_progress` (one row per user per exercise): rep range min/max, current rep
>   target, working weight, sets, top-of-range streak, failure streak, updated_at.
> - New `muscle_checkins`: user, session_id, muscle, soreness 0–5, readiness enum, created_at.
> - New `prescription_decisions`: user, session_id, exercise, prescribed weight/reps/sets,
>   command(s), reason text, created_at.
> All with RLS and owner-only policies. Turn on the reps-in-reserve chip from V2 PHASE 2.

### 6.4 The engine module

> Create `supabase/functions/_shared/adaptive.ts`, dependency-free like `planning.ts`, so it can
> be used by Edge Functions and tested with Vitest. Implement exactly these rules (defaults D1–D16
> from the plan; the user may change any later, so keep every threshold in one exported config
> object):
> - Performance: ratio = total achieved reps ÷ (rep target × sets). Max reps on every set counts
>   as a top-of-range session. ≥100% → rep target +1 (up to range max). 85–99% → hold. 70–84% →
>   rep target −1. <70% → weight down one increment. Two failed sessions in a row → deload −5%,
>   rounded to 2.5 kg. Two top-of-range sessions in a row → weight up one increment, rep target
>   back to range min (D16). Increments: +2.5 kg barbell and machine, +1 to 2 kg dumbbell and
>   isolation (from `load_increment_kg`). "In a row" means the same exercise on different
>   calendar days (D5). Sets: +1 after repeated success with good recovery, −1 after repeated
>   decline.
> - Bodyweight (`loadable = false`): reps climb to range max, then suggest `harder_variation_id`.
> - Whole-body recovery: Good (sleep ≥7 h, protein ≥90% of target, fatigue low) → allow full
>   demand; Moderate (6–6.9 h, 75–89%, moderate) → hold; Poor (<6 h, <75%, high) → reduce; two or
>   more Poor → reduce and block progression. Water and "meal logged" are no longer inputs.
> - Per-muscle recovery: Fatigue × 0.40 + Time × 0.25 + Soreness × 0.20 + Readiness × 0.15,
>   clamped 0–100 and rounded. Time bands: <24 h 20, 24–48 50, 48–72 75, 72–96 90, 96+ 100.
>   Soreness 0–5 → 100/90/75/55/30/10. Readiness Strong/Normal/Slightly weak/Weak/Very weak →
>   100/85/65/40/20. Fatigue from effective sets, average RIR and stimulus type; define the
>   points table in the config and flag it for co-founder review (the spec doesn't give numbers).
>   Bands: 85+ Excellent, 70–84 Good, 50–69 Moderate, 30–49 Low, <30 Very low. Return a
>   confidence (high/medium/low) that drops when RIR or check-in inputs are missing; never
>   invent missing values. PDF 1's fatigue level comes from this score: 70+ low, 50–69
>   moderate, under 50 high (D8).
> - Overload order: reps → top of range → weight → rebuild reps → … → sets. Poor whole-body
>   recovery, or a Low or Very low score for the exercise's primary muscle, blocks progression
>   for that exercise today. Recovery never changes the split or the exercise list.
> - Exercise intelligence: KEEP / REPLACE / SUGGEST. A replacement must match primary muscle,
>   movement pattern and role, and fit the user's equipment tier.
> - Output per exercise: weight, reps, sets, a list of commands, and a one-sentence reason built
>   from the numbers (no model involved).
> Write tests for every threshold and boundary, and the five-session bench press example in the
> plan, asserting the exact outputs shown there.

---

## V2 PHASE 7: Adaptive system in the app (change 13, part 2, and change 07)

### 7.1 Prescription at session start

> When the user opens today's session, compute every exercise's prescription with the engine
> from `exercise_progress`, recent `workout_logs`, sleep, protein and muscle scores. Show the
> "Today's prescription" screen from the mockup: muscle score chips at the top (teal), each
> exercise with its numbers, a command pill (Weight / Reps / Sets up or down, Hold) and the
> one-line reason. Fill the reason slot in the player. Save each decision to
> `prescription_decisions`. The plan JSON keeps rep ranges and the starting point; it's no longer
> the source of the day's numbers.

### 7.2 Pre-session check (D10)

> Before showing the prescription, ask soreness (0–5) and readiness (5 choices) for only the
> muscles in today's session, once per session, with Skip always visible. Store in
> `muscle_checkins`. Skipping lowers confidence; it never blocks.

### 7.3 Update state after the session

> When a session is finished, run the performance step for each exercise and update
> `exercise_progress`. The completed-day summary from V2 PHASE 1.4 gains a "What changed for
> next time" card listing these decisions.

### 7.4 Manually added exercises (change 07)

> `handleAddExercise` in `workouts.tsx` hardcodes 3 × 10. Instead compute the rep range and sets
> the same way `generate-plan` does for that exercise's role (move the shared parts of
> `computeRepRange` into `_shared/planning.ts` if they aren't already importable), create its
> `exercise_progress` row, and mark the first session as calibration: the user picks a weight
> they can do for the target with about 2 reps left, and the engine takes over from there. In the
> picker, show a hint when the exercise's primary muscle is Low or Very low today.

### 7.5 Recovery everywhere

> Use the per-muscle scores on Home (the recovery line under the greeting names the lowest
> muscle relevant to today) and replace the old recovery score's inputs per D7. Keep
> `computeRecoveryScore`'s tests passing or update them deliberately with the new formula, never
> silently.

---

## V2 PHASE 8: Exercise how-to v1 (change 06; absorbs SHIP PHASE 11.2)

> Tapping any exercise name (plan, picker or player) opens a sheet with the 3 form steps, the
> common mistake and the primary and secondary muscles from the catalog fields added in V2
> PHASE 6.2, plus a History tab with the user's last sessions of that exercise. Leave the media
> area out for now; video is V2 PHASE 10. The text is authored and reviewed, never generated
> at runtime.

---

## V2 PHASE 9: Tracker redesign (change 12; absorbs SHIP PHASE 11.3)

> Rebuild `app/app/(tabs)/tracker.tsx` to match the two Tracker mockups, using `AREA_COLORS`:
> CLAWW Score and level (white); strength trend per main lift as estimated 1-rep max over 8 weeks
> (blue, Epley formula, deterministic); muscle recovery map (teal); weekly sets per muscle with a
> target line (blue); 12-week consistency grid (blue); personal records (blue); steps 7 days
> (amber) with the weekly burned total (orange); nutrition 7 days with protein-target days
> (green); sleep 7 nights (indigo); one insight card (purple), worded from computed numbers only.
> No engine decision counts. Each card opens a full-screen chart with Week, Month and All ranges.
> Keep the 3-workout-day unlock; the locked state shows these cards as faint previews. Skia for
> all charts.

---

## V2 PHASE 10: Market fit

Do these as separate prompts, in this order, and check with the user before each one.

### 10.1 Telugu and Hindi

> Add i18n (a small library such as i18next with react-i18next) and move all UI strings into
> English, Telugu and Hindi resource files, with a language choice in Settings and at the start of
> onboarding. Exercise names stay in English; form steps get translations. Generated text
> (meal suggestions, reasons) follows the chosen language. Flag every translated string file for
> a native-speaker review in the PR.

### 10.2 Indian meal photo accuracy

> Build a small evaluation set (30–50 common Indian meals with known approximate macros) and a
> script that runs `parse-meal-photo` against it and reports error per macro. Use it to tune the
> prompt and portion handling. Report the numbers before any marketing uses photo logging as a
> selling point.

### 10.3 Pricing (absorbs SHIP PHASE 11.5)

> Add RevenueCat with a free tier and a paid tier around ₹99–199 a month (final price is the
> user's call). Gate on depth, not access, using `GENERATION_CAPS` as the seam. Ask the user for
> the exact tier contents before building.

### 10.4 Exercise video (change 06, version 2)

> Once the user has chosen a media source, add a looping demo clip area to the exercise sheet,
> stored in Supabase Storage and cached on device after first view.
