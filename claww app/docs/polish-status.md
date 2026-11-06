# Polish build status (6 Nov 2026)

Built on Sonnet 5.5, one branch and PR per step, each stacked on the one before. Nothing merged. Typecheck clean and
all tests pass on every branch. **Nothing has been tried on a phone yet** (the phone check is the last step).

| Step | Branch | PR | State |
| --- | --- | --- | --- |
| 1 Device-test bugs | `polish/1-device-bugs` | #18 | done |
| 2 Onboarding, goal first | `polish/2-onboarding` | #19 | done |
| 3 Plans for every training style | `polish/3-training-styles` | #20 | done, needs seed and deploy below |
| 4 Home Today line, Burned ring | `polish/4-home` | #21 | done |
| 5 Log from the lock screen | `polish/5-lockscreen` | #22 | done, needs a new APK |
| 6 Save as my plate | `polish/6-plates` | #23 | done |
| 6b Portions in the unit you know | `polish/6b-portions` | #24 | done |
| 9b Logo, icons, welcome animation | `polish/9b-icons` | #25 | done, needs a new APK |
| 7 Plan as stories | `polish/7-plan-stories` | #26 | done |
| 10 Sunday letter | `polish/10-letter` | #27 | done |
| 8 Same look on every screen | `polish/8-look` | see PR | done in part (below) |
| 9 Welcome and log in rebuilt in the app style | `polish/8-look` | see PR | done |

## Needs the user (the live database and functions)

1. ~~Run `database/seed_calisthenics.sql`~~ Done on the live project (10 exercises, all with metadata and form steps).
2. Redeploy `generate-plan` (it now builds yoga, mobility, calisthenics and mixed weeks):
   `supabase functions deploy generate-plan`.
3. Then build a new APK (icons, notification icon, notification buttons, native small icon).


## Known limits

- Lock-screen quick buttons (Ate it, +250 ml, Yes) are applied when the app process is alive; a press while the app is dead is applied the next time it starts.
- Yoga and mobility sessions have no level or injury filtering yet (the catalog has no difficulty column). See `docs/polish-review-list.md`.
- Step 1 item 7: whether the 2-exercise Full body day was an old plan or the fill bug is not known; run `select id, blueprint_id, created_at from workouts order by created_at desc limit 1;` (null `blueprint_id` means an old plan). The fill bug (30-minute sessions dropping to 2 exercises) is fixed either way.
- The Home Today line, the plan story and the Sunday letter are new screens: check them on the phone first.

## Step 8, what was and was not done

Done: the type scale (nothing under 11, half sizes snapped: 156 changes in 55 files), sentence-case labels and buttons,
the dot grid and icon watermark cut from the feature tiles, Welcome, Log in and Sign up rebuilt (Google first, one primary
button, no emoji), the Home, Nutrition and Workouts rebuilds from steps 1 to 7.
Not done: moving every remaining plain card (`#151517` views) onto `Surface` for the grain and top light, and the setup,
settings and diary screens one by one against their boards. That is a screen-by-screen pass best done with the phone in hand.
