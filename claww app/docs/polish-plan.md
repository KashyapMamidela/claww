# CLAWW polish plan (after the 6 Nov device test)

Written 2026-11-06 (planning on Opus 5.5). **Build it on Sonnet 5.5, one step at a time, in this order.** Each step is
its own branch `polish/<n>-<slug>`, stacked on `ng/phase-14-states-a11y-perf`, its own PR, never merged by us. Typecheck
and tests pass before every PR. Every step ends with a phone check over USB (adb is at
`C:\Users\kashy\android-tools\platform-tools\adb.exe`; the phone must show "authorized") or, if the phone is not
connected, a new EAS preview APK whose link goes to the user.

Visual reference: `docs/design/ng15-home-welcome.html` (welcome flow, Home morning, Home at lunchtime; open it in a
browser, the logo animation runs). The user's screenshots of the 5 Nov APK are the "before".

Standing rules from `nextgen/claww-nextgen-phased-prompts.md` still apply: no new hard-coded hex outside `lib/theme.ts`,
no emoji, the model never computes numbers, RLS on every table, schema only in `database/schema.sql`, idempotent.

---

## Step 1: Bugs from the device test

1. **Keyboard hides the food search box.** `components/ui/BottomSheet.tsx` does not move above the keyboard. Make the
   sheet keyboard-aware (`KeyboardAvoidingView`, `behavior="padding"` on iOS, `"height"` on Android, or
   `react-native-keyboard-controller` if it is already installed) so the input and the first results stay visible.
   Check every sheet that has a text field: food search, weight log, water custom amount, activity "Other".
2. **A missed meal cannot be logged later.** In `lib/mealPlanView.ts`, a meal whose time window has passed and has no
   log becomes a new state `missed` (not `later`). It keeps its card with **As planned / Something else / Skipped**
   (the catch-up logic in `lib/catchUp.ts`, saved at once). Up next is still the current meal. Shown on the Nutrition
   tab and in Home's Today line (step 3). Tests: at 13:10 with breakfast unlogged, breakfast is `missed`, lunch
   `up_next`; a skipped breakfast is no longer missed.
3. **Home and Workouts disagree about today.** On Friday (rest) Workouts' hero says "TODAY · Full Body" because it shows
   Monday's missed session. When the selected day is not today's weekday, the hero's label reads
   "MISSED MONDAY · DO IT TODAY" (or "UPCOMING · SATURDAY"), never "TODAY". Home says "Rest day" and offers the missed
   session in the Today line.
4. **"Log last night's sleep" while sleep is logged.** Home's coach line and the Recovery note check
   `getTodaysSleepLog` (logged since midnight); the Tracker shows the last night. Add one helper `lastNightSleep()`
   (the sleep log whose wake time is today, else the most recent within 18 h) and use it in Home, the coach line, the
   Recovery note and the Tracker.
5. **Calories flash from 2,000 to 2,461.** Home renders the fallback target before the profile loads. Read the target
   from `profileStore` (already cached) and show the skeleton until it is known; never show a fallback number.
6. **The "move day" pen mark looks wrong.** "Plan · Monday → Wednesday" with Wednesday already a training day. Check
   `freeWeekday` in `lib/penData.ts` against the plan's labels (it must skip used weekdays), check `relabelDay` did not
   duplicate a day, and label the item with the session name ("Full body day"), not "Plan". Add a test.
7. **A Full body day with 2 exercises.** Find out whether the user's current plan was made before NG 5 (no
   `blueprint_id`) or whether the catalog fill dropped slots. If it is an old plan, show a one-time card on Workouts:
   "Your plan was made with the old builder. Rebuild it?" (opens workout setup). If the fill dropped slots, fix the
   fill. Report which it was.
8. Small: greeting capitalises the name ("kashyap" → "Kashyap"); every tab screen has bottom padding so the last card
   clears the tab bar; the Tracker's Adaptive card says nothing about "changes" on a rest day; personal records ignore
   bodyweight-only sets when a loaded set exists.

## Step 2: Daily Progress, Burned ring and the Session tile

- Rings become **Burned (outer, `AREA_COLORS.burned`), Eaten (green), Recovery (teal)**. The Workout ring and the
  `RINGS_V1` flag go.
- **Burned goal** (decided by the user: an active-calorie goal based on how the calorie goal was set), pure
  `lib/burnGoal.ts` with tests: `round10(BMR × (activityMultiplier − 1.2))`, floor 250 kcal, using the same BMR and
  multiplier as `lib/nutrition.ts` (moderate 1.45, active 1.7; sedentary gives the floor). Example: 68 kg moderate
  male about 410 kcal. Stored override `personalization_profile.burnGoalKcal` when the user edits it in the Burned
  sheet (tap the ring row). Burned value is unchanged (`lib/dayStats.ts`).
- Daily Goal % = average of the three rings (each capped at 100).
- **Tiles: Steps, Session, Streak.** The Session tile replaces Burned (recommended because the Workout ring is gone and
  the session must stay visible): "Rest", "0 / 4 sets", "Done", or "Missed · Mon"; tap opens Workouts. (Alternatives the
  user may pick instead: Protein g / target, or Sleep.)
- Layout to the mock: ring 128 px left, three read-outs right (label, value / target, one quiet note), three equal
  tiles below. Same card on every screen size; no dot grid, no watermark, no hatch.

## Step 3: Home redesign (the mock, frames 4 and 5)

Order: header (small mark, date, bell) → greeting (32/900) → coach line with one bold fact and a Caveat pen note →
Daily Progress card (step 2) → **Today** → Marked on your plan → a two-up row (Water, "Played a sport?").

- **Today** is one vertical line through the day, built by a pure `lib/todayLine.ts` (tested): meal slots from the
  meal plan and logs (states done, missed, now, later), the session (planned, missed and offered, done, rest), and a
  sleep target ("Sleep by 11"). The "now" item carries its buttons (Ate as planned / Something else, Start · 18 min); a
  missed meal carries As planned / Something else / Skipped. This replaces the hero, the catch-up banner on Home and
  the "Breakfast" hero. Done items collapse to one line with a check.
- The XP pill leaves Home (it moves to More and the Tracker header).
- "Played a sport?" opens the existing `ActivityCard` in a bottom sheet instead of the full card on Home.
- Home must fit the first screen down to the end of the Today line's "now" item.

## Step 4: One look everywhere, and cut the generic decoration

**Cut** (the user calls it "AI slop"): diagonal hatch in hero corners, dot grids on tiles, icon watermarks, the
"✦ CLAWW" XP pill on Home, ALL-CAPS eyebrow labels over every card (section titles become sentence case 17/800, area
names stay as small coloured labels only inside pen marks), the purple "CLAWW INSIGHT" bar card (the insight becomes a
plain line under the chart it is about), "Privacy-Protected — your data stays private", the trust chips on Welcome.

**Keep and apply to every card on every screen:** `Surface` (gradient, 1 px border, top light) with **one** film grain;
a screen-level grain on full-screen backgrounds; glow only on data (rings, the "now" node, the active segment); one
colour per area; Caveat only for pen notes.

Screens to convert, each checked against the user's screenshots: Workouts (exercise rows, remove the old "Missed" card,
"This Week" calendar and "Log a session", which duplicate the week strip), Nutrition (macro card, meal cards, up-next,
diary link), Tracker (every card from Strength down), More, Profile, Settings, Food diary, Catch-up, Weekly review,
Scanner, workout and meal setup. `components/ui/Hero.tsx` and `TintTile.tsx` lose the hatch, dots and watermark.

## Step 5: Welcome, splash and sign-in (mock frames 1 to 3)

- **Splash animation.** The mark is three pieces; they are traced in `assets/logo/logo-pieces.svg` and
  `lib/logoPieces.ts` (`top`, `left`, `right`; the runner's head is a hole in `top`). Reanimated 4 + `react-native-svg`:
  each piece starts off-centre (top from above, left from the lower left, right from the lower right), turned 30 to
  40 degrees and at 70 % scale, and springs into place (`duration 600, dampingRatio 0.8`), 80 ms apart; the runner
  appears in the gap as they lock. One light haptic at the lock. Then the mark rises and shrinks into the welcome
  screen's position (same element, no cut). About 1.1 s in total. Reduce motion: the mark fades in. Replaces
  `components/SplashIntro.tsx`. The traced paths are polygons from the PNG: if they look jagged at large sizes, ask the
  user for the original vector (the designer's file) and swap the paths; the animation code does not change.
- **Welcome:** the mark, one headline with the pen underline ("Train for the day you actually have."), one sentence,
  one handwritten note, **Create an account** (white) and **I already have one** (outline). Same black, grain and type
  as the app. Replaces `components/WelcomeScreen.tsx` / `screens/auth/welcome.tsx` content.
- **Log in / sign up:** mark top left, "Welcome back." / "Create your account", Continue with Google first, email and
  password below, Forgot password, one primary button at the bottom. Same for sign-up with a name field.
- "Light design" was read as clean and minimal on the app's own dark look, so the entry matches the inside of the app
  (the user's complaint). If the user meant a light (white) theme for these screens, only the colours change.

## Step 6: The Adaptive card and a real 3D body

**Needs a decision from the user before building: where the 3D model comes from.**

- **Model options:**
  - **A (recommended):** buy a licensed low-poly écorché (muscle) body with one mesh per muscle from Sketchfab or
    CGTrader (standard licence that allows use in a distributed app, about $20 to $150).
  - **B:** Z-Anatomy / BodyParts3D (free, CC BY-SA: attribution, and the derived model file must stay CC BY-SA; very
    detailed, needs heavy decimation).
  - **C:** commission one in Blender (fits V2 PHASE 11's Blender work).
- **Budget:** GLB with Draco, at most 1.5 MB and 40k triangles; meshes named so they map to the app's ten muscles
  (chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core).
- **Stack:** `three`, `@react-three/fiber/native`, `expo-gl`, `expo-asset` (new native module: new APK). Render on
  demand (`frameloop="demand"`), one slow quarter turn on first view then still, drag to rotate, front/back toggle.
  60 fps on device B or it falls back to the existing 2D `BodyMap`. Same footprint as today's body map.
- **Colour:** each muscle coloured by how much today's session (or the selected week) targets it: not trained = grey,
  then four steps of the recovery teal or, in the recovery view, the recovery score bands. A small legend.
- **Where:** the Adaptive card (collapsed: a small 3D thumbnail + "Full body today · 2 changes"; expanded: the model
  large, the check-in as one row per muscle with a 4-step Segmented (None, Light, Sore, Very sore) and a readiness
  Segmented, and each prescription change as a `PenMark`), the Tracker's Muscle recovery card, the exercise guide's
  Muscles tab and the player's form strip.

## Step 7: Rebuild, install, check

New EAS preview APK (expo-gl and the 3D model are native), install over USB, walk every screen against this plan and
the mock, read crash logs (`adb logcat`), Settings > Speed numbers (Home first paint, set latency), then the user's own
pass. Record findings in `docs/polish-findings.md`.

---

## Decisions log

| Question | Answer | Date |
| --- | --- | --- |
| Burned ring goal | Active-calorie goal from how the calorie goal was set: BMR × (activity multiplier − 1.2), floor 250, editable | 2026-11-06 user |
| Tile replacing Burned | Recommended: Session. Alternatives: Protein, Sleep | waiting on the user |
| Login and welcome | Redesign with the three-piece logo animation, entry matches the app's look | 2026-11-06 user |
| 3D body model source | A (buy), B (free CC BY-SA) or C (commission) | waiting on the user |
| Build model | Plan and design on Opus 5.5, build on Sonnet 5.5 | 2026-11-06 user |
