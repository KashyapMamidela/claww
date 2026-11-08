# Premium pass status

Plan: `docs/premium-plan.md`. Tick each item when it is built **and** checked on the phone.

## Phase 1 · Fixes (`premium/01-fixes`)
- [x] B1 Session tile opens today's session
- [x] B2 One week, one week start
- [x] B3 Ending a live workout (confirm + undo)
- [x] B4 Start on the session card
- [x] B5 XP in one scale
- [x] B6 Honest Now
- [x] B7 No cut-off button text
- [x] B8 Streak calendar matches the streak
- [x] B9 Food names without repeats
- [x] Steps goal confirm, steps chart default, diary back

Notes (2026-11-08, checked on the phone): B2 removed the bottom "This week" calendar (the strip is the week; history lives on Progress). B3 has a confirm sheet (Finish and save / Keep going / Discard) but **no undo yet**: undo arrives with the toast in Phase 2 (D4). B4 replaced the sticky Start with a Start / Do it today button on the session card; the Missed card keeps only "Keep today's plan". B8: the calendar was right (rest days count); rest days are now clearer and the copy explains it.

## Phase 2 · Frame (`premium/02-frame`)
- [x] Tokens, `lib/format.ts` (D12, D13: helpers + title bar and Food date; unit helpers not yet used on screens), tabular numbers (D1)
- [x] S7 Typography components
- [x] S4 Button tiers, D6, D7
- [x] S5 Floating tab bar + centre +
- [x] S1/S2/H1 Collapsing title bar, no CLAWW word bar
- [x] S3 Back and close rule
- [x] S6 Sheets for everything small
- [x] D3 Haptics, D4 Undo toast
- [~] D14 System bars (status bar done, navigation bar waits for the native rebuild) · [~] D16 Accent per tab (logo tile, tab pill and bar tint follow the tab; the top light does not yet)
- [x] P1 Avatar opens Profile, More removed

Notes for Phase 2 (2026-11-08, checked on the phone): the title bar is a 56 pt bar with a **large page title that collapses into it** on Train, Food and Progress (the bar's own title fades in as the page title scrolls away; Home's greeting is its large title). The tab bar hides on scroll down and returns on scroll up or at the top (`lib/tabBarVisibility.ts`, `useHideBarOnScroll('route')`). Quick log (centre +) is a first version: Scan, Add food, Water 250 ml, Sleep. Undo toast (`useToast()`) is on "As planned" (Home, Food), Your usuals and **closing a workout** (the End workout sheet now says what each choice does; Undo brings the session back). Button tiers: tinted has no border, ghost is plain text; the Train tab's "Log a session" is now a tinted button. A few hand-built outlined **tiles and inputs** remain on purpose (they are not buttons). `lib/format.ts` is used for the date in the title bar and on Food; tabular figures are on every 900-weight number (61 places); the light status bar is set. **Still not done:** the Android navigation bar colour (needs `expo-navigation-bar`, a native module, so it goes in the Phase 7 rebuild), and rolling the new Typography components over old screens (they are used for the three page titles; the rest follows as screens are touched). More tab removed: Profile holds Settings, Your week, Help, Rate, About, Sign out.

## Phase 3 · Home (`premium/03-home`)
- [ ] H2 · [ ] H3 · [ ] H4 · [ ] H5 · [ ] H6 · [ ] H7 · [ ] H8 · [ ] H9

## Phase 4 · Train (`premium/04-train`)
- [ ] W1 · [ ] W2 · [ ] W3 · [ ] W4 · [ ] W5
- [ ] X5 Calmer player · [ ] F3 Notification · [ ] F4 Rest haptics · [ ] X6 PR moment

## Phase 5 · Food and Progress (`premium/05-food-progress`)
- [ ] N1 · [ ] N2 · [ ] N3 · [ ] N4 · [ ] N5
- [ ] T1 · [ ] T2 · [ ] T3 · [ ] T4
- [ ] P2 · [ ] P3

## Phase 6 · Signature (`premium/06-signature`)
- [ ] X1 · [ ] X2 · [ ] X3 · [ ] X4
- [ ] D2 · [ ] D5 · [ ] D8 · [ ] D9 · [ ] D10 · [ ] D11 · [ ] D15

## Phase 7 · Features (`premium/07-features`)
- [ ] F1 · [ ] F5 · [ ] F6 · [ ] F8 · [ ] F9 · [ ] F7 · [ ] F2 (native) · [ ] F10 (native)

## Phase 8 · Ship (`premium/08-ship`)
- [ ] Onboarding · [ ] Empty/offline · [ ] TalkBack · [ ] Sentry · [ ] Store assets · [ ] Preview APK
