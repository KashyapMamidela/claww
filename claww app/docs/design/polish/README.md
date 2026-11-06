# Polish design boards (6 Nov 2026)

These files are the source of the design canvas "CLAWW app redesign"
(https://claude.ai/artifact/JAL32ssM1bVgZFUFQ4MQgH). They are the visual reference for `docs/polish-plan.md`.

They are written in the canvas's board format, so they do not render as plain HTML in a browser (the grain texture
and the `support.js` runtime live on the canvas). Read them as a spec: exact sizes, colours, copy, spacing and states
are in the markup. To see them rendered, open the canvas link (signed in as the owner).

## Shared look

- Background `#050505`, a top light (`radial-gradient` in the area colour, about 0.22 alpha) and the grain
  (`assets/textures/noise-256.png` in the app, opacity 0.07).
- Cards: gradient `#1A1A1D` to `#131315`, 1 px border `rgba(255,255,255,0.09)`, top light inset, deep shadow
  (`Surface` in `components/ui/`). A feature card adds its colour as a corner glow (`TintTile`).
- Primary buttons: blue gradient `#1D4ED8` to `#3B82F6`, 54 tall, radius 16. **Food actions are green**
  (`#15803D` to `#22C55E`).
- Area colours: Workouts `#3B82F6`, Nutrition `#22C55E`, Recovery `#2DD4BF`, Sleep `#818CF8`, Steps `#F59E0B`,
  Burned `#FB923C`, Streak `#F472B6`, Water `#38BDF8` (all already in `AREA_COLORS`).
- Type (Inter): 34 / 28 / 22 / 20 / 17 / 15 / 13, 11 only for tab labels, 44+ for big numbers. The pen is Caveat 700
  with a soft white glow.

## Boards and the plan step each belongs to

| Board | Screen | Plan step |
| --- | --- | --- |
| Main | The redrafted plan | all |
| Splash | Welcome, logo animation (light sweep, settling glow, no rings) | 9, 9b |
| Login | Log in, Google first | 9 |
| Goal | Onboarding 1: your goal | 2 |
| Train | Onboarding 2: how you train | 2, 3 |
| Schedule | Onboarding 3: days, time, body | 2 |
| PlanStory | The plan as 4 tap-through cards | 7 |
| Home | Rings (Burned, Eaten, Recovery) and the Today line | 1, 4 |
| Lock | Logging from the lock screen | 5 |
| Nutrition | Nutrition tab (green Scan a meal) | 1, 6, 8 |
| Search | Food search above the keyboard | 1 |
| Scan | Plate check with the unit menu ("2 katoris ⌄") | 6b |
| Diary | Food diary and weekly report | 8 |
| Workouts | Week strip, hero for gym / yoga / rest days | 1, 3, 8 |
| Player | In the session | 8 |
| Rest | Rest between sets | 8 |
| Complete | Session complete, muscle heat map | 8 |
| Brand | App icon, notification icon (white on transparent) | 9b |
| Tracker | Tracker with the adaptive card | 1, 8 |
| Review | Weekly review, pen marks | 8, 10 |
| Profile | You (More) | 8 |
