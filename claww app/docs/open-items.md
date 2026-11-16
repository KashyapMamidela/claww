# Everything not finished, in one list (2026-11-15)

Pulled from this session, `docs/premium-status.md`, `docs/test-report-2026-11-14.md`, the NG and SHIP phase notes in `CLAUDE.md`, and the memory notes. "You" means it needs a decision, an account or a device that only you have.

## 1. Finishing now (this session)

| Item | State |
|---|---|
| Added foods shown on the meal-setup summary | Done in code, typechecked |
| `generate-plan` with training styles and Easy / Standard / Hard | **Not deployed.** The safety check blocked the production deploy. Run `npx supabase functions deploy generate-plan --project-ref vaweeztulqvkciuqytyi --use-api` from `claww app`, or tell me to retry |
| Plan generation end to end on the phone | Waits for that deploy. Until then "Build my plan" would use the old generator |
| Tab slide-in, seen on a release build | Release build `e0566ad4` queued; check after install |

## 2. Built but only partly checked

- Tab swipe: only the current page moves while you drag (no live peek at the next tab). A true pager needs `react-native-pager-view` and a native rebuild.
- Card decks: you cannot start a page scroll on top of a deck (swipe from outside it). Swipe down in the player deck was not cleanly confirmed.
- New meal templates (43) and 17 new foods: written from the food database; the nutritionist has not reviewed them, and templates have no costs yet.
- Training styles: generated blueprints are `reviewed: false`; trainer review of the four style templates and the injury table is open.
- Workout calories use the gaps between logged sets (a quick session under-counts); no stored session duration yet.

## 3. Known small bugs

- Train hero numbers change after load (17 sets becomes 15) because the engine's marks arrive late.
- Tuesday (rest day) cell in the week strip sits about 10 px lower.
- Progress personal-best names are cut off.
- A grey patch showed behind Home's coach sentence once (looked like a stuck press state).
- Dev-mode only: first visit to a tab shows a long gap before the page appears.

## 4. Premium pass leftovers (`docs/premium-status.md`)

- D9 empty states, D10 pull-to-refresh with the logo (a native spinner is used), D16 top-light accent per tab, D14 Android navigation bar colour (native).
- N2 real photos on planned meal cards.
- F10 voice logging (native module). F9 barcode: a real packet was never scanned.
- Widgets: live update after logging, offline water tap, every size, large layout, midnight reset, picker previews.
- X4 display font was applied (Bricolage Grotesque); skeleton shapes done for Food and the tabs.
- Phase 8: onboarding pass, Sentry (needs your DSN), store assets, final APK.
- A 7 h test sleep entry from 8 Nov may still be in the database (see premium-status Phase 5).

## 5. Backlog you named earlier

- Log a set from the lock-screen notification.
- Coach morning note.
- Heat-aware water target.
- Gold notification with Pause.
- Yoga as a specialised workout type (you will describe it).
- Gemini migration, only if shortlisted.
- Buildathon deck re-upload (paused).
- Onboarding and login audit, last.
- UI/UX audit items (artifact `Um6qVm1wp2MVLKxrRCczUJ`): remaining signature ideas.

## 6. NG phases still open (`CLAUDE.md`)

- NG 0.4 baseline numbers on device B then A; NG 0.5 merge of PR #4 (you merge).
- NG 3.5 iOS Live Activity (needs an Apple Developer account and an iPhone); every iOS check.
- NG 9 scanner: choose the backup vision provider and set three secrets; collect 100 real Indian meal photos for accuracy; real-photo timing on a phone.
- NG 11: "Tell me more" long press to the Tracker chart; Workouts list and player target card still draw the engine's marks live, not stored ones.
- NG 13: Health Connect and HealthKit reads (sleep stages, resting heart rate, HRV, de-duplicated steps); writing workouts back.
- NG 14 part 3 (needs a phone): the five states on every screen, font scale 1.3, screen-reader order, all performance numbers.
- NG 4: food database is short of the 300 ingredients / 150 dishes target; nutritionist values, plus ICMR-NIN tables (licence unconfirmed). Micronutrient targets are US NIH values pending ICMR-NIN.
- Apply `docs/ng-pending-2.sql` if not yet applied (meal plan days, weight logs, scan corrections).
- NG 6: confirm dropping the editable-targets screen, or ask for a Targets editor.

## 7. V2 and SHIP phases

- V2 PHASE 10 (Telugu and Hindi, Indian meal photo evaluation, pricing at ₹99 to 199) deferred by you; ask before starting.
- V2 PHASE 11 (Blender demo videos) waits for clips.
- SHIP 10.2 photo size ceiling and per-minute rate limit; 10.4 React Native Testing Library; 10.5 accessibility pass (labels, contrast, font scaling).
- SHIP 11.4 onboarding conversion; 11.5 monetisation (RevenueCat).
- SHIP 12: device QA matrix, closed test (12 testers × 14 days), store listing, launch checklist.
- SHIP leftovers: Sentry DSN and PostHog key; legal documents need a human read and real hosting; Google sign-in consent screen must be published; Play Health Connect data-access declaration; CI never verified on a real GitHub run.

## 8. Not tested yet

Onboarding and login, camera scanner and barcode (permission), offline mode, Health Connect, lock-screen buttons, iOS, a slow phone, "Use this plan" with the new styles.

## 9. Account state left by testing

Reminders switch is off (allow notifications in Android, then switch on). Test data: duplicate lunches and snack, a 1-minute Cricket session, 0 kg Pull and Overhead Press sets, a few Push-Up sets, two sleep entries, extra water, a "Rajma masala" chip in the meal-setup draft (not saved).
