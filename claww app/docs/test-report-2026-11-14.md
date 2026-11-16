# Repeated-action test report, 2026-11-14

Test phone: the connected Android (Samsung, Android 15, no haptic engine), a preview build with the native haptics module.
Driven by adb taps the way a person would: rapid double and triple taps, mashing one spot, hopping between tabs, backgrounding, force-closing, opening and closing sheets over and over. Nothing here was run on iOS.

## How much was covered

I made three working passes over the app (Home and Food, Train and the player and activities, Progress and Profile and Settings and the deep-linked screens), then a fourth pass on the new build to check the fixes. That is **not** every screen at five repetitions each, and this report says where it stops (see "Not tested").

## Fixed in code (typecheck clean, 1006 tests pass)

| # | What a person does | What went wrong | Fix |
|---|---|---|---|
| 1 | Sets bedtime 12:30 AM on the sleep sheet (hour, then AM/PM) | The wheels applied each change to the *starting* time, so only the last change stuck: 11:30 AM, 22 h "Excess" | `TimeWheelPicker` keeps the running value |
| 2 | Logs a night, then corrects it | "Saving again replaces it" was untrue: a new row was added and the one with the later wake time won, so after an app restart the wrong 10 h came back | The entry typed last wins (`lastNightSleep`) |
| 3 | Opens the sleep sheet after logging 6:58 | Prefill rounded to 6:00, losing nearly an hour | Rounds the whole time to 5 minutes |
| 4 | Logs a wake time still ahead of now (1 AM, about a 9 AM wake) | Wake landed in the future | `sleepWindow` treats it as yesterday; 8 timings are tested |
| 5 | Taps a "usual" food three times quickly | Three meals logged: the day went 2,380 to 4,966 kcal | One tap, one meal |
| 6 | Double-taps "Start Cricket" | Started and finished at once: a fake 1-minute, 0 kcal session logged, and finishing had no re-entry guard | Under 30 s is discarded, finish runs once |
| 7 | Double-taps an exercise in "Add exercise" | Could add it twice | Guarded |
| 8 | Reads "1 sets", "2 of 1 sets" | Wrong plural in 7 places | `setsLabel` helper, tested |
| 9 | Eats over target with 3-digit macros | "Protein267" ran into its label | Gap added |
| 10 | Opens Settings with notifications blocked by Android | Switch said "Reminders on" while nothing could ever arrive | Switch now reflects the real permission and says it is blocked |

## Second round: the twelve open items, now fixed (typecheck clean, 1016 tests pass)

| # | Item | Fix |
|---|---|---|
| A | A force-closed app lost the live workout | The session is saved to the phone as it changes and restored on launch as the small bar, with no intro; sessions older than 12 h are dropped (`lib/liveSessionStore.ts`, tested) |
| B | A double tap on "Close without finishing" fell through onto the + button | Every sheet now keeps an invisible, touch-swallowing backdrop for a beat after it closes |
| C | A weighted lift could be logged at 0 kg with no warning | The first tap asks ("No weight set, tap to log anyway"); the second logs |
| D | Week review said "6 of 6 sessions" and pushed missed days around | Sessions count distinct plan days (never more than the plan has); a missed day only moves forward in this week, never to today, a past day, or next week (tested) |
| E | Re-logging sleep earned +10 XP every time | XP only for the first entry of the day |
| F | No sleep row on Home after logging | The sleep row is always shown (hours, quality, times, last 7 nights, tap to edit) |
| G | "16 of 14 sets" | Shows "16 sets done" when more were logged than planned |
| H | Steps chart opened on Month while the card was on Week | Steps open on the week |
| I | "Protein 263 %" read "on track" | Over 140 % reads "well over" |
| J | The Adaptive card said "Legs B today" during a Pull session | While a session is running the card follows that session |
| K | Profile (and Settings, About, Week review, Diary) scrolled under the status bar | A solid strip keeps the clock and battery readable |
| L | Coach text "17.5 kg to 17.5 kg"; empty gap in the player | A deload always steps down at least one notch and the text says so (tested); short content is centred above the rulers |

## Things my testing changed in your account

- **Reminders is now off** in Settings. My toggle spam asked Android for notification permission; I dismissed the prompt without choosing. Notifications are blocked for CLAWW on this phone, so reminders could not have arrived before either.
- Test data: three duplicate "Soya chunks curry" lunches, an extra chai snack, a dinner, 1.5 L of water, a 1-minute Cricket session, five 0 kg Pull sets, two sleep entries (11:30 PM to 9:30 AM, and 12:30 AM to 7:00 AM), Legs B marked done, a few XP.

## Held up well

Water taps (6 quick taps = 1.5 L), quantity stepper limits, search then "Check and log" (triple tap logged once), double-tapping "As planned" (logged once), double-tapping "Done" on a set (logged once), mashing Skip rest and Done through a whole exercise (no extra sets), 40 random tab hops (no error), backgrounding for 20 s and returning (session intact), repeated open and close of the Progress chart, Day/Week toggle spam.

## Haptics

Confirmed in the phone's vibrator log: 12 ms per mark, 22 ms on labelled marks, 8 ms on grab, all played as touch feedback by the native module. This phone has no haptic engine, so it uses the short-pulse tier. How it feels needs a thumb.

## Not tested

Onboarding and login (the audit comes last), the camera scanner and barcode (camera permission not granted), offline mode (needs a system setting), Health Connect, the lock-screen buttons, iOS, a slow phone.
