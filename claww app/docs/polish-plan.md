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

## Redrafted order (6 Nov, after the user's review)

Polish, not redesign: the current look stays (grain texture, top light, a colour per feature as a soft glow, one CLAWW primary colour, blue, for buttons, tabs and progress). Dropped: "From the home pot", the "Move" path, the black and white draft screens, the four-tab restructure (later). The canvas "CLAWW app redesign" (claude.ai artifact JAL32ssM1bVgZFUFQ4MQgH) holds the redrafted plan board and the two onboarding screens.

## Step 2: Onboarding, goal first, then how you train

- Screen 1 "What's your goal?" (one choice): Lose fat, Gain weight, Build muscle, Get stronger, Stay fit. Maps to the existing goals (`fat_loss`, `muscle_gain` with a calorie surplus for Gain weight, `muscle`, `strength`, `general`).
- Screen 2 "How do you like to train?" (pick any): Gym, Calisthenics, Home workout, Yoga, Mobility. A live line shows the week it makes ("3 days gym + 1 to 2 days yoga").
- Then days, minutes, anything that hurts, and sign in. Onboarding and workout setup become one flow; height, weight and age are asked once.
- Design: the canvas boards `Goal` and `Train` (cards with the feature's glow when picked, Apple sizes, Continue in the primary blue).

## Step 3: Plans for every training style

New blueprint families next to the gym ones: calisthenics (progressions: push-up to dips, rows to pull-ups, squats to pistol work), yoga (flows by length and level), mobility (routines by body area), and home. With more than one style picked, the plan mixes them (main style 3 days, others 1 to 2). The catalog needs the missing exercises and form guides; every template is `reviewed: false` until the trainer approves it (add them to the review PDF).

## Step 4: Home, the Today line and the Burned ring

- Today as one line through the day: the current item carries its buttons, a missed meal stays with As planned / Something else / Skipped, done items shrink to a tick. Replaces the hero and the catch-up banner on Home.
- Rings Burned (outer; goal `round10(BMR x (activity multiplier - 1.2))`, floor 250, editable), Eaten, Recovery. Tiles Steps, Session, Streak. The XP pill moves off Home.

## Step 5: Log from the lock screen

Notification actions (Android, the same native path as the workout lock-screen module): meal reminder with Ate it / Something else (opens the + sheet), water "+250 ml", morning "Slept 11:40 to 7:10? Yes". Each action writes through the offline write queue.

## Step 6: Save as my plate

After any logged meal: "Save as my plate". Saved plates appear first in Something else and in food search, one tap to log. Works for home food, mess and hostel cooking. Builds on the existing usuals.

## Step 7: The plan arrives as stories

After setup, the plan shows as 4 tap-through cards (your week, first session, a day of food, what I watch), each drawn in by the pen, each with one Adjust button, instead of one long page.

## Step 8: Same look on every screen

Grain and top light on every card, the feature glow only on that feature's card, cut the hatch, dot grids and icon watermarks, sentence-case titles, Apple type sizes (34 / 22 / 17 / 15 / 13, nothing under 13), buttons 50 and 44 tall, plain words. Screens: Workouts, Nutrition, Tracker, More, Profile, Settings, diary, catch-up, weekly review, scanner, setups.

## Step 9: Splash, welcome and log in

The logo's three pieces (`assets/logo/logo-pieces.svg`, `lib/logoPieces.ts`) fly in and lock together, then rise into the welcome screen; welcome and log in rebuilt in the app's textured style with Google first.

## Step 10: Sunday letter

The weekly review gets a shareable 9:16 story card: three numbers and what changed, in the pen.

## Later (after the closed beta)

One buddy, weekly streak, four tabs with a + button, the 3D body (waits on the model source decision).

## Decisions log

| Question | Answer | Date |
| --- | --- | --- |
| Burned ring goal | Active-calorie goal from how the calorie goal was set: BMR × (activity multiplier − 1.2), floor 250, editable | 2026-11-06 user |
| Tile replacing Burned | Session (recommended; the user has not objected) | 2026-11-06 |
| Onboarding | Goal first, then how you train (gym, calisthenics, home, yoga, mobility) | 2026-11-06 user |
| Home pot, Move path | Dropped | 2026-11-06 user |
| Scope | Polish the current app, keep texture and glows; no full redesign | 2026-11-06 user |
| Login and welcome | Redesign with the three-piece logo animation, entry matches the app's look | 2026-11-06 user |
| 3D body model source | A (buy), B (free CC BY-SA) or C (commission) | waiting on the user |
| Build model | Plan and design on Opus 5.5, build on Sonnet 5.5 | 2026-11-06 user |
