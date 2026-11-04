# Workout blueprints (for the trainer)

A blueprint is one week of training, written down once and reviewed by a person. CLAWW picks one by rules
(goal, where you train, days per week, how long you have trained) and fills each slot with an exercise from the
catalog. **No AI model chooses exercises.**

## How to read a file

Each `*.json` file is one blueprint.

- `goal`: muscle, fat_loss, strength or general.
- `place`: gym, home (dumbbells) or none (no equipment).
- `daysPerWeek` and `days`: the sessions, in order.
- `minMonths`: months of training needed before this plan is offered (so a beginner is not given six days).
- `slots`: each line of a session, main lifts first.
  - `pattern`: the movement (squat, hinge, lunge, horizontal_push, horizontal_pull, vertical_push, vertical_pull, knee_flexion, knee_extension, calf_raise, elbow_flexion, elbow_extension, back_extension, core_*). The app chooses the exercise: a barbell squat for a gym, a goblet squat at home, a bodyweight squat with no equipment.
  - `role`: main (heavy compound), accessory, or isolation (one joint).
  - `sets`, `repRange` (for example `[6, 10]`), `rir` (reps you should leave in the tank), `restSec` (rest between sets).
  - `optional`: true means it is the first thing dropped when a session has to be shorter.
- `reviewed`: **false** until a trainer has read it and changed anything that is wrong.

## Rules the app applies on top (so you do not have to)

- Each muscle (chest, back, shoulders, quads, hamstrings, glutes) is trained at least twice a week and gets 6 to 22 weekly sets (fewer for general fitness). Biceps, triceps and calves are not required.
- Main lifts come first in every session.
- If the person gave a session length, optional slots go first, then extra sets on accessories, then isolation work.
- An injury (body part and how bad) removes whole movement patterns, see `../injuryRules.ts`. Review that table too.
- Blocks are 6 weeks. Week 6 is lighter (one set fewer per exercise). A new block keeps the main lifts and refreshes the accessories.

## Editing

Change the JSON, then run (from the "claww app" folder):

```
node supabase/functions/_shared/blueprints/build_index.mjs
```

and commit both. A test fails if the JSON and the generated `index.ts` disagree, or if any blueprint breaks the
format in `schema.ts`.

## Review table

| Blueprint | Trainer | Date | Changes |
| --- | --- | --- | --- |
| (all 19 blueprints) | not reviewed yet | | |

Gaps the trainer should know about: the catalog has few isolation exercises for gym users (no lateral raises or
flyes yet), one biceps curl and one triceps extension, and no cardio slots. Add exercises to the catalog first, then
add slots here.
