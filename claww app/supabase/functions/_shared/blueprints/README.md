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

## Training styles (splits.ts)

Besides the JSON files above, `splits.ts` writes the same weeks for four styles the user can choose in setup: Full body
(2 to 4 days), Upper / Lower (4 and 6), Push / Pull / Legs (3 and 6) and Body-part split (4 and 5: chest, back, shoulders,
legs, arms). Each style is written once as a list of days and slots (`SPLITS`), and expanded for every goal and place with
the sets, reps, reps in reserve and rest in `GOAL_PARAMS`, which copy the numbers the reviewed JSON files use for each goal.
So the trainer reviews one template per style plus that table, not 80 files. All are `reviewed: false` and `minMonths: 0`:
a person who picks a style gets it at any experience.

Body-part weeks, and the 3-day push / pull / legs week, train each muscle once a week by design; the twice-a-week check is
not applied to them (and glutes, which are only a helper in those weeks, have a lower floor).

**Comfort level.** Easy, Standard and Hard (`applyIntensity` in `planTree.ts`): Easy takes about a fifth off every slot's sets
(never below 2) and adds one rep in reserve; Hard adds one set to each main lift (never above 5) and takes one rep off the
reserve; Standard changes nothing. An easy week may sit under the usual weekly-sets floor (70 % of it).

**Default style** when nobody chose one (`defaultSplitFor`): 2 or 3 days full body, 4 days upper / lower, 5 days body-part,
6 days upper / lower. Push / Pull / Legs is only given when it is picked.
