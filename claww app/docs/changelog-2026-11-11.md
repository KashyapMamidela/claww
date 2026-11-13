# What changed on 2026-11-11

Everything here is on PR #42 (`premium/13-meal-check`). The last standalone APK (preview build f4d83afa) was made from commit
`12e0cd9`, so **all of this is new since that APK**. Backend items are already live and do not need a build.

## Logging meals (Check your plate for every way)
- Search, a described meal the food list does not know, and editing a logged meal all open the same Check your plate screen.
- Tap a logged meal for **Edit** (same screen, Save changes) or **Delete** (second tap confirms, the day's plan is rebuilt).
- At the smallest amount the minus button becomes a bin and removes the line. Search starts at the typed amount ("2 roti" is 2).
- Fixed an Android crash after logging (the button flipped back from "Logging..." while the screen closed) and the gap under bottom
  sheets after the keyboard closed.

## Scanner: accuracy
- Names match more often: colour and cut words ("shredded purple cabbage"), synonyms ("mixed greens", "bell pepper", "cherry tomato").
- The model is asked for the **visible portion, in grams** as well as a household unit. Where the household conversion and the model's
  gram estimate disagree a lot (a whole avocado against a few slices; tofu cubes counted as bowls) the model's estimate wins.
- Foods measured in grams only use typical weights for "handful", "piece" and so on, instead of 1 gram.
- Unknown items show the closest foods as one-tap chips; search opens with their name; **Ask us to add it** records a missing food
  (`food_requests`, live).
- Food list: 199 to **298 foods** (South and North Indian dishes, salad foods, kale and others). Recipe-based values need the
  nutritionist's review (see `docs/food-review.md`).

## Scanner: speed and models (live now, scan-plate version 14)
- Order: **Groq Qwen first, Gemini 3.6 Flash as the backup.** If Groq has not answered after 4 s the backup starts too; the first good
  answer wins. Each failure moves on at once.
- Per-model thinking levels, JSON-mode retry, Google's own error text in the log, a 28 s overall limit.
- **Scanner lab** (Settings, dev builds only, needs the secret `SCANNER_LAB=on`): one photo through six models with time, items found
  and calorie error, to choose models from evidence.
- Photo is **shrunk to about 1,024 px before sending** (needs the new `expo-image-manipulator` module, so it is in this build).

## Scanner: screens (in this dev build)
- Questions after the photo are now **Quick answers**: one card of icon chips (where, how oily, how much), "Same as last time" when
  there is a habit, and a **Check my plate** button that never waits.
- While the plate is read, a **sweep of light** runs over the photo; the next screen shows the same sweep with step text and
  placeholder rows. When it is read, the foods it found appear as **tags on the photo**, on the scan screen and on Check your plate.
- Dev builds show "Read by <model>" at the bottom of the check screen (never in production).

## Earlier work not in any build yet
- Voice logging (native, needs its own build), Sentry (needs your DSN), store assets, real photos on planned meals, empty states on
  remaining screens, widget preview images in the picker.

## Still to do by people
- Nutritionist: review food values and recipes. Trainer: review blueprints and injury rules. NIN: written permission for IFCT tables.
- Switch off `SCANNER_LAB` when the lab is no longer needed. Billing for the Gemini API before launch.
