# NG PHASE 14 audit: states, offline, accessibility, performance

Written 2026-11-05 on `ng/phase-14-states-a11y-perf`. "Done" means the code is in this branch; nothing here is device-tested.
The five states are loading (skeleton in the real layout), empty (one-tap answer), offline, error (says what was saved)
and first day. Counts come from reading the code, not from running the app.

## 1. Offline: what is queued now

| Write | Before | Now |
| --- | --- | --- |
| Workout sets | queued (V2 PHASE 2.5) | unchanged |
| Meal logs (search, usual, plan, scanner, catch-up) | lost if the insert failed | stored on the phone first with its own id, sent from there; columns an older database lacks are dropped on the way; XP is awarded when it is really saved |
| Water | lost if the insert failed | same |
| Sleep | lost if the insert failed | same |
| Pen mark decisions (Keep / Undo) | lost | same |
| Meal photo upload | not queued | **still not queued**: the meal is saved with its photo path only when the upload worked |
| Profile edits, nutrition targets, plan generation | not queued | **not queued** (they need the server) |

The queue is `lib/setQueue.ts` made generic (`createSetQueue<P>`) plus `lib/writeQueue.ts` and `lib/writeQueueRuntime.ts`.
Reads merge what is still waiting (`getTodaysMealLogs`, `getMealLogsBetween`, `getTodaysWaterLogs`, `getTodaysWaterMl`), so a
meal logged offline still counts on screen. The `OfflineBanner` (root layout) says "Offline. What you log is saved on this
phone and sent when you are back." and "Sending N saved items." It never blocks a touch.

## 2. Screen by screen

`S` loading skeleton, `E` empty with an answer, `O` offline covered by the banner and the queue, `X` error that says what
happened, `D` first-day version. Yes = present in the code today. Gaps are real; this branch closes the offline column, not the others.

| Screen | S | E | O | X | D | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Home | yes | yes (first-day cards) | yes (logs queue) | no | yes | no error card when the profile or plan fails to load |
| Workouts | yes | yes | sets only | yes (regenerate) | yes | |
| Nutrition | yes (targets) | yes (set up your meals) | yes | no | yes | plan load failure shows no plan, not an error |
| Tracker | yes | yes (locked previews) | reads need the server | no | yes | |
| More, Settings, About | n/a | n/a | n/a | no | n/a | static |
| Food diary | yes | yes | merges queued meals | no | no | |
| Catch-up | yes | yes | yes | yes (save failed) | n/a | |
| Weekly review | no | yes | decisions queue | no | n/a | no skeleton while marks load |
| Scanner, check | no | n/a | **no**: needs the server to read the plate | yes | n/a | offline it should offer "Log by name"; not built |
| Meal log (describe) | no | n/a | needs the server to estimate | yes | n/a | |
| Workout player | n/a | n/a | yes (sets queue) | n/a | n/a | |
| Session complete | no | n/a | yes | no | n/a | |
| Workout setup, Nutrition setup | no | n/a | needs the server | yes (generate) | n/a | |
| Profile | yes | n/a | no | yes | n/a | |

**Left for NG 14 part 2 (needs a phone to judge):** skeletons for the weekly review, scanner and session-complete; error cards
for Home, Nutrition and Tracker loads; the scanner's offline "Log by name"; queuing the meal photo upload.

## 3. Accessibility

Done:
- A scan (`scripts` were run once, not kept) found every `Pressable`, `TouchableOpacity` and `PressScale` with no text and no
  label. 20 icon-only buttons now have `accessibilityRole="button"` and a label (Back, Close, Increase, Decrease, Edit the
  estimate, Remove the photo, the water buttons) and a 6 px `hitSlop` where the visible button is under 44 px. `IconButton` now
  requires a `label`.
- Colour contrast: NG PHASE 1's tests already assert 4.5:1 for every text token on every surface.
- The offline banner is an `alert` with a polite live region.

Not done, needs a phone:
- Font scale 1.3x on every screen (layouts that clip), focus order with a screen reader, and text under 11 px outside the cards
  NG PHASE 1 covered. No `maxFontSizeMultiplier` was set; the first 1.3x pass will show where one is needed.
- The Skia rings and charts have no text alternative beyond their legends.

## 4. Performance (target: Home first paint under 1 s, 60 fps scroll, set tap under 100 ms)

Not measured. `lib/perf.ts` and Settings > Speed numbers (NG PHASE 0) record set latency and Home first paint on a preview
build; the numbers have to come from devices A and B. Nothing was changed here for speed. Candidates to check first when
the numbers exist: Home runs several loads in parallel on focus (plan prescription, pen-mark sync, streak, tiles); the
trend reader now runs from Home (at most every 10 minutes); the Tracker loads a year of sets once.

## 5. Acceptance

- "Airplane mode through a full workout and two meal logs loses nothing": sets, meals, water, sleep and pen decisions are
  queued and tested (`lib/writeQueue.test.ts`, `lib/setQueue.test.ts`). **Not run on a phone.** The meal photo is the known hole.
- "Every screen has all five states": **not met** (section 2).
- "Targets in 5.6 met": **not measured**.
