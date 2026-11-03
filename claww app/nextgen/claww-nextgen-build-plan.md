# CLAWW Next Gen: the build plan

The single source of truth for building CLAWW's next generation in Claude Code. It joins the
product plan of 2 Nov 2026 ("CLAWW Next Generation, Final Plan"), the v3 screen designs of
3 Nov 2026 (scored 9.2 / 10 in the UX audit) and the real state of the repo at commit `9d79983`
on `v2/phase-1-quick-fixes`.

Phases here are labelled **NG PHASE N** so they can't be confused with `claww-v2-phased-prompts.md`
(V2 PHASE N), `claww-ship-roadmap.md` (SHIP PHASE N), `claww-phased-prompts.md` (PHASE N, done) or
`claww-full-roadmap.md` (Engine Phase N).

Everything this file refers to sits next to it in `nextgen/`:

| Path | What it is |
| --- | --- |
| `nextgen/claww-nextgen-build-plan.md` | This file: the specification |
| `nextgen/claww-nextgen-phased-prompts.md` | The phases NG 0 to 15 with standing rules and the prompts to paste into Claude Code |
| `nextgen/design/screens/*.jpg` | 20 screen images at 2x, the visual spec for every phase |
| `nextgen/design/html/*.dc.html` | The same screens as working HTML; open `nextgen/design/index.html` in a browser and tap through them |
| `nextgen/design/html/Tokens.dc.html` | The design-system board (colours, surfaces, buttons, pen, rings, motion) |

---

## Contents

1. Evaluation of the 2 Nov final plan
2. Final decisions (updated on 3 Nov)
3. Where the repo is today
4. Screen map: every design, and the phase that builds it
5. Design system spec
6. UX rules for every screen
7. Data model additions
8. Work that runs in parallel (people, data, models)
9. Skills and libraries to install
10. Open decisions log
11. Plan quality and how it reaches 9
12. Conflict check results

The phases, their standing rules and the Claude Code prompts are in `nextgen/claww-nextgen-phased-prompts.md`.

---

## 1. Evaluation of the 2 Nov final plan

**As a product plan: 8.5 / 10. As a build plan: 6.4 / 10.** The thinking is strong and
differentiated, but it was written without the repo open, so it repeats work that already
exists, contradicts a few later decisions, and gives Claude Code nothing to verify against.

| Area | Score | Why |
| --- | --- | --- |
| Product vision and differentiation | 9 | Rules-built plans, "what can you get?" diet, Coach's Pen, context-first scanner. No Indian competitor combines these. |
| Decision completeness | 8 | Every open question from earlier docs has an answer; only people-dependent items stay open. |
| Fit with the current code | 5 | Does not know V2 PHASES 1 to 9 exist. Asks to "unify the three recovery formulas" (done in V2 7.5), rebuild the player with one-tap sets and offline (done in V2 2), add a food profile with cuisines (done in V2 5.1), rebuild the Tracker (done in V2 9). |
| Consistency with later decisions | 6 | Says the tab is "Diet" (the app and the user say Nutrition), the pen is "the brand accent" (now one white pen with a bold value), the diet is "for students" (now for everyone, students first), and keeps the old recovery / sleep / nutrition rings. |
| Buildability | 5 | No schema, no file names, no acceptance criteria, no tests named, no device-test steps. A Claude Code session would have to invent all of it. |
| Sequencing | 7 | Foundations first is right. Missing a step 0 to merge and device-test the unmerged V2 branch, missing a design-system step, and the player (most-used screen) waits until step 9. |
| Risks and dependencies | 7 | Names the trainer and nutritionist review. Does not name a food-data source, its licence, or what happens if reviewers are late. |
| Measurability | 4 | No targets. Nothing says what "light" or "accurate steps" means in numbers. |
| **Average** | **6.4** | |

**What this file fixes**

1. Adds **NG PHASE 0**: merge, apply the schema, deploy and device-test the nine unmerged V2 phases before anything new. Building on an untested branch is the biggest risk in the whole project.
2. Re-bases every step on what the repo already has, and names the files to change.
3. Adds **NG PHASE 1**, the design system in code, so every later screen is built from the same parts as the 9.2 designs.
4. Moves the **player** forward to NG PHASE 3: it is the screen used most and needs no new data.
5. Applies the 3 Nov decisions: Nutrition tab name, one white pen, diet for everyone, Workout / Nutrition / Recovery rings, household units first, usuals, states.
6. Gives every phase a schema block, tests, acceptance criteria with numbers, and device-test steps.
7. Names a food-data plan with licence checks and a fallback if the nutritionist review is late.

---

## 2. Final decisions (updated on 3 Nov)

Where this table and the 2 Nov plan disagree, this table wins.

| Topic | Decision |
| --- | --- |
| Workout plans | Never AI. A decision tree picks one trainer-reviewed blueprint; rules fill it from the catalog. Same answers always give the same plan. |
| Diet plans | Never AI. 3 meals a day (breakfast, lunch, dinner) from nutritionist-reviewed templates, fitted to the user's resources; every meal editable. |
| Who the diet is for | Everyone. Students are the first audience, so mess, hostel, PG and kettle-only cases are first-class, but nothing is worded "for students". |
| Tab names | Home, Workouts, **Nutrition**, CLAWW Tracker, More (unchanged from the app). |
| AI's job | Only inside the adaptive system: the trend reader proposes, the rules engine decides. Never named in the UI. No "AI coach", no pop-ups. |
| The Coach's Pen | One **white** pen everywhere. The new value is **bold Inter with a hand-drawn underline**; only the short reason is handwritten (Caveat). Old value struck through in grey. Area label above (blue = workout, green = nutrition). Max 3 new marks a day, 1 per item. Tap = reason + "Use my old plan". |
| Daily Progress rings | **Workout** (blue, today's plan done), **Nutrition** (green, calories and protein), **Recovery** (teal, the one score; sleep feeds it). Sleep keeps its own card on the Tracker. |
| Portions | Household units first (katori, roti, pieces, tsp, glass), grams second. Everywhere: plans, scanner, diary. |
| Logging | "Ate as planned" is the main action. Usuals (chai with sugar, 2 eggs, banana, curd) are one tap. The scanner is for meals off the plan. |
| Scanner | Context first (place, oil, portion; "last time at this place" one tap), then every item with household units, oil always its own line, edit, log. Numbers from the food database, never the model. Corrections saved for training. |
| Vision models | Groq first; a second provider as automatic backup, chosen after testing on real Indian meal photos. |
| Food rating | Good / Okay / Poor against what the plan needed at that moment, one kind reason. Poor is grey, never red. |
| Player | Tick a set row = logged as planned. Weight, reps and Done in a bottom sheet. Rest: big timer, ±15 s, Skip. Plate math. Swap. How-to button (video slot empty for now). Lock screen: iOS Live Activity, Android ongoing notification. |
| Look | Dark only for now. Textured surfaces (grain, top light, coloured under-glow), the app's existing palette and gradients. Light theme at the very end. |
| Language | English only for now. |
| Launch | No date. Best build first, then a 15 to 20 tester closed test (Play needs 12 for 14 days). |

---

## 3. Where the repo is today

Read `CLAUDE.md` for the full notes. Summary at `9d79983`:

- **V2 PHASES 1 to 9 are coded on `v2/phase-1-quick-fixes` but none is merged, device-tested, or applied to the live database.** 318 tests pass and typecheck is clean. Several need the user: run `database/schema.sql` blocks, run the exercise seeds, deploy `generate-plan`, `compute-recovery`, `suggest-meal`, `send-reminders`, set up FCM.
- Already built and reused by this plan:
  - Player: `components/player/FullPlayer.tsx`, `RestView.tsx`, `ValuePickerSheet.tsx`, `lib/sessionPlan.ts`, `lib/sessionClock.ts`, offline set queue `lib/setQueue.ts` with `workout_logs.client_id`, rest notification `lib/restAlertPlan.ts`.
  - Adaptive engine: `supabase/functions/_shared/adaptive.ts` (`ADAPTIVE_CONFIG`, `evaluateSession`, `prescribe`, `muscleRecovery`), session start flow `components/SessionStartFlow.tsx`, tables `exercise_progress`, `muscle_checkins`, `prescription_decisions`.
  - One recovery score: `computeRecoveryScore` in `_shared/recovery.ts`, shared by app and functions (V2 7.5).
  - Catalog metadata and form guides for 183 exercises (`seed_exercise_metadata.sql`, `seed_exercise_form_guides.sql`), `ExerciseGuideSheet`, `BodyMap`.
  - Weekdays, Missed state, reminders and push (`send-reminders`, `push_tokens`).
  - Food profile with cuisines and avoid list (`lib/foodProfile.ts`), `suggest-meal` with 3 options.
  - Tracker rebuilt (`components/tracker/TrackerBody.tsx`, `lib/trackerMath.ts`).
  - Steps from Health Connect (steps and active calories only) and the phone pedometer.
- Still AI-driven and to be replaced: `generate-plan` asks the model to pick the split and exercises (grounded and clamped, but not rules-only). `suggest-meal` names meals with the model.

---

## 4. Screen map

Images are in `design/screens/`. Every UI phase must match its images; differences must be listed in the PR. Phases are in `nextgen/claww-nextgen-phased-prompts.md`.

| Image | Screen | Built in |
| --- | --- | --- |
| `01-home-morning.jpg`, `02-home-evening.jpg` | Home as the coach's brief; changes by time of day | NG 12 |
| `03-pen-review.jpg` | Sunday "Your week, marked up" | NG 11 |
| `04-tracker.jpg` | CLAWW Tracker (steps with source, one recovery score with today's action, sleep, water, weight, activities) | NG 13 |
| `05-workout-setup.jpg` | Workout setup on one screen, plan card updates live | NG 5 |
| `06-workouts-tab.jpg` | Workouts tab: week strip, today's session, marked exercises, activities, sticky Start | NG 12 |
| `07-player.jpg`, `08-player-rest.jpg` | Live player and rest state | NG 3 |
| `09-lock-screen.jpg` | iOS Live Activity, Android ongoing notification | NG 3 |
| `10-session-complete.jpg` | Reward card, "How did that feel?" | NG 12 |
| `11-meal-setup-1-where.jpg` | Where your food comes from, cook with, you eat | NG 6 |
| `12-meal-setup-2-foods.jpg` | "Can you get these?", 12 foods pre-filled | NG 6 |
| `13-meal-setup-3-summary.jpg` | Your kitchen, gaps the plan works around, a day on the plan | NG 6 |
| `14-nutrition-tab.jpg` | Nutrition tab: macros, Scan / Search / Diary, usuals, 3 meals | NG 8 |
| `15-catch-up.jpg` | 8:30 pm catch-up, saves as you answer | NG 10 |
| `16-scanner-1-context.jpg` | Scanner context, "last time at this place" | NG 9 |
| `17-scanner-2-check.jpg` | Check the plate in household units | NG 9 |
| `18-food-diary.jpg` | Food diary with micronutrients and ratings | NG 8 |
| `19-states.jpg` | First day, loading, offline, unsure scan, error, empty | NG 1 (components), NG 14 (everywhere) |
| `20-design-system.jpg` | Tokens, surfaces, buttons, pen, rings, motion | NG 1 |

The HTML versions are interactive: Home (`?moment=evening`, `?rings=current`), Workouts (tap exercises, activity chips), Player (tick, Done, rest, ±15, Skip, finish), setup screens (every choice), Nutrition (usuals, Ate as planned, why), Catch-up (answers re-mark dinner), Scanner (steppers recalculate, rating changes), Diary (tap entries), Pen review (Keep / Undo), Tracker (Day / Week).

---

## 5. Design system spec

Build these once in NG PHASE 1; every later phase uses them. Colours already in `lib/theme.ts` stay exactly as they are.

### 5.1 Colour tokens

Existing (do not change): `bg #050505`, `surface #0F0F10`, `card #151517`, `fg #FFFFFF`, `fgGray #A1A1AA`, `border rgba(255,255,255,0.08)`, `borderStrong rgba(255,255,255,0.14)`, `blue #3B82F6`, `blueDeep #1D4ED8`, `green #22C55E`, `greenDeep #166534`, `amber #F59E0B`, `danger #EF4444`, `TAB_ACCENTS`, `AREA_COLORS` (workouts blue, nutrition green, recovery `#2DD4BF`, sleep `#818CF8`, steps `#F59E0B`, burned `#FB923C`, streak `#F472B6`, water `#38BDF8`).

Add (accessibility):

| Token | Value | Use |
| --- | --- | --- |
| `textMuted` | `#9A9AA3` | Secondary text. Replaces `#71717A` for any text (4.5:1 on cards). |
| `textFaint` | `#8A8A93` | Struck-through old values, tertiary text. Replaces `#52525B` for any text. |
| `pen` | `#FFFFFF` | The Coach's Pen, everywhere. |
| `ratingGood` / `ratingOkay` / `ratingPoor` | `#4ADE80` / `#FBBF24` / `#C4C4CC` | Food ratings. Poor is grey. |

`#71717A` and `#52525B` may stay only for icons, borders and inactive tab icons, never for text.

### 5.2 Type

Inter everywhere (already loaded). Caveat (add `@expo-google-fonts/caveat`, weights 500 and 700) only for pen notes.

| Style | Size / weight | Use |
| --- | --- | --- |
| Display | 28 / 900, letter-spacing −0.6, line 31 | Screen titles, greeting (existing `Display`) |
| Heading | 21 / 800 | Sheet and setup titles |
| Title | 14 / 700 | Card titles, item names |
| Body | 13 / 500, line 19 | Coach line, descriptions |
| Label | 11 / 700, letter-spacing 0.9, caps, with 6 px glowing dot | `SectionLabel` (raise from 10 to 11) |
| Small | 12 / 500 `textMuted` | Meta lines |
| Number | tabular figures (`fontVariant: ['tabular-nums']`) | Every number |
| Pen value | Inter 800, white, hand-drawn underline | New value of a mark |
| Pen note | Caveat 500, 16 to 19 px, white, soft glow | The one-line reason |

**No text under 11 px.** Tab labels may be 10.5 px, single line.

### 5.3 Surfaces (the texture)

All four are components in `components/ui/`. Texture must be cheap on low-end Android: one pre-rendered noise PNG (`assets/textures/noise-256.png`, white grain, about 6 to 10 % alpha) tiled with `ImageBackground` `resizeMode="repeat"`, or drawn once with Skia (`@shopify/react-native-skia`, already a dependency) and cached. **No live SVG filters, no blur except the header and tab bar.**

| Component | Look | RN notes |
| --- | --- | --- |
| `Surface` (card) | Vertical gradient `#1A1A1D → #131315`, 1 px border `rgba(255,255,255,0.09)`, 1 px inner top light `rgba(255,255,255,0.07)`, grain overlay ~10 %, radius 20, soft drop shadow | `expo-linear-gradient` + absolute 1 px top line + noise image; iOS `shadow*`, Android `elevation: 6` with `shadowColor` |
| `TintTile` (area tile) | Surface + radial glow of the area colour from the top-right (~24 %), border tinted with the area colour, coloured under-glow, big faint area icon as a watermark (~9 % opacity), dot texture top-right | Skia `RadialGradient` or a pre-made radial PNG tinted with `tintColor`; under-glow = a blurred coloured shadow (iOS) or a low-opacity coloured view behind (Android) |
| `Hero` | The app's gradients (blue `#0F172A → #1E3A5F → #1D4ED8`, green `#052E16 → #14532D → #166534`), thin diagonal line texture top-left, top light, coloured under-glow, a sheen that sweeps **once** on mount | Lines = a small repeat PNG; sheen = Reanimated translateX of a skewed gradient, once |
| `Well` | Inset area `#0B0B0C` with an inner shadow | Used behind steppers, segmented controls, reasons |

Skeleton (`Skeleton.tsx` exists): use the same shapes as the real layout, shimmer 1.4 s.

### 5.4 Controls

| Component | Spec |
| --- | --- |
| `Button` (exists) | Keep the variants. Heights: sm 38, md 48, lg 54. Primary = gradient deep → accent, white 800 text, `0 4 10 accent@25%` shadow, top light. Add a pressed state (scale 0.96 via existing `PressScale`) and disabled (50 %). |
| `Chip` (exists) | **Min height 44**, radius 22, 13 px. Inactive = Surface gradient, `#C4C4CC` text. Active = gradient deep → accent, white 700. |
| `Segmented` (new) | A `Well` with 3 px padding and 38 px buttons (44 total). Active = gradient of the screen's accent; inactive text `textMuted`. |
| `Stepper` (new) | 44 × 44 buttons, value in the middle (number 24/900 plus unit 11), inside a `Well`. |
| `TickButton` (new) | 44 × 44, radius 13. Done = blue gradient with white check; current = blue outline glow; pending = grey outline, dim check. |
| `BottomSheet` (exists) | Radius 26 top, handle 40 × 4, gradient `#1A1A1D → #0F0F10`, shadow upward. |
| `PenMark` (new) | Props: `area: 'workout' \| 'nutrition'`, `item`, `oldValue`, `newValue`, `note`, `reason`, `onKeep`, `onUseOld`. Renders the area label, item, struck old value, bold new value with the hand-drawn underline (an SVG path, stroke white 2.2, drawn in 350 ms once), Caveat note, and on tap a `Well` with the reason and two small buttons. |
| `ProgressRing` (exists, Skia) | Three rings 72 / 57 / 42, stroke 7 to 8, track = ring colour at 10 %, soft glow, fill animation 1.2 s on mount. |

Every touch target **at least 44 × 44**. Visual size may be smaller inside a larger hit area (`hitSlop`).

### 5.5 Motion and haptics

- Cards rise 10 px and fade in, 40 ms apart, on first mount only.
- Rings fill once on mount; numbers do not count up except a PR weight.
- Pen underline draws once (350 ms); the mark never animates again.
- Hero sheen once per mount.
- Haptics: light impact on set done and "Ate as planned"; success notification on a PR and on closing the day; nothing else.
- Respect `AccessibilityInfo.isReduceMotionEnabled()`: no rise, no sheen, rings appear filled.
- All animation through Reanimated on the UI thread; no `setInterval` re-rendering a screen.

### 5.6 Performance budget

- 60 fps scroll on a Redmi-class Android phone (4 GB RAM, Android 12).
- Home first paint under 1 s from cache; the network refreshes in the background.
- Texture images under 60 KB in total.
- Set tap to next set shown under 100 ms (use `lib/perf.ts` `markSetTap`).

---

## 6. UX rules for every screen

1. **The thing you repeat is under the thumb**: bottom third, at least 48 px tall.
2. **One question per idea, smart defaults**: pre-fill from what the app already knows; ask only to correct.
3. **Show reasons on demand**: a pen mark, a rating or a score opens its reason on tap, never in a pop-up.
4. **Everything automatic can be undone**: pen marks (Use my old plan), logs (Undo), usuals (undo).
5. **Plain, kind, specific words**: real foods, weights, times. Never "AI", never guilt. "Missed Tuesday, moved it to Friday."
6. **Saved locally first**: every log writes to the phone and syncs later; the UI never waits for the network.
7. **States are designed**: each screen has empty, loading (skeleton), offline, error and first-day states, as in `19-states.jpg`.
8. **Numbers in household units first** for food; kg and reps for training; tabular figures.
9. **Colour means data**: area colours only on that area's labels and data; the pen is white; Poor is grey.
10. **Accessibility**: text 11 px or larger, contrast 4.5:1 or better for text, targets 44 px, screen-reader labels on every icon button, supports font scaling up to 1.3x without clipping.

---

## 7. Data model additions

All in `database/schema.sql`, idempotent, RLS owner-only on user tables, read-only for authenticated users on reference tables. Every user table goes into `exportUserData` and account deletion.

```sql
-- NG 2: one profile (extend profiles; keep existing columns)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_months INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_minutes INT;          -- 30/45/60/75
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS injuries JSONB DEFAULT '[]';  -- [{part, severity}]
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]';-- ['cricket', ...]
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bar_weight_kg NUMERIC DEFAULT 20;

-- NG 4: food database (reference data)
CREATE TABLE IF NOT EXISTS foods (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, aliases TEXT[] DEFAULT '{}',
  kind TEXT NOT NULL CHECK (kind IN ('ingredient','dish')), cuisine TEXT, diet TEXT CHECK (diet IN ('veg','egg','nonveg','vegan')),
  kcal_100g NUMERIC NOT NULL, protein_100g NUMERIC NOT NULL, carbs_100g NUMERIC NOT NULL, fat_100g NUMERIC NOT NULL,
  fibre_100g NUMERIC, iron_mg_100g NUMERIC, calcium_mg_100g NUMERIC, vitc_mg_100g NUMERIC, b12_ug_100g NUMERIC, sodium_mg_100g NUMERIC, sugar_100g NUMERIC,
  cost_inr_100g NUMERIC, source TEXT NOT NULL, source_ref TEXT, reviewed_by TEXT, reviewed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS food_units (       -- katori, roti, piece, tsp, glass, plate
  food_id BIGINT REFERENCES foods(id) ON DELETE CASCADE, unit TEXT NOT NULL, grams NUMERIC NOT NULL, is_default BOOLEAN DEFAULT false,
  PRIMARY KEY (food_id, unit)
);
CREATE TABLE IF NOT EXISTS dish_items (       -- a dish broken into items, oil always its own row
  dish_id BIGINT REFERENCES foods(id) ON DELETE CASCADE, item_id BIGINT REFERENCES foods(id), grams NUMERIC NOT NULL,
  PRIMARY KEY (dish_id, item_id)
);

-- NG 5: blueprints live in the repo as reviewed JSON (supabase/functions/_shared/blueprints/*.json), versioned with the code.
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS blueprint_id TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS block_number INT DEFAULT 1;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS block_week INT DEFAULT 1;

-- NG 6: what the user can get
CREATE TABLE IF NOT EXISTS user_resources (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sources TEXT[] NOT NULL,            -- home, mess, pg_tiffin, canteen, outside, self_cook
  cook_with TEXT[] NOT NULL,          -- full_kitchen, stove, kettle, microwave, rice_cooker, none
  diet TEXT NOT NULL, budget_inr_day INT, plan_style TEXT DEFAULT 'same' CHECK (plan_style IN ('same','varied')),
  availability JSONB NOT NULL DEFAULT '{}',   -- {"eggs":"yes","paneer":"sometimes",...}
  avoid TEXT[] DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT now()
);

-- NG 7: meal templates (reference) and the user's daily plan
CREATE TABLE IF NOT EXISTS meal_templates (
  id TEXT PRIMARY KEY, meal TEXT CHECK (meal IN ('breakfast','lunch','dinner')), name TEXT NOT NULL,
  needs_sources TEXT[] DEFAULT '{}', needs_cook TEXT[] DEFAULT '{}', diet TEXT NOT NULL, cuisine TEXT,
  items JSONB NOT NULL,               -- [{food, unit, qty}]
  kcal NUMERIC, protein NUMERIC, cost_inr NUMERIC, reviewed_by TEXT, reviewed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS meal_plan_days (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, plan_date DATE NOT NULL,
  meals JSONB NOT NULL,               -- [{meal, template_id, items, kcal, protein, cost}]
  PRIMARY KEY (user_id, plan_date)
);

-- NG 8 / NG 9: diary fields on the existing meal_logs
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS plan_status TEXT CHECK (plan_status IN ('as_planned','swapped','extra','skipped'));
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS items JSONB;         -- [{food_id, name, unit, qty, grams}]
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS micros JSONB;        -- {fibre, iron, calcium, vitc, b12, sodium}
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS rating TEXT CHECK (rating IN ('good','okay','poor'));
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS rating_reason TEXT;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS place TEXT;          -- home, mess, restaurant, street
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS place_name TEXT;     -- "Hotel Udupi", optional
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS oil_level TEXT;      -- light, normal, heavy
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS portion TEXT;        -- small, regular, large, shared

CREATE TABLE IF NOT EXISTS scan_corrections (  -- training data, owner-only, deleted with the account
  id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_log_id BIGINT, photo_path TEXT, model TEXT, model_guess JSONB, context JSONB, final_items JSONB,
  consent BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);

-- NG 11: the Coach's Pen
CREATE TABLE IF NOT EXISTS pen_marks (
  id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  area TEXT NOT NULL CHECK (area IN ('workout','nutrition')),
  kind TEXT NOT NULL CHECK (kind IN ('change_number','swap_item','add_item','move_day','hold')),
  target JSONB NOT NULL,              -- {exercise_id | meal, plan_date, field}
  old_value TEXT, new_value TEXT NOT NULL, note TEXT NOT NULL, reason TEXT NOT NULL,
  evidence JSONB,                     -- the numbers behind it
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','kept','undone','expired')),
  created_at TIMESTAMPTZ DEFAULT now(), decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS pen_marks_user_created ON pen_marks (user_id, created_at DESC);
```

Write the matching RLS blocks in the existing style (`ENABLE ROW LEVEL SECURITY`, owner `USING (auth.uid() = user_id)` for user tables; `SELECT` for `authenticated` on `foods`, `food_units`, `dish_items`, `meal_templates`).

---

## 8. Work that runs in parallel

These are not code and can't be done by Claude Code. Start them now.

| Task | Owner | Needed by |
| --- | --- | --- |
| Find a certified trainer to review the blueprints (`blueprints/README.md` has the review table) | You | NG 5 ships to testers |
| Find a nutritionist to review foods and meal templates (`docs/food-review.md`) | You | NG 7 ships to testers |
| Collect 100 real Indian meal photos with known contents (mess, home, restaurant, street) for scanner testing | You and friends | NG 9 |
| Test 2 or 3 backup vision models on those photos; pick one | You + Claude Code | NG 9 |
| Recruit 15 to 20 beta testers (Play needs 12 for 14 days in a row) | You | NG 15 |
| Confirm the licence of every food-data source in `database/foods/SOURCES.md` | You | NG 4 ships |

**If a reviewer is late:** ship to testers with the "needs review" content but keep the closed test small, and don't make public claims of "trainer reviewed" or "nutritionist reviewed" until the review table is filled.

---

## 9. Skills and libraries to install

Already in `skills-lock.json`: Emil Kowalski's `animate`, `animate-expo`, `apple-design`, `emil-design-eng` and related animation skills. Use them for NG 1, 3 and 12.

Add before NG PHASE 1:

| Install | Why | Command |
| --- | --- | --- |
| Expo skills (official) | Expo-correct patterns: design system, animation, native UI, router, EAS Update | `claude plugin install expo@claude-plugins-official` |
| React Native best practices (Callstack) | Performance and component patterns for low-end Android | `npx skills add callstackincubator/agent-skills --skill react-native-best-practices` |

Libraries (add only in the phase that needs them):

- `@expo-google-fonts/caveat` (NG 1)
- `react-native-view-shot` (NG 12 share card)
- A Live Activity module or config plugin, and an Android chronometer notification module (NG 3, chosen in that phase after checking maintenance)
- A HealthKit library (NG 13)
- Already present and used: `@shopify/react-native-skia`, `react-native-reanimated`, `expo-linear-gradient`, `expo-haptics`, `expo-notifications`

---

## 10. Open decisions log

Fill these in as they are decided; Claude Code reads this table before the phase that needs each one.

| Decision | Needed by | Options | Decided | Date |
| --- | --- | --- | --- | --- |
| Trainer who reviews the blueprints | NG 5 to testers | (name) | | |
| Nutritionist who reviews foods and templates | NG 4 and 7 to testers | (name) | | |
| Food-data sources and their licences (`database/foods/SOURCES.md`) | NG 4 | Nutritionist's own values; published Indian tables if the licence allows; USDA FoodData Central (public domain) | | |
| Backup food-photo model | NG 9 | 2 or 3 candidates tested on 20 to 30 of your meal photos | | |
| Can users mark their own plan with the pen ("I'll do this Saturday")? | NG 11 | Yes (adds a `source` column to `pen_marks`) / No | | |
| What the paid tier includes | NG 15 | Which daily caps stay, which features are paid | | |
| Live Activity and Android chronometer modules | NG 3.5 | Chosen in that step after checking maintenance | | |

---

## 11. Plan quality and how it reaches 9

Scored on the same eight areas as section 1.

| Area | 2 Nov plan | This plan today | What takes it to 9+ |
| --- | --- | --- | --- |
| Product vision | 9 | 9 | Nothing |
| Decisions | 8 | 9 | Section 10 filled |
| Fit with the code | 5 | 8 | NG PHASE 0 done (V2 tested and merged); Claude Code's conflict check (first prompt) folded back into this file |
| Consistency | 6 | 9 | Nothing |
| Buildability | 5 | 9 | Phases 3, 5 and 11 split into steps (done) |
| Sequencing | 7 | 9 | Done |
| Risks and dependencies | 7 | 7 | Reviewers named, food sources and licences confirmed, backup model picked |
| Measurability | 4 | 9 | Baseline numbers (NG 0.4) and device list (NG 0.2) added (done); filled in when NG 0 runs |
| **Average** | **6.4** | **8.6** | **9.0 to 9.2** once NG 0 and section 10 are done. Higher only after the beta's real numbers. |

---

## 12. Conflict check results

Paste here what Claude Code reports from the first prompt (conflicts between this plan and the code), and the fix agreed for each.

| Conflict | Where | Fix | Date |
| --- | --- | --- | --- |
| | | | |
