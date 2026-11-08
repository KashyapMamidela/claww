# CLAWW premium pass: build plan

Written 8 Nov 2026 from the design review at https://claude.ai/artifact/Tux6zrDfxo85knLHTyD7AZ.
The user picked **every** item (B1–B9, S1–S7, X1–X6, H1–H9, W1–W5, N1–N5, T1–T4, P1–P3, D1–D16, F1–F10).
This file is the source of truth for the build. Work top to bottom; tick boxes in `docs/premium-status.md` as you go.

Goal in the user's words: the app should look and feel better than Apple Fitness, Cal AI and Strava, growing
from the current taste (dark, grain, lit gradient cards, area colours, the handwritten pen), not replacing it.

---

## 0. Ground rules (read before every phase)

- **Branches.** Stacked branches, one per phase: `premium/01-fixes` off `polish/11-device-fixes`, then
  `premium/02-frame` off `premium/01-fixes`, and so on. Push each, open a PR against the previous branch.
  **Never merge**; the user merges.
- **Commits.** Small, one topic each. Message ends with the attribution line the session gives you.
  PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Before every commit:** `npx tsc --noEmit` clean and `npm test -- --run` all green (857+ tests).
- **Verify on the phone after every visible change** (section 0.1). The user keeps it plugged in. Never ask the
  user to check by hand; show a screenshot.
- **Do not log real data while testing** (no "As planned", no water, no sets saved). If a test needs a log,
  undo it straight after and say so.
- **Known crash to avoid:** on Fabric, re-rendering a screen in the same frame it is popped crashes with
  "addViewAt failed… child already has a parent". Navigate first, then do state work ~700 ms later
  (see `app/screens/nutrition-setup/summary.tsx` for the pattern).
- **Native modules need a new dev build** (EAS `development` profile, ~25 min). Batch every new native
  dependency into **one** rebuild (Phase 7). Everything else is JS-only and hot-reloads through Metro.
- **Keep the copy plain.** Short sentences, name things by what the user sees, no em-dash asides.

### 0.1 Device loop

```bash
# Metro (background)          cd "claww app/app" && npx expo start --dev-client --port 8081
# Phone port + launch
/c/Users/kashy/android-tools/platform-tools/adb.exe reverse tcp:8081 tcp:8081
/c/Users/kashy/android-tools/platform-tools/adb.exe shell am start -a android.intent.action.VIEW -d "exp+claww://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

Helpers in `tools/device/` (Python 3, Pillow):

- `python tools/device/shot.py NAME [steps…]`: runs steps, saves a 432 px wide screenshot to
  `tools/device/out/NAME.png` (git-ignored). Steps: `t:x,y` tap · `s:x1,y1,x2,y2` swipe · `b` back ·
  `w:sec` wait · `l:URL` open deep link (`claww:///settings`, `claww:///diary`, …).
- `python tools/device/ui.py [filter]`: lists on-screen labels with bounds; `*` = tappable. Use it to find
  coordinates instead of guessing from screenshots.

Phone: 1080 × 2408, density 2.8125 (1 pt ≈ 2.81 px), font scale 0.9. Tab bar centres today: y ≈ 2260;
x = 108 / 323 / 540 / 755 / 970.

---

## 1. Design spec (the rules every phase follows)

### 1.1 Type (S7, X4, D1, D13)

| Role | Size / line | Weight | Use |
|---|---|---|---|
| Large title | 34 / 40 | 900, -0.8 tracking, display face | Screen titles, greeting |
| Title 1 | 28 / 34 | 800 | Hero names (session, dish) |
| Title 2 | 22 / 28 | 800 | Section headings ("Today") |
| Headline | 17 / 22 | 700 | Card titles, list titles |
| Body | 17 / 24 | 500 | Coach lines, meal names, descriptions |
| Callout | 15 / 21 | 500 | Secondary lines, values |
| Footnote | 13 / 18 | 500 | Helper text, timestamps |
| Label | 12 / 16 | 800, uppercase, +0.08em | Eyebrows ("STEPS") |
| Tab label | 11 / 13 | 700 | Tab bar only |
| Big number | 34–56 | 900, display face, tabular | Rings, stats |

- Put these in `components/ui/Typography.tsx` as `LargeTitle, Title1, Title2, Headline, Body, Callout,
  Footnote, Label, BigNumber`. New code uses them; old raw `fontSize` usage is migrated screen by screen.
- **Display face (X4):** load with `expo-font` (no native rebuild). Candidates, all free: General Sans or
  Satoshi (Fontshare, user downloads the files into `assets/fonts/`), or from Google: Bricolage Grotesque,
  Onest, Schibsted Grotesk. Show the user a screenshot of Home title + big numbers in 2 candidates and let them
  pick. Inter stays for body.
- Every number that can change uses `fontVariant: ['tabular-nums']` (D1).
- Units: value and unit separated by a thin space (` `), unit in `textMuted` at weight 600 (D13).
  Formatting helpers in `lib/format.ts`: `kcal(n)`, `kg(n)`, `litres(ml)`, `steps(n)`, `time(date)`,
  `dayLabel(date)` → "Sunday 8 Nov" (D12). Times in text: "6:00 pm"; on the timeline column: "18:00".

### 1.2 Buttons (S4, D6, D7)

Three tiers, nothing else:

1. **Filled**: one per screen or sheet. Gradient in the area colour (`accent` → `accentDeep`), inner top
   highlight `inset 0 1px rgba(255,255,255,.2)`, coloured glow below. Heights 54 (lg, r16) / 44 (md, r12).
2. **Tinted**: 12 % fill of the area colour, label in the bright area colour, **no border**. Same sizes.
3. **Plain**: text in the area colour, 44 pt tall hit area, no background.

- Delete the `secondary` outlined look and the `ghost` bordered look from `components/ui/Button.tsx`;
  map old variants: `secondary`→`tinted`, `ghost`→`plain`, `inverted`→`filled` with white.
- Destructive: tinted red or plain red, never filled red.
- Labels never ellipsize: if a label can be long, shorten the copy (D6). Add a dev-only `console.warn` when a
  Button label measures wider than its box.
- Pressed state everywhere (D7): `PressScale` at 0.97 + 8 % brighten, 120 ms. Every tappable card uses
  `PressScale`, never bare `TouchableOpacity`.

### 1.3 Frame (S1, S2, S3, S5, S6, D14, D16)

**Title bar (S1, S2, H1).** Replace `components/ui/AppHeader.tsx`:
- Left: 32 pt logo tile in the tab's colour (`TAB_ACCENTS`) + the screen's **large title** (34) on tab screens.
  On Home the large title is the greeting and the bar shows the date ("Sunday 8 Nov") instead.
- Right: pen button (opens `/week-review`, orange dot when there are unseen marks) and the avatar
  (opens `/profile`). No bell.
- On scroll past 40 pt the bar collapses to 44 pt: title shrinks to 17 Headline, background becomes frosted
  (`expo-blur`, tint dark, intensity 40) with a hairline bottom border. Reanimated scroll handler; each tab
  screen passes its scroll value through a small context (`lib/useCollapsingHeader.ts`).
- Remove the word "CLAWW" from in-app chrome (keep on splash, sign-in, share images).

**Tab bar (S5, F1).** Replace `components/ui/TabBar.tsx`:
- Floating capsule: left/right 12 pt, bottom = `insets.bottom + 8`, height 64, radius 26, `BlurView` (dark,
  intensity 50) over `rgba(22,22,26,0.72)`, 1 px `rgba(255,255,255,.10)` border, top inner highlight,
  shadow `0 18 30 -12 rgba(0,0,0,.9)`.
- Tabs: Home, Train, [+], Food, Progress. **More is removed** (P1: avatar opens Profile). Route names stay
  (`index`, `workouts`, `nutrition`, `tracker`); only labels change. `more.tsx` content merges into Profile.
- Active tab: a pill behind icon+label (radius 16, 16 % of the tab colour, 1 px ring at 35 %) that **slides**
  between tabs (Reanimated `withSpring`, damping 18). Icon 22 pt, label 11.
- Centre +: 48 pt rounded square (r16), light gradient `#F4F4F5 → #D4D4D8`, dark plus icon, opens Quick log.
- Hides on scroll down (translateY to off-screen, 220 ms), shows on scroll up and at the top of the list.
- Every tab screen's bottom padding = bar height + bottom inset + 16 (`useTabBottomPad`).
- Mini workout player docks **above** the floating bar (same horizontal insets, radius 20).
- Android system nav bar and status bar: transparent, light icons (D14, `expo-system-ui`/`StatusBar`).

**Back and close (S3).**
- Pushed screen → `BackTile` (chevron-left, 44 pt) top left. Title beside it.
- Full-screen modal (scan, player, meal log, chart detail) → × tile top left.
- Sheet → grabber, swipe down to close, no ×. If the sheet saves, the filled button says what it saves.
- Diary, chart screens and any screen without a control get the right one. Android back always matches.

**Sheets (S6).** Everything small opens in `components/ui/BottomSheet.tsx`: sleep (replace the centred modal in
`SleepLogModal.tsx`), water, steps, streak, food search, exercise guide. Sheet: radius 28 top, grabber,
24 pt side padding, content on the sheet's own surface (no card inside a card).

**Accent per tab (D16).** Each tab's top light, logo tile, active pill and filled buttons use its colour:
Home blue `#3B82F6`, Train blue, Food green `#22C55E`, Progress teal `#2DD4BF`. Food actions are always green.

### 1.4 Motion and haptics (D2, D3, D11, D15, X1)

- Haptics map in `lib/haptics.ts`: `tick()` tab change / segmented / stepper; `success()` any log saved;
  `warning()` undo shown / destructive confirm; `heavy()` PR and session complete.
- Count-up (D2): `components/ui/CountUp.tsx`, Reanimated, 700 ms ease-out, from the last shown value
  (keep it per key in a module map so returning to a tab doesn't replay from 0).
- Screen entry (D11): cards `FadeInDown` 8 pt, 40 ms stagger, max 6 items; respect reduce-motion.
- Splash → Home (D15): logo glow cross-fades into Home's top light (keep `SplashIntro.tsx`, change its exit).
- Pen write-on (X1): Skia path with an animated `end` (0→1, 900 ms) for handwritten lines, generated from
  the Caveat glyph outlines (`Skia.Font` + `getPath`). Only the first time a given line is seen
  (`AsyncStorage` key per line hash). Struck-through weights draw their line the same way.

### 1.5 Light (X2, X3)

- Time-of-day top light (X3): `lib/ambient.ts` returns the glow colour by hour (05–09 amber `#F59E0B`,
  09–17 tab colour, 17–20 `#FB923C`, 20–05 indigo `#818CF8`), mixed 50/50 with the tab colour.
- Tilt light (X2): on hero cards only (session card, Daily progress, PR moment). `expo-sensors`
  DeviceMotion at 30 Hz → Reanimated shared values → a Skia radial highlight that moves ±12 % across the
  card. Pause when the screen is not focused. Off under reduce-motion and in low-power mode.

---

## 2. Phases

Each phase: build → tsc + tests → device screenshots of every changed screen → commit → push → PR.
End each phase with a short report to the user listing what changed, with 2–4 screenshots.

### Phase 1 · Fix what is broken (`premium/01-fixes`)

| ID | Task | Where |
|---|---|---|
| B1 | Session tile opens Workouts on today's session (or rest-day card). Give it a real `onPress`. | `app/(tabs)/index.tsx` (where `HomeStatTiles` gets `session`), `components/HomeStatTiles.tsx` |
| B2 | One week. Remove the bottom "This week" calendar from Workouts (the strip at the top is the week); keep "View month" as a plain link under the strip. If the calendar stays anywhere, its week starts Monday and today is today. | `components/WorkoutCalendar.tsx` (`startOfWeek` uses Sunday), `app/(tabs)/workouts.tsx` |
| B3 | × on the mini player and in the full player asks "End workout?" with **Save and finish** / **Discard** / Cancel (in-app sheet, not `Alert`). Discard shows an undo toast for 5 s that restores the session. | `components/LiveWorkoutPlayer.tsx:224`, `lib/workoutSession.tsx` |
| B4 | Session hero gets a filled **Start** button. "Preview" becomes a plain link that opens the exercise list sheet. Missed-day card's button reads "Do it today". | `app/(tabs)/workouts.tsx`, `components/workouts/PlanTile.tsx` |
| B5 | One XP scale: Tracker ring shows level progress (xpIntoLevel / 100) like Profile, with "Level 9" inside (T3). Drop the separate /1000 score or relabel it clearly. | `app/(tabs)/tracker.tsx:120-160`, `app/profile.tsx:122-199`, `lib/data.ts:1516` |
| B6 | "Now" only when the current time is inside the meal's window (±60 min of its time); otherwise "Next · 8:30 pm". | `components/home/TodayLine.tsx:66`, `lib/todayLine.ts` (+ test) |
| B7 | No cut-off labels: audit every `Button` and pill for `numberOfLines` truncation; shorten copy. | grep `numberOfLines={1}` in buttons |
| B8 | Streak calendar: planned rest days count as kept (colour like done, lighter), explain Exam week in one line, legend matches the colours used. | `components/StreakSheet.tsx`, `lib/planStreak.ts`, `lib/streakData.ts` |
| B9 | Recent foods de-duplicate the unit/name ("5 idli", not "5 idli Idli"); "Photo or describe" button green. | `components/nutrition/FoodSearchSheet.tsx`, reuse `itemText` from `lib/mealPlanMeal.ts` |
| also | Steps goal chips ask before changing the goal (tinted confirm row). Steps sheet shows the chart by default; hour axis 0–24. Diary gets a back tile and its empty state points at its own +. | `components/StepsSheet.tsx`, `app/diary.tsx` |

Device check: Home tiles (tap each), Workouts top to bottom, start + end a session (Discard → Undo works),
Tracker ring, streak sheet, food search, diary back.

### Phase 2 · The frame (`premium/02-frame`)

S1, S2, S3, S4, S5, S6, S7 (type components), D3, D4, D6, D7, D12, D13, D14, D16 as specified in section 1.
Order: tokens + `lib/format.ts` → Typography → Button tiers → TabBar → AppHeader (collapsing) →
back/close sweep → sheets (sleep to a sheet) → haptics + undo toast (`components/ui/Toast.tsx`, one global
host in `app/_layout.tsx`) → profile absorbs More (P1).

Device check: every tab at top and scrolled; one pushed screen, one modal, one sheet per tab; tap every
button tier; check that nothing sits under the floating bar.

### Phase 3 · Home (`premium/03-home`)

H1 (done by the frame), H2 greeting 34 + coach line 17 with bold numbers + pen line, H3 coloured ring tracks
(14 % of each colour) and glow at zero, H4 remove captions under the rows and show "32% of today" top right,
H5 three identical tiles (icon chip 24 pt, label, number, bar; Today tile shows Rest / 6 pm / Done, never
truncates), H6 session card in three states (training / rest / done; specs in the review page section 3),
H7 timeline with time column 44 pt, nodes by type, "Today" heading + "Plan ›" outside the card, H8 marks
card leaves Home (pen button shows the count), H9 water: eight segments + gradient + button, long-press for a
custom amount. Remove the duplicate sport card from Home (it lives in Quick log now).

Device check: morning / evening states (change the phone time or mock `useNow`), training day vs rest day
(use a test plan), logged vs not logged.

### Phase 4 · Train (`premium/04-train`)

W1 one-line old-builder notice, W2 week strip with dots (done ●, planned ○, rest –, today glows; no red
struck labels), W3 hero with `BodyMap` lit for target muscles + Start (B4), W4 exercise rows with a 44 pt
thumbnail (muscle icon until demo clips exist) and last week's weight in grey, W5 Regenerate / Change days /
Swap in a ··· menu. Sport card moves to Quick log.

**X5 calmer player** (`components/player/FullPlayer.tsx`): three states, one action each.
- *Lift*: exercise name (Title 1), set "2 of 3", huge weight × reps (BigNumber 56), steppers under it,
  one filled **Done** (54 pt, bottom). How to / Swap behind a ··· button. Coaching line as one pen note.
- *Rest*: full-screen ring countdown, next set preview, +30 s / Skip as tinted buttons.
- *Next exercise*: a 2 s interstitial card, then Lift.
- Remove the duplicate tick-per-set control; the set list becomes a small progress row at the top.

F3 workout in the notification (`lib/liveActivity.ts`, `lib/restNotification.ts` already exist: make the
ongoing notification show exercise, set and rest countdown with Done/Skip actions), F4 haptic at 10 s left and
at 0, works with the screen off (scheduled notification with vibration).

X6 PR moment: when a set beats the best e1RM, a full-screen card with the pen-marked number, `heavy()`
haptic, share button (`lib/shareCard.ts`).

### Phase 5 · Food and Progress (`premium/05-food-progress`)

N1 full-width green **Scan a meal**, Search + Diary as tinted half buttons, N2 meal cards with a round photo
(user's past scan for that dish, else an illustration from `assets/food/`, else the meal-type icon),
N3 macro bars in colour (protein `#F472B6`, carbs `#F59E0B`, fat `#38BDF8`, check contrast), N4 missed
meals collapse into one "Catch up on 2 meals" row opening `/catch-up`, N5 dish names follow the scaled
amounts (`lib/mealPlanMeal.ts`; ask the user before renaming templates in the database).

T1 strength chart: line between points, a label per week, a single point shows as a value. T2 consistency
grid fills the card width with month labels. T3 level ring (done in B5). T4 Progress tab grouped into
"This week", "Strength", "Body" with Title 2 headings. Adaptive questionnaire opens in a sheet instead of
expanding inline.

P2 achievement medallions: Skia-drawn metal disc with the area colour glow and a stroke icon; locked =
dark silhouette. P3 settings as inset groups with coloured 44 pt icon tiles and values on the right.

### Phase 6 · Signature layer (`premium/06-signature`)

X1 pen write-on, X2 tilt light, X3 time-of-day light, X4 display face (user picks from screenshots),
D2 count-up, D8 skeletons sized like their cards, D9 empty states (what will appear + one button),
D10 pull to refresh with the logo tile spinning, D11 transitions, D15 splash to Home.

### Phase 7 · New features (`premium/07-features`)

Do JS-only features first, then one native rebuild for the rest.

| ID | Feature | Notes |
|---|---|---|
| F1 | Quick log sheet from the centre + | Meal (scan / search / same as yesterday), water (+250 / +500), sleep, weight, activity (the sport chips). Most recent first. |
| F5 | Weekly recap story | Sunday 6 pm notification → 4 full-screen cards (sessions, protein days, best lift, streak) with share. `lib/recapData.ts` exists. |
| F6 | Streak freeze | One missed planned day per week is forgiven if the user taps "Use a freeze"; shown as a frost dot. `lib/planStreak.ts`. |
| F8 | Weight trend | 7-day moving average line over daily dots on Progress. `getWeightLogs` in `lib/data.ts`. |
| F9 | Barcode scan | `expo-camera` already supports barcodes (no new dep). Look up Open Food Facts by barcode (public API, no key), cache the result. |
| F7 | Progress photos | Private Supabase storage bucket + table with RLS (migration), monthly reminder, side-by-side compare. Ask the user before creating the bucket. |
| F2 | Home-screen widget | **Native.** `react-native-android-widget` + config plugin: rings + water, tap + to add 250 ml. |
| F10 | Say what you ate | **Native.** `expo-speech-recognition`; transcript goes into the existing describe-a-meal flow. |

Native batch (one dev build + one preview APK): F2, F10, and anything else that needs a plugin. Tell the user
before starting the build (~25 min) and keep working on JS tasks while it runs.

### Phase 8 · Store readiness (`premium/08-ship`)

Onboarding pass with the new frame, empty and offline states on every screen, TalkBack labels on every
control (`ui.py` shows unlabeled tappables), Sentry on, store screenshots from the device, listing copy,
final preview APK.

---

## 3. What the user may provide (ask once, don't block)

- Display font files if they pick General Sans or Satoshi (Fontshare).
- Licensed exercise demo clips (replaces "Demo clip coming soon").
- 50 Indian dish photos or illustrations for meal cards.
- A Rive file for the pen effect (optional; Skia version is planned anyway).
