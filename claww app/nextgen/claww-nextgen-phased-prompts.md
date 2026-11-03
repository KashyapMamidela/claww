# CLAWW Next Gen: phased Claude Code prompts

The prompts to build CLAWW Next Gen, one phase (and, where numbered, one step) per Claude Code session. The specification they refer to is `nextgen/claww-nextgen-build-plan.md` (decisions, design system, UX rules, data model). The screens are in `nextgen/design/` (images in `screens/`, working HTML in `html/`, gallery in `index.html`).

Phases are labelled **NG PHASE N** so they can't be confused with V2 PHASE N, SHIP PHASE N, PHASE N or Engine Phase N.

Based on commit `9d79983` on `v2/phase-1-quick-fixes` (2026-11-03).

---

## 1. Standing rules for every NG phase

1. Read `CLAUDE.md` first; its four principles are non-negotiable (the LLM never computes numbers; never show "AI"; RLS on everything; schema only in `schema.sql`, idempotent).
2. Read `nextgen/claww-nextgen-build-plan.md` sections 5, 6 and 7 (design system, UX rules, data model), and open the phase's screen images in `nextgen/design/screens/` before writing UI. Match them. List every difference in the PR with the reason.
3. One branch per phase: `ng/phase-N-<slug>`, PR into `main`. Don't merge; the user merges after a phone test.
4. Before the PR: `cd app && npx tsc --noEmit && npm test -- --run` both pass. New deterministic logic gets Vitest tests next to the existing ones.
5. Device-only behaviour (haptics, notifications, Live Activity, Health Connect, camera, offline) goes under "Needs device test" in the PR with exact steps. Never claim it was verified on web.
6. Colours, type and surfaces only from `lib/theme.ts` and `components/ui/`. No new hard-coded hex in screens. No emoji in UI.
7. Every new user table is added to `exportUserData`, account deletion and `docs/legal/data-safety.md`.
8. Update `CLAUDE.md` at the end of each phase under a new `## NG phases` heading, in the existing checklist style: done, verified how, needs the user.
9. If a prompt conflicts with the code, stop and say so in the PR instead of guessing.
10. Keep every phase shippable on its own: feature-flag unfinished paths (`lib/flags.ts`) rather than leaving broken screens.
11. Where a phase has numbered steps (3.1, 3.2, ...), do **one step per Claude Code session**, commit it, and keep the app working after each step.
12. Device names A, B, C refer to `docs/device-matrix.md` (written in NG PHASE 0.2).

---

## 2. The phases

Order: stabilise, build the parts, then the plans, then the experience on top. Each phase is tested on a phone before the next starts.

| # | Phase | Depends on | Screens |
| --- | --- | --- | --- |
| 0 | Stabilise V2, device list, baseline numbers | none | none |
| 1 | Design system in code | 0 | 19, 20 |
| 2 | One profile, one recovery, new rings | 1 | (Home rings) |
| 3 | Player v3 and lock screen | 1 | 07, 08, 09 |
| 4 | Food database | 0 | none |
| 5 | Workout setup and the plan tree | 2 | 05 |
| 6 | Nutrition setup: what you can get | 2, 4 | 11, 12, 13 |
| 7 | Daily meal plans | 4, 6 | (feeds 14) |
| 8 | Nutrition tab and food diary | 7 | 14, 18 |
| 9 | Scanner v2 and backup model | 4, 8 | 16, 17 |
| 10 | Time-aware logging | 8 | 15 |
| 11 | The Coach's Pen and weekly review | 5, 7, 8 | 03 (+ marks on 01, 06, 14) |
| 12 | Home brief, Workouts tab, reward card | 3, 11 | 01, 02, 06, 10 |
| 13 | Tracker and wearables | 2 | 04 |
| 14 | States, offline, accessibility and performance pass | all | 19 |
| 15 | Closed beta and measurement | 14 | none |

---

### NG PHASE 0: Stabilise V2, measure the starting point

**Goal:** the nine coded V2 phases are live, tested on a phone and merged, and we know today's real numbers, so every later target means "better than this".

#### 0.1 Checklist of everything V2 still needs

> Read `CLAUDE.md` (the V2 section) and `docs/push-setup.md`. Write `docs/ng0-checklist.md`: every pending item from V2 PHASES 1 to 9 marked "needs the user" (schema blocks to run, seeds, function deploys, FCM, secrets), in the order to do them, with the exact commands and where to click. Group them: database, functions, Firebase/push, build. Don't change code in this step.

#### 0.2 Device test list

> Write `docs/device-matrix.md` with three devices: (A) the user's own phone, (B) a low-end Android (4 GB RAM, Android 12 or 13, e.g. a Redmi or Realme), (C) an iPhone if available, else mark iOS as "not tested". For each, list what must be checked: install of an EAS preview build, Skia rings render, reminders and push arrive, the set queue survives airplane mode, Health Connect permissions, haptics, notification channels. Every later phase's "Needs device test" refers to devices A, B, C from this file.

#### 0.3 Walk the checklist and fix

> With the user, walk `docs/ng0-checklist.md`. After each item is done, run the matching device test from `CLAUDE.md` on device A (and B where it matters) and record pass/fail in the checklist. Fix failures on `v2/phase-1-quick-fixes`. Check first: Skia rings on Android release builds, nested modals `ExercisePickerModal` → `ExerciseGuideSheet`, the set queue after the schema is applied, reminder delivery on Android 13+.

#### 0.4 Baseline numbers

> Using `lib/perf.ts` and a stopwatch where needed, measure on device B (and A) and write them into `docs/baseline.md`: tap-to-next-set latency (ms, median of 20 sets), taps to log one planned set, Home first paint from a cold start (ms), taps and seconds to log a meal by text and by photo, taps and seconds to finish nutrition setup, Workouts scroll fps. These are the "before" numbers NG PHASE 15 compares against.

#### 0.5 Merge

> When every check passes, open the PR from `v2/phase-1-quick-fixes` into `main` with the checklist, device results and baseline as its body. Do not start NG PHASE 1 until the user has merged.

**Acceptance:** every V2 device test passes on device A; `main` contains V2; `schema.sql` applied live; functions deployed; 318+ tests pass; `docs/baseline.md` filled.

---

### NG PHASE 1: Design system in code

**Goal:** the parts from build plan section 5 exist and are used by at least one real screen, so every later phase only assembles them.

> Implement section 5 of `nextgen/claww-nextgen-build-plan.md`. Add tokens `textMuted`, `textFaint`, `pen`, `ratingGood/Okay/Poor` to `lib/theme.ts`, and replace every text use of `#71717A`/`#52525B` (grep the app) with them. Create in `components/ui/`: `Surface`, `TintTile`, `Hero`, `Well`, `Segmented`, `Stepper`, `TickButton`, `PenMark`, `StateView` (empty, error, offline, first-day variants from `19-states.jpg`), and upgrade `Chip` (44 px), `SectionLabel` (11 px), `Button` (pressed and disabled states). Add `assets/textures/noise-256.png` and `lines-64.png` (generate them with a small Node script in `scripts/textures.mjs`, committed, under 60 KB total). Add `@expo-google-fonts/caveat`. Add `lib/motion.ts` (rise, once-sheen, reduce-motion check) and `lib/haptics.ts` (setDone, success). Build a dev-only gallery screen `app/dev/design.tsx` (behind `SHOW_DEV_TOOLS`) that shows every component in every state, matching `20-design-system.jpg`. Then apply `Surface`/`TintTile` to Home's existing Daily Progress card and stat tiles as the first real use, without changing their data.

**Tests:** pure helpers (contrast check in `lib/contrast.ts` with tests asserting every text token ≥ 4.5:1 on `card` and `bg`; motion config).
**Acceptance:** gallery matches `20-design-system.jpg` on a phone; scrolling Home on a low-end Android stays at 60 fps (record with `lib/perf.ts`); no text under 11 px in the gallery.
**Device test:** open the gallery, toggle the phone's Reduce motion and font size 1.3x; nothing clips or animates.

---

### NG PHASE 2: One profile, one recovery, new rings

**Goal:** basic details are asked once and read everywhere; one recovery score feeds every page; Home's rings become Workout, Nutrition, Recovery.

> Recovery is already one function (`computeRecoveryScore`, V2 7.5): grep for any remaining local recovery math in the app and remove it. Make `profiles` the only source of age, height, weight, gender, and add the NG 2 columns from build plan section 7 (`training_months`, `session_minutes`, `injuries`, `activities`, `bar_weight_kg`). Remove any duplicate asks of basic details from workout and nutrition setup flows; they read the profile and show "From your profile · Edit". Add `lib/profile.ts` with one `useProfile()` hook (cached, invalidated on edit). Change Home's Daily Progress rings to Workout (today's planned session done: 0 or 1; partial = sets done / sets planned), Nutrition (calories eaten / target, protein shown in its row) and Recovery (the score), with the rows and notes in `01-home-morning.jpg`; the Daily Goal is their average. Keep the old rings behind a flag `RINGS_V1` for one release.

**Tests:** `lib/dailyGoal.ts` (ring values, partial sessions, rest days count as complete when nothing is planned).
**Acceptance:** no screen asks for age/height/weight twice; Home, Workouts, Tracker show the same recovery number at the same moment.

---

### NG PHASE 3: Player v3 and lock screen

**Goal:** the most-used screen matches `07-player.jpg`, `08-player-rest.jpg`, `09-lock-screen.jpg`. Logging a planned set is one tap. Six steps, one session each; each step leaves the player working.

#### 3.1 New layout, tick rows and bottom sheet

> Rework `components/player/FullPlayer.tsx` to the v3 layout in `07-player.jpg`. Top: close, session name, "Exercise n of N · elapsed", kcal pill, segmented progress. Exercise name and meta line. Set rows: "Set n", planned or logged values, a short hint ("top of range", "now"), and a `TickButton` (NG 1). Tapping the current row's tick logs the set exactly as planned through the existing log path (same as Done). The bottom sheet holds two `Stepper`s (kg by the exercise's `load_increment_kg`, reps by 1) and the big Done (`Button` lg). After the last set: "Exercise done · volume" and "Next · <exercise>". Remove the old empty video area. Keep swipe gestures and the "Up next" behaviour from V2 2.3 where they still fit; list anything removed in the PR.

**Tests:** tick-row logging in `lib/sessionPlan.ts` (current row only; already-logged rows ignore taps).

#### 3.2 Rest view in the sheet

> Move rest into the same bottom sheet as in `08-player-rest.jpg`: label "Rest · next: set n · kg × reps", a ring with the time at 32 px, round −15 and +15 buttons (52 px), and Skip rest. Use the existing `sessionClock` and `RestCountdown`; nothing in the screen re-renders each second except the clock. Rest length by lift role: main 150 s, accessory 90 s, isolation 60 s, in `ADAPTIVE_CONFIG`, overridable per blueprint slot later (NG 5).

**Tests:** rest by role; ±15 never below 0.

#### 3.3 Target card, plate math and warm-ups

> Add the target card: today's prescription, shown with `PenMark` in compact mode when it differs from the plan (old value struck, new value bold with underline, one-line note), plus live plate math from `lib/plateMath.ts` (bar from `profiles.bar_weight_kg`, plates 25/20/15/10/5/2.5/1.25, greedy per side, coloured plates; nothing shown for dumbbells or machines). For main lifts, show 2 warm-up rows above the work sets (50 % × 8, 75 % × 3), dimmed with a "Warm-up" tag, tickable but not logged as work sets.

**Tests:** `plateMath` (20 to 200 kg, impossible weights round down with a note), warm-up generation.

#### 3.4 How to and Swap

> Add the two chips under the exercise name. How to opens the existing `ExerciseGuideSheet` while timers keep running. Swap opens a new `SwapSheet`: up to 6 exercises with the same primary muscle and movement pattern, allowed equipment, not contraindicated for the user's injuries, from catalog metadata. A swap keeps the slot's sets and reps, starts from the swapped exercise's last weight (or calibration), and is saved in `prescription_decisions` with `phase = 'swapped'`.

**Tests:** swap candidates filter (muscle, pattern, equipment, injuries).

#### 3.5 Lock screen: Android ongoing notification, iOS Live Activity

> Android first: while a session runs, show an ongoing notification with the exercise, next set and a countdown chronometer during rest, with actions Done and Skip. `expo-notifications` can't show a live countdown; use a maintained native module that supports Android's chronometer, or a small Kotlin module in a config plugin. Document the choice and its maintenance status in the PR. Actions call the same session functions; the set queue's `client_id` prevents double logs. Then iOS: a Live Activity (a maintained Expo-compatible module or a config plugin with a Swift widget target) showing session, exercise, next set, rest ring and buttons −15 s, Skip, Set done, as in `09-lock-screen.jpg`. If iOS can't be tested (no device), build it behind a flag and mark it "not device-tested".

**Needs device test (A, B):** lock during rest, use Skip and Done from the lock screen, unlock: the set appears once, the timer is right.

#### 3.6 Timer and distance modes

> For cardio, running, cycling, yoga and mobility slots, replace set rows with a mode view: a big elapsed or countdown timer (from the slot's duration), an optional distance input in km for running and cycling, and Done. Log to `workout_logs` with duration (and distance in notes until a column is needed; propose one in the PR if it is).

**Phase acceptance (timed on device B):** a planned set is logged in 1 tap; set tap to next set shown under 100 ms (better than `docs/baseline.md`); rest is correct after the phone was locked for 2 minutes.

---

### NG PHASE 4: Food database

**Goal:** every number in Nutrition comes from a reviewed table, with household units, micronutrients and cost.

> Create the NG 4 tables from build plan section 7 with RLS. Build `database/foods/` as the source of truth: `ingredients.csv`, `dishes.csv`, `dish_items.csv`, `units.csv`, plus `build_foods.mjs` that validates and writes `database/seed_foods.sql` (idempotent upserts by name), the same pattern as `build_form_guides.mjs`. Start with 300 ingredients and 150 common dishes across South Indian, Andhra/Telangana, North Indian, Indo-Chinese, mess and street food, including chai with sugar, oil and ghee as separate items, and standard units (katori 150 ml, roti 40 g, idli 40 g, dosa 80 g, tsp oil 5 g, glass 250 ml). Each row records `source` and `source_ref`. Sources, in order: values the user's nutritionist provides, then published Indian food composition tables where the licence allows reuse, then USDA FoodData Central for generic items (public domain). **Write `database/foods/SOURCES.md` stating each source and its licence; if a source's licence is unclear, do not copy its values, flag the rows instead.** Mark every row `reviewed_by = null` until the nutritionist reviews; the app shows nothing different, but `docs/food-review.md` lists what still needs review. Add `lib/foodDb.ts` (search by name and alias, units for a food, nutrients for qty × unit) with a small on-device cache of the 200 most-used foods.

**Tests:** build-script validation (every dish's items sum to the dish within 5 %, every food has a default unit, no negative values), unit conversions, search ranking.
**Acceptance:** "chicken fried rice", "2 roti", "1 katori dal", "chai" resolve to rows with units and micros; seed runs twice with no change.

---

### NG PHASE 5: Workout setup and the plan tree

**Goal:** the workout plan is picked from reviewed blueprints by rules; the model no longer chooses exercises. The setup matches `05-workout-setup.jpg`. Five steps.

#### 5.1 Blueprint format and the first blueprints

> Add `supabase/functions/_shared/blueprints/` with a TypeScript type and Zod schema for a blueprint: days of slots `{pattern, role: main|accessory|isolation, sets, repRange, rir, restSec, optional}`, plus `id`, `goal`, `place`, `daysPerWeek`, `minMonths`, `version`. Write 14 to 20 JSON blueprints covering goal (muscle, fat loss, strength, general fitness) × days (2 to 6) × place (gym, home with dumbbells, no equipment), following widely used evidence-based guidance (about 10 to 20 hard sets per muscle per week, each muscle trained twice a week, main lifts first). Add `blueprints/README.md` explaining the format in plain words for the trainer, and a review table (blueprint, trainer, date, changes). Mark every blueprint `"reviewed": false`. A test validates every file against the schema.

#### 5.2 Picking and filling

> `_shared/planTree.ts`: `pickBlueprint(profile)` (goal → place → days → experience from `training_months`; always returns one, with a documented fallback), and `fillBlueprint(blueprint, catalog, profile, seed)` choosing each slot's exercise by movement pattern, equipment, level and dislikes, deterministic for the same user (seed = user id + block number). Map injuries (body part + severity) to contraindicated movement patterns in `_shared/injuryRules.ts`, replacing the six-regex filter (absorbs SHIP 10.1).

**Tests:** same input → same plan; injured patterns never chosen; every slot filled or the fallback used.

#### 5.3 Checks and blocks

> `checkPlan(plan, profile)`: each muscle at least twice a week, weekly hard sets per muscle in range, main lifts first in each session, each session fits `session_minutes` (sets × (work time + rest)). If a check fails, adjust by rules (drop optional slots, trim accessory sets) and re-check. Blocks of 6 weeks; week 6 lighter (−1 set per slot); a new block refreshes accessories and keeps main lifts. Store `blueprint_id`, `block_number`, `block_week` on `workouts`.

**Tests:** a table-driven test over every goal × days × place × level × each single injury: every plan passes `checkPlan`.

#### 5.4 generate-plan without the model

> In `generate-plan`, replace the model's split and exercise choice with `pickBlueprint` + `fillBlueprint` + `checkPlan`. Keep the response shape so the app needs no change. Remove the Groq call and the plan-generation cap from this path; keep `DEFAULT_PLAN` as the fallback; keep `applyTrainingWeekdays`. Log which blueprint was used.

**Acceptance:** zero model calls from `generate-plan` (check the function logs); plans for the 3 sample profiles in the test fixtures look sensible to the user.

#### 5.5 The one-screen setup

> Rebuild `app/workout-setup.tsx` as `05-workout-setup.jpg`: goal tiles, days 2 to 6, where you train (chips), how long trained (segmented → `training_months`), time per session (segmented), anything that hurts (chips; choosing a part opens a small severity sheet), and the live "Your plan" hero card computed by the same `pickBlueprint` (split, weeks, minutes, rep style, the path chips, "Picked from trainer-reviewed plans, never generated"). Basic details come from the profile (NG 2), never asked. The weekday picker from V2 6.1 stays as the next step.

**Acceptance:** the plan card always matches the plan actually generated; setup takes under 45 s on device B.

---

### NG PHASE 6: Nutrition setup, what you can get

**Goal:** three short steps that describe the user's real food situation, matching `11`, `12`, `13`.

> Rebuild `app/nutrition-setup.tsx` and `screens/nutrition-setup/` into 3 steps. Step 1 (`11-meal-setup-1-where.jpg`): food sources as 6 multi-select tiles (home cooked, hostel or mess, PG or tiffin, office canteen, eating out, I cook myself), cook-with chips, diet chips (vegetarian, eggetarian, non-veg, vegan, Jain). Cuisine and avoid list come from the existing food profile (V2 5.1); don't ask again. Step 2 (`12-...`): "Can you get these?" in two groups of 6 (Protein: eggs, paneer, chicken, soya chunks, dal and chana, curd; Everyday: milk, peanuts, banana, sprouts, oats, whey), each Yes / Sometimes / No, **pre-filled from step 1** by rules in `lib/resourceDefaults.ts` (e.g. mess + kettle → eggs yes, paneer sometimes, oats no; vegetarian hides chicken and eggs), "All yes" per group. Step 3 (`13-...`): the summary hero (food from, cook with, budget with "tap to change", diet, available protein chips), "Gaps your plan works around" (rules in `lib/resourceGaps.ts`, each with Change), and "A day on this plan" (3 meals from NG 7's generator, or placeholders until NG 7 ships behind a flag). Save to `user_resources`. Budget default by sources: mess or tiffin ₹150 beyond fixed meals, else ₹250.

**Tests:** `resourceDefaults` (every source × cook-with × diet), `resourceGaps`.
**Acceptance:** median completion under 60 s with 12 taps or fewer for a mess + kettle user (measure with analytics events `nutrition_setup_step_n`).

---

### NG PHASE 7: Daily meal plans

**Goal:** 3 meals a day built from reviewed templates that fit the target and the user's resources; never generated by a model.

> Add `meal_templates` (build plan section 7) and `database/meal_templates/*.json` → `build_meal_templates.mjs` → seed, same pattern as foods. Start with 120 templates (40 per meal) across sources, diets and cuisines, including "work around" templates for fixed meals ("Mess lunch as usual + 1 katori curd + 1 boiled egg"). Every template's nutrients are computed from `foods` at build time, never typed. `_shared/mealPlanner.ts`: `planDay(target, resources, profile, history)` chooses one template per meal that fits availability (Yes always, Sometimes at most 3 days a week), cook-with, diet, avoid list and budget, then scales portions in household steps (half katori, 1 roti) to hit calories within ±7 % and protein ≥ 90 %; if impossible, returns the best plan plus `shortfall` and the cheapest fix from available foods ("+ 50 g soya chunks closes 26 g protein for ₹12"). "Same every day" repeats the day; "Varied" avoids repeating a template within 3 days. Swaps: up to 5 templates for the same meal within ±10 % calories and ±15 % protein. Generate the plan for today and tomorrow on app open (cached in `meal_plan_days`). `suggest-meal` is retired from the main flow (keep it behind a flag for "Something else" ideas only, marked for removal).

**Tests:** planner over a matrix of resource profiles; portions always in valid household steps; shortfall suggestions only use available foods; deterministic for the same date and inputs.
**Acceptance:** for 20 sample resource profiles, every plan is within ±7 % calories and ≥ 90 % protein or reports a shortfall with a fix.

---

### NG PHASE 8: Nutrition tab and food diary

**Goal:** the Nutrition tab and diary match `14-nutrition-tab.jpg` and `18-food-diary.jpg`; following the plan is one tap.

> Rebuild `app/(tabs)/nutrition.tsx`: date label, Display "Nutrition", macro card (calorie ring + protein / carbs / fat bars, then a pen-note line when there's a protein gap), action row (Scan primary, Search, Diary, all labelled), "Your usuals · one tap" (top 4 foods by frequency over 14 days from `meal_logs.items`, each chip logs it instantly with undo, `lib/usuals.ts`), "Today's plan · 3 meals" with meal cards: photo or plate placeholder, time, status (as planned / swapped / up next / skipped), name, kcal · protein · cost, rating pill when logged, and on the next meal "Ate as planned" (primary), "Something else" (search sheet with recent foods and the scanner), camera. Logging as planned writes `meal_logs` with `plan_status='as_planned'` and the template items. When a meal is swapped or extra, the rest of the day re-plans (call `planDay` for remaining meals) and that change appears as a pen mark (NG 11 wires the visuals; until then a plain line).
> Diary screen (`18`): day strip with a dot per logged meal, micronutrient card (fibre, iron, calcium, vitamin C, B12, sodium with daily targets for the user's age and sex in `lib/microTargets.ts`; sodium over target is amber), entries with photo, time and status, name, macros, rating pill and one reason; tap expands the entry's micronutrients and Edit. Rating in `lib/mealRating.ts`: compares the meal with what the plan needed at that time (protein density, calories vs remaining, oil and sodium only when clearly high); Good / Okay / Poor plus a kind reason that points to the next meal. Poor uses `ratingPoor` grey.

**Tests:** `usuals`, `mealRating` (table of meals × moments), `microTargets`.
**Acceptance:** logging a planned meal takes 1 tap; a usual takes 1 tap; the day's line "3 of 3 meals logged · protein 82 %" is correct.

---

### NG PHASE 9: Scanner v2 and backup model

**Goal:** the scanner matches `16` and `17` and gets better from corrections.

> Rework `meal-log.tsx` photo flow. Step 1 (`16`): camera with a viewfinder and a "Looks like ..." tag from the first model pass; a bottom sheet with "Last time at <place>: <answers> · Use" (from the user's last log at that place or the same dish) and three segmented questions: where (home, mess, restaurant, street), how oily (light, normal, heavy), portion (small, regular, large, shared), pre-filled from habit. Step 2 (`17`): `parse-meal-photo` returns only **item names, a household quantity guess and a confidence**; the server maps names to `foods` rows (alias search), applies the oil level (adds an oil line: light 1 tsp, normal 2 tsp, heavy 3 tsp per plate, scaled by portion) and portion multiplier, and computes nutrients from the database. The screen shows the dish, rating, totals, then each item with household quantity big and grams small, 44 px steppers by household step, oil highlighted amber, "+ Add something we missed", the rating with reason, "Your fixes teach the scanner your portions", and "Looks right, log it". Low confidence (< 0.5) shows the "Not sure" state from `19-states.jpg`: 3 to 4 candidate dishes as chips plus "Log by name instead".
> Models: `_shared/vision.ts` with an ordered provider list (Groq first, then the chosen backup), 8 s timeout per provider, same output schema validated with Zod; log which model answered. Add the backup provider's key as a secret; leave the choice configurable until the user picks it (build plan section 10, open decisions log).
> Training data: on log, if the user agreed (a one-time opt-in in Settings, default off, explained in the privacy policy), write `scan_corrections` with the photo path, model guess, context and final items.

**Tests:** name-to-food mapping, oil and portion math, confidence routing, provider fallback order (mocked).
**Acceptance:** a typical plate is logged in 4 taps or fewer with the context pre-filled; if Groq fails, the backup answers within 10 s total.

---

### NG PHASE 10: Time-aware logging

**Goal:** the app asks the right thing at the right time: catch-up (`15-catch-up.jpg`), morning brief, night close.

> `lib/dayMoments.ts` decides the moment from local time and what's logged: morning (05:00 to 11:00, nothing logged), day, catch-up (after 19:30 with breakfast or lunch unlogged), night close (after 21:30). Catch-up screen (`15`): each unlogged meal as a card with its plan and a segmented As planned / Something else / Skipped; Something else shows quick chips (mess thali, biryani, snacks only, same as plan but less, photo). Every answer saves immediately (no Save button) and re-plans dinner with `planDay`; dinner shows as a pen-marked card with the reason ("biryani was heavy, dinner is lighter"). A green "Saved as you answer · dinner updated" line confirms. Morning brief: Home's coach line and hero (handled in NG 12) plus one reminder at the user's breakfast time. Night close: one notification at 21:30 if meals are unlogged ("Close your day in 10 seconds"), opening the catch-up. Respect the 2-per-day reminder cap from V2 3.3.

**Tests:** `dayMoments` boundaries, re-planning after each answer, reminder cap.
**Acceptance:** catch-up for two meals takes under 15 s (6 taps or fewer).

---

### NG PHASE 11: The Coach's Pen and weekly review

**Goal:** coaching appears only as marks on the plan, created by rules from trends, with the look in section 5.4 of the build plan and the review in `03-pen-review.jpg`. Five steps.

#### 11.1 Table and mark lifecycle

> Add `pen_marks` (build plan section 7) with RLS, export and deletion. `lib/penMarks.ts` + `_shared/penMarks.ts`: create, list active for a date, keep, undo (restores the exact old value in the plan or meal plan), expire after the item is done. Limits enforced on create: 3 new marks a day, 1 per item.

**Tests:** limits, undo restores the exact old value, expiry.

#### 11.2 Trend reader and allowed changes

> `_shared/trendReader.ts`, deterministic: over the last 1 to 4 weeks detect stalled lifts (no estimated 1RM gain in 3 sessions), progress streaks, protein misses by meal, short sleep (under 6.5 h two nights in a row), skipped meals, missed days, flat weight against the goal. `_shared/penRules.ts` maps each finding to exactly one allowed change: change a number within the adaptive engine's limits, swap a meal within ±10 % kcal, add a food from the user's available foods, move a day within the week, or hold. The adaptive engine's own prescription always wins; a pen rule never contradicts it. Existing engine reasons (prescriptions, recovery holds) are turned into marks too, so there is one coaching voice. Runs after each session, after each meal log and once each morning.

**Tests:** every rule with fixtures; a property test over random histories proves no mark is outside the allowed set.

#### 11.3 Note wording

> Each mark has a short note (40 characters or fewer) and a one-line reason. Template notes from the numbers come first (`_shared/penNotes.ts`: "short sleep, hold this week", "38 g protein still to go"). The model may optionally re-word a note; it only receives the computed finding, its output is validated (length, no numbers that differ from the finding, no medical claims), and on any failure the template is used. Never mention AI.

**Tests:** templates for every finding; the validator rejects changed numbers.

#### 11.4 Marks in the app

> Use `PenMark` (NG 1) on Home ("Marked on your plan today", up to 3), on Workouts exercise cards, on Nutrition meal cards, in the player's target card and in catch-up, matching `01`, `06`, `14`, `07`, `15`. Tap: reason, Keep the mark, Use my old plan. Long-press: "Tell me more" opens the Tracker chart for that lift or nutrient. The underline draws once on first view (350 ms), with a light haptic.

#### 11.5 Weekly review

> Screen `03-pen-review.jpg`: hero with the week in one line and kept / undone counts, Workouts and Nutrition sections with a Keep / Undo segmented control per mark, short footnote, and "Start week n". A Sunday 18:00 local reminder opens it (counts toward the 2-a-day cap). Show it in More as "Your week, marked up".

**Phase acceptance:** in a two-week test with device A, at most 3 new marks appear per day, every mark can be undone in one tap, and no mark ever contradicts today's prescription.

---

### NG PHASE 12: Home brief, Workouts tab, reward card

**Goal:** Home, Workouts and the session-complete card match `01`, `02`, `06`, `10`.

> Home (`01`, `02`): label with time, Display greeting (existing `greetingFor`), a coach line built by rules from the day (sleep, today's plan, protein left), a hero that changes by moment (morning: today's session with Start; evening: next meal with Log it, green hero), "Marked on your plan today", Daily Progress with the merged Steps / Burned / Streak tiles inside it, Water row. Home must fit in about 1.4 screens.
> Workouts (`06`): Display "Workouts", week strip with done / missed / rest / today / upcoming and a pen note when a day moved, today's hero (session, chips, blueprint line "trainer reviewed", Preview), "Today's exercises" with marks, the activity card ("Played a sport or walked a lot?" chips logging an activity that counts for calories and recovery, never as a missed workout), and a sticky "Start <session> · <min>" button above the tab bar.
> Session complete (`10`): the reward hero (title, +XP, time, sets, volume vs last time, kcal), new-best card with the next target as a pen note, "How did that feel?" (Too easy / Just right / Too hard → saved as session RPE and fed to `evaluateSession`; the pen note previews the effect), streak card, Share card (renders a 1080 × 1920 image of the hero with `react-native-view-shot` and opens the share sheet), Done. Streak counts plan days followed, with rest days and an "exam week" toggle that protects it.

**Tests:** coach line rules, hero by moment, streak with rest days and exam week, share image size.
**Acceptance:** Start is always visible on Workouts; Home's numbers equal the Tracker's for the same day.

---

### NG PHASE 13: Tracker and wearables

**Goal:** the Tracker matches `04-tracker.jpg`, and wearable data flows in without double counting.

> Update `components/tracker/TrackerBody.tsx` to the v3 cards: steps with Day / Week segmented and source line ("Watch while you wear it, phone otherwise. Never counted twice."), one recovery score with its three factors and a "Today:" action line (rules), sleep with stages when available, water, weight with a 4-week trend, activities (not plan). Every card opens its full-screen chart (existing). Health Connect: add sleep sessions, resting heart rate, HRV and exercise sessions (read-only) to the existing integration; use aggregated steps (not raw records) so phone + watch aren't added twice; store the data origin and show it. Apple Health: the same reads via a maintained HealthKit library. When sleep comes from a device, the sleep question in check-ins disappears. Recovery uses HRV and resting HR only when 7 days of baseline exist; otherwise the current formula.

**Tests:** step de-duplication by origin, baseline gating for HRV, recovery with and without wearables.
**Acceptance:** with a watch and phone both counting, the step total equals Health Connect's aggregate; the source is shown.

---

### NG PHASE 14: States, offline, accessibility and performance pass

**Goal:** every screen handles the imperfect cases in `19-states.jpg` and meets build plan section 5.6 and section 6 rule 10.

> Go screen by screen (list them in `docs/ng14-audit.md`) and add: skeleton loading in the real layout, empty state with the one-tap answer, offline banner where writes are queued (extend `setQueue` into a generic `lib/writeQueue.ts` used by meals, water, sleep, pen decisions), error state that says what was saved, and the first-day versions of Home, Workouts, Nutrition and Tracker. Run an accessibility pass (labels on icon buttons, roles, focus order, font scale 1.3x, contrast check from NG 1). Run a performance pass on a low-end Android with `lib/perf.ts`: scroll fps, Home first paint, set latency; fix regressions (memoised lists, no textures inside long lists beyond the card background, images sized). Absorbs SHIP 10.3, 10.5.

**Acceptance:** every screen in the list has all five states; airplane mode through a full workout and two meal logs loses nothing; targets in 5.6 met.

---

### NG PHASE 15: Closed beta and measurement

**Goal:** prove the design works with real people, then collect the 28 days of data the first ML model needs.

> Add PostHog events (the existing `lib/analytics.ts`) with timings: `set_logged` (taps, ms), `meal_logged` (method: planned, usual, search, scan; taps, ms), `catchup_done` (ms), `workout_started` (ms from app open), `pen_mark_shown/kept/undone`, `scan_corrected` (fields changed), `setup_step_n`. Build `docs/beta-dashboard.md` with the queries. Targets: set logged in 1 tap; meal in 2 taps or 5 s; catch-up under 15 s; workout started under 3 s from Home; pen marks kept 70 % or more; 7-day retention 40 % or more. Prepare the Play closed test (15 to 20 testers, 14 days), the in-app feedback entry in More, and a weekly report template. After 14 days, fix the three worst-measured flows before opening wider.

**Acceptance:** dashboard shows all events from a test device; tester list and build ready.

---

### Later (not in this plan's phases)

| Item | When |
| --- | --- |
| First ML models (starting weights, drop-off warning) from 28 days of beta data | After the beta |
| CLAWW's own Indian food recognition model from `scan_corrections` | When enough consented photos exist |
| Video demos in the How to sheet (3D, real or generated) | When the format is decided |
| Period tracking linked to training, recovery and appetite | After ML insights |
| Light theme and a creative UI pass | End of the build |
| Telugu and Hindi | After launch |
| Pricing and the paid tier (RevenueCat) | Before launch |

---

## 3. How to start in Claude Code

1. The `nextgen/` folder is in the repo at `claww app/nextgen/`.
2. In `CLAUDE.md`'s Roadmaps list, add: "`nextgen/claww-nextgen-phased-prompts.md` with `nextgen/claww-nextgen-build-plan.md`: **the active plan from 2026-11-03.** NG PHASE 0 to 15, screens in `nextgen/design/`." and mark `claww-v2-phased-prompts.md` as "coded through V2 PHASE 9; NG PHASE 0 finishes it".
3. Install the two skills in build plan section 9.
4. Run one phase per session, or one numbered step per session where a phase has steps. Never two at once.

**First prompt to paste into Claude Code:**

> Read `CLAUDE.md`, then `nextgen/claww-nextgen-build-plan.md` in full, and `nextgen/claww-nextgen-phased-prompts.md`, and look at every image in `nextgen/design/screens/`. Update `CLAUDE.md`'s Roadmaps list as section 3 of the prompts file says, on the branch the `nextgen/` folder is on. Then tell me, in a short list, and also write it into section 12 of the build plan: anything in the plan that conflicts with the code as it is today, anything missing that NG PHASE 0 needs from me, and the exact order of the user steps in NG PHASE 0. Don't start any other phase.

After that, each phase starts with:

> Start NG PHASE N (or, for phases with numbered steps, step N.x) from `nextgen/claww-nextgen-phased-prompts.md`. Follow its standing rules (section 1). Open the screens listed for this phase first.
