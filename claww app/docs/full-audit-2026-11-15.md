# Full audit (2026-11-15 and 16): every layer

Skills used: react-native-best-practices, vercel-react-native-skills, design:accessibility-review, design:ux-copy, security-review, engineering:testing-strategy.
Method: type and test run, secrets and pattern scans, live database checks (read-only), every screen opened by link (20 routes), every tappable control on the four tabs tapped (about 100 taps, including ones that save data), 40 rapid tab taps and 20 fast swipes, accessibility tree dump on each screen.
Nothing in the app code was changed by the audit. (Three small edits made earlier in the session are listed at the end.)
**Not yet reviewed (waiting for you):** the camera flows: meal scan, barcode, and the check-the-items screens, with real photos and packets.

## What held up
- `tsc` clean, 1,034 tests pass. No crash and no JS error in about 100 taps, 40 rapid tab taps and 20 fast swipes (the `FATAL EXCEPTION` lines in the log were my own dump tool, not the app).
- RLS on all 29 tables, every policy owner-scoped; both photo buckets private with policies; all 9 functions check the caller.
- No secrets in the repo; the Supabase key hygiene script keeps keys out of files.
- Every clickable control on every screen has a label (0 unlabeled in 24 screens, except 1 row in Settings).
- No dead buttons, no placeholder copy, no emoji or "AI" wording, no text under 11 px.

## Bugs and inconsistencies (what a user can see)
| # | Where | What | Layer |
|---|---|---|---|
| B1 | Recap vs Week review | Recap says "6 of 6 sessions, every planned session done"; Week review says "5 of 6"; Train says Monday's Pull is still open. `recap.tsx` counts every completed event; `weekReview.ts` counts distinct days capped at the plan | logic |
| B2 | Home vs Train | Same session: Home "~42 min", Train "~35 min". Home works out minutes from the plan's raw sets, Train from the engine's sets. Plan story page also says 42 | logic |
| B3 | Home hero | Sets show 15, then 14 once the engine loads; the coach line changes ("150 g protein left" becomes "136 g", an extra sentence appears) and the page jumps down about 20 px | UX |
| B4 | Food | Today's plan says 3,016 kcal and 171 g protein; the target is 2,734 kcal / 136 g; the meal-setup sample day says 2,741 kcal. Three different numbers. A saved plan keeps the old target after a calorie mark changes it | logic |
| B5 | Food | Skipped meal card reads "Breakfast · 11:27 pm · skipped" (the time of the tap) and the card repeats itself ("Skipped / no meal") | UI |
| B6 | Food search | The Recent list contains the word "Skipped" as if it were a food | logic |
| B7 | Diary | "Micronutrients 0 kcal · 1 entry" next to "Nothing logged yet today": the skipped meal counts as an entry | logic |
| B8 | Week review | Notes read "missed 2 Thus", "missed 2 Fris" (stored marks written before the wording fix; new marks use full names) | data |
| B9 | Progress | Personal bests show "Dumbbell Bent-Over Row · Bodyweight × 8" and "Leg Curl Machine 10 kg" mixed with bodyweight: loaded exercises were saved at 0 kg (151 of 210 sets in the database have weight 0) | data |
| B10 | Progress chart | Strength chart, Month view: two dots and no line although three lifts have data | UI |
| B11 | Settings | "Workout plan generations 0/20": plan generation no longer uses a model or a cap, so the row is meaningless | UX |
| B12 | Workout complete | Opening it by link with no session shows a celebration with 0 sets, 0 min, 0 kcal, "+0 XP" and a 5-day streak | edge |
| B13 | Copy | "progression blocked and one set fewer", "1 more to answer · 2 in the day", "Push (2)", "Pull (2)" labels, "From your watch when you wear it, your phone otherwise": engine-speak or unclear | copy |
| B14 | Reminders | Reminders switch is off; no reminder can fire (already known) | state |

## Security
| # | Finding | Severity |
|---|---|---|
| S1 | `generation_usage` has a read-and-write policy: a signed-in user can delete their own rows and reset the daily meal and plan caps (cost abuse). Make it read-only for users; write only through the counter function | medium |
| S2 | `SCANNER_LAB` secret: while it is `on`, any signed-in user sending `only` in the scan request skips the daily cap. Confirm it is off or unset in production | medium |
| S3 | `check_and_increment_generation_usage` callable by any signed-in user (advisor); it only raises their own counter | low |
| S4 | Leaked-password protection is off (Supabase Auth, one switch) | low |
| S5 | `pg_net` extension in the `public` schema | low |
| S6 | `xp_events` and `user_stats` are writable by their owner: a user can give themselves XP (affects only their account, no leaderboard) | low |
| S7 | Image uploads to the scan functions are only checked to start with `data:image/`: no size ceiling (already on the open list as SHIP 10.2) | low |
| S8 | Debug screen `screens/debug/ring-test` has no development-only guard, so it opens by link in a release build (the other two dev screens do redirect) | low |
| S9 | CORS `*` on functions: acceptable with bearer-token auth | info |

## Data layer (live database, read-only)
- Rows: 24 profiles, 210 sets, 84 meals, 306 water entries, 51 sleep entries, 31 pen marks, 22 day events.
- Good: no future-dated meals, no meal with 0 kcal that is not a skip, no duplicate set ids.
- 3 sleep entries are under 1 h or over 14 h (no check on input or in the table).
- 1 pair of same-type meals in the same minute (a double tap).
- Only 2 of 210 sets carry a reps-in-reserve answer, so that engine input is almost never used.
- 12 pen marks active; 2 plan-generation failures in 7 days.

## Accessibility and touch
- Under the 44 dp target (about 121 px on this phone, many are 107 to 113 px): Keep/Undo on Week review, As planned / Different / Skipped on Catch-up, schedule day chips, food chips, Small/Regular/Large, Cards/List, Search/Barcode buttons, header Week review and Profile buttons. "Show all the questions" on workout setup is 57 x 101 px (about 21 x 37 dp), the smallest in the app.
- One unlabeled clickable row in Settings.

## Performance and consistency
- Core `Animated` still in 6 files; `Image` from react-native in 10 screens; 45 scroll views and 1 virtualised list; direct `expo-haptics` calls in 8 files next to the shared haptics file.
- 80 logic files have no test of their own, among them `data.ts` (1,974 lines), `workoutSession.tsx` (837), `adaptiveData.ts`, `penData.ts`, `planStreak.ts`, `steps.ts`, `mealPlanData.ts`. Covered indirectly only.
- Flags with no use left: `MEAL_PLAN_ENABLED` (0 references).

## Interaction notes (tap testing)
- Every control opened what it should: day strip, exercise guides, how-to sheets, meal plan options, cards/list toggle, Search, Barcode screen, Scan screen, share sheet, all six Progress chart screens, Adaptive card, Steps day/week.
- Saving actions run on the test account: meals logged as planned, one workout started and ended, marks kept and undone. Test data was added; clean-up is not done.
- Tabs: the first Home pass hit Train controls (tab bar position drifted after a sheet closed); coverage is complete but the per-tab labels in the run log are shifted by one.

## Meal logging tests (describe and photo scan, on the phone, 16 Nov 00:05 to 00:15)
Describe "2 idli, sambar and a cup of chai": 334 kcal, saved with 3 items, micronutrients and the estimate flag.
Photo scan of a South Indian thali (a photo of a screen): read as "South Indian thali" with 6 foods; saved 1,095 kcal / 32 g protein, 7 items including 2 tsp hidden oil, photo uploaded to the private bucket, answers saved in `context`, correction row written (7 in total).
| # | Finding |
|---|---|
| D1 | "a cup of chai" read as an item "cup of chai", not matched although "Chai with sugar/without sugar" exist (the words "a cup of" are not stripped) |
| D2 | The "pick the closest food" sheet opens pre-filled with the unmatched phrase and says "Nothing found" (same for "vegetable stir fry"); the way out is to type a shorter word, not hinted |
| D3 | While an item is unmatched the total leaves it out but the meal still shows "Good/Okay" and its item count includes it |
| D4 | Search for "chai" lists "Lemon sevai"; "vegetable" lists "Dalia porridge" (loose matches) |
| D5 | One-tap "Log" chips save 0 items and no micronutrients (search, describe and scan do), so diary micronutrients undercount |
| D6 | Sambar 1 katori (150 g) = 127 kcal looks high; for the nutritionist |
| D7 | Two identical meals a minute apart are allowed with no warning |
| D8 | Scan: the potato curry was mapped to plain "Potato" (62 kcal for 80 g, boiled) although "Aloo sabzi" (119 kcal per 100 g) exists: likely undercount |
| D9 | Scan: the meal-type pill started on Breakfast (scanner pill said Breakfast 12:10 am) and moved to Lunch on its own once the result loaded; the rating text still talks about "Dinner adds some protein" |
| D10 | Scan questions: the last option in each row (Street, Heavy, Shared) is cut off at the right edge; "Same as last time" says Restaurant but Home is pre-selected |
| D11 | The floating "Pick a food for each item first" button covers the last rows while scrolling |
| D12 | "Read by groq:..." shows on the scan check screen in preview builds (it is hidden in production; the preview profile turns dev tools on, so testers see it) |
Barcode (Kit Kat 18 g, 8901058001846, scanned off a screen):
| # | Finding |
|---|---|
| BC1 | The app says "Not found. Try another packet, or log it by name." but the product exists in Open Food Facts ("Kitkat", Nestle); its entry has no calories, only a NOVA group. "Found, no nutrition" and "not found" show the same message |
| BC2 | The message says "log it by name" but the screen offers only Back: no button, no search, no describe link (dead end) |
| BC3 | `lookupBarcode` returns "not found" on any network error or server error too (no timeout, no separate "could not reach the lookup" message), so offline or a slow server reads as a missing product |
| BC4 | Coverage for Indian packets is thin. Eight common Indian packet codes tried against Open Food Facts: 5 not found, 2 found without calories (Kit Kat, Sunfeast Dark Fantasy), 1 with calories (Lay's Classic Salted, 554 kcal per 100 g). Expect most scans to miss; a fallback (photo of the label, or by-name search) matters more than the scan itself |
| BC5 | The camera screen has no torch, no "enter the number" option and no tap-to-focus hint; a blurred barcode (as here, off a screen) keeps the app on "Point the camera at the barcode" with no feedback |
Barcode that has nutrition (Lay's Classic Salted 20 rs, 8901491101837, and the user's own scan of "Molina"):
| # | Finding |
|---|---|
| BC6 | Product sheet defaults to 100 g (554 kcal) because Open Food Facts has no serving size for it; a 20 rs bag is about 26 g, so the default overstates by 4x. No "1 pack" option; the amount steps by 10 g (10 taps to move 100 g) |
| BC7 | A faint "Looking it up..." line stays visible behind the macro line (554 kcal . P 7 g ...) after the product loads |
| BC8 | Barcode meals save with 0 items, no micronutrients and `estimated = true`, although label numbers are not an estimate; the diary shows no micronutrients for them |
| BC9 | While stepping the amount down quickly, the sheet closed and the Lay's was logged at 50 g (277 kcal, rated Poor) without the "Log as snack" button being pressed by hand (observed during scripted fast taps; not reproduced by hand, so treat as unconfirmed tap-through) |
| BC10 | Product names come straight from the database ("Lays Classics Salted 20rs", "Molina"), including price text; no cleaning |
Not yet tested by hand: retake, offline scan, a photo that is not food, a barcode with no network.

## UI, UX and motion review (design skills: apple-design, design-critique, design-system, find-animation-opportunities, improve-animations)
Looked at: every tab, 20 routes, the three camera flows, the quick-log sheet and the player (intro and session), at full size and in contact sheets.

**What is already premium**
- A real identity: near-black ground, glass tab bar and header, one hue per area (blue train, green food, teal recovery, amber steps), big tabular numbers, handwritten coach notes (Caveat) used only for the coach's voice.
- Direct manipulation: the dial rulers for kg and reps, card decks that move with the finger, a rubber-banded tab swipe, a draggable player.
- Honest copy in many places ("Values are from the food database and are still being reviewed").
- The hidden-oil line on the scan result, the rise-in on first mount and nothing that loops.

**Where it falls short of Apple-grade**
| Gap | Evidence | What Apple-level looks like |
|---|---|---|
| No scale behind the spacing and type | 31 radii, 29 font sizes, 20 gaps, 301 typed colours | One scale; every value defensible |
| Flat typographic hierarchy | 13 and 15 px = 58% of text; tracking set in 153 places, not by size | 6 roles; tight tracking on large text, loose on small |
| Card monoculture | Food and Progress are stacks of equal rounded cards | One hero per screen; quieter groups; 24 to 32 px between sections |
| Dense player | 7 elements above Done; 0 kg default; clipped dial labels | One thing per moment: numbers, Done, and the rest one swipe away |
| Numbers that move after load | Home 15 to 14 sets; protein 150 to 136 g; page jumps | Content settles once, behind a skeleton |
| Same fact, different value | 42 / 35 / 37 min; 6 of 6 vs 5 of 6; 3 calorie totals | One source of truth |
| Motion with no scale | About 25 durations, 5 easing families | 4 durations, 3 curves, springs for touch |
| Blank gap in the tab slide | 170 ms out, 320 ms in, nothing between | Overlap the two; the next page arrives as the first leaves |
| Content under the glass bar | Ghost text below the bar corners | Scroll-edge fade behind floating chrome |
| Two press feels, two haptic vocabularies | PressScale vs dim in 10 screens; 8 files call haptics directly | One press, one haptic grammar |
| Dead ends | barcode not found, "Nothing found", empty complete screen | Always a next step |

**Ten moves that would take it furthest (in order)**
1. One token scale (radius, type, space, motion) and a lint that rejects typed hex and off-scale values.
2. One source of truth for session minutes, sets, weekly sessions and daily calories.
3. Settle-once screens: skeletons until the engine marks arrive; no layout jump.
4. Rebuild the player around two big numbers and one button; move the rest below the fold.
5. Overlap the tab slide and add a scroll-edge fade under the tab bar.
6. One press (scale 0.96, 120 ms) and one haptic grammar (select, commit, success, warning) everywhere.
7. Fix the three dead ends and the "incomplete total" states with a clear next step.
8. Hero-and-rest layout on Food and Progress: one lead card, calmer groups.
9. Touch targets to 44 dp and a font-scale 1.3 pass.
10. Shared-element moments for the few big transitions (home card to session, plan to week), springs with velocity hand-off.

**Motion rejected (not worth animating):** tab bar taps beyond the slide (100+ a day), the + button sheet beyond a short rise, list row presses beyond 0.96 scale, the Diary micronutrient numbers (data being read).

## What you may have missed (full list in the workbook, sheet "Not covered")
Onboarding and login never opened; no release-build numbers; font scale 1.3 and TalkBack; reduce motion; iPhone; a low-memory phone; the lock screen, widgets and push; Health Connect; food and workout content review by a nutritionist and a trainer; legal documents hosting and Play declarations; Sentry and PostHog keys; store assets; pricing; a competitor side-by-side; real user interviews; battery and heat; two devices on one account; time-zone and midnight edge cases.

## Edits made earlier in this session (not asked for; keep or revert is the user's choice)
1. `app/(tabs)/index.tsx`: Home minutes follow the engine's sets (B2).
2. `components/nutrition/MealCard.tsx`, `app/(tabs)/nutrition.tsx`: skipped meal wording (B5).
3. `lib/mealPlanData.ts`: a saved plan is rebuilt when the target changes (B4).
These were not seen on the phone (the dev client was not reading Metro).
