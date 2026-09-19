# CLAWW — Ship Roadmap (Play Store)

Prompt-by-prompt execution plan to take CLAWW from "works on my machine" to a published Play
Store app. Phases are labeled **SHIP PHASE N** — distinct from the **Engine Phase N** roadmap
in `claww-full-roadmap.md` and the **UI Phase N** audit Artifact. Always say which one you mean.

Written against the repo state at commit `c6bfeca` (end of Phase 5.4), after a full review that
found: typecheck clean, 20/20 tests passing, schema and RLS solid, generation architecture
sound — and a set of gaps, listed below, that stand between this and a published app.

**This roadmap supersedes the three-prompt `PHASE 6 — Ship to testers` at the bottom of
`claww-phased-prompts.md`.** That phase was right about what it named (production build
profile, observability, distribute) and is absorbed here as SHIP PHASE 9 and 12 — it just
wasn't the whole list.

---

## What this roadmap is actually fixing

The review scored the repo **5/10 production-ready** and **4/10 market**. The code is not the
problem — the schema, RLS, deterministic-generation architecture and test discipline are all
above the bar. What's missing splits three ways:

**Blocking — the app cannot be published without these**
- No in-app account deletion (Google mandates it for any app with account creation)
- No privacy policy, no Data Safety disclosures, and this app collects health data and photos
- No `production` profile in `app/eas.json` — no AAB can be built as configured
- No closed-testing run (12 testers × 14 consecutive days for personal developer accounts)
- No password reset — a user who forgets their password is locked out permanently

**Broken or unfinished — a tester hits these in the first two minutes**
- The core AI feature may be silently dead. `_shared/groq.ts` documents its own model returning
  `403 model_permission_blocked_org`; `generate-plan` catches that and serves `DEFAULT_PLAN`,
  the same static 3-day bodyweight plan to every user, and design principle #2 means the UI
  never says so. This is the single highest-severity item in the repo.
- 10 menu rows across `(tabs)/more.tsx` and `profile.tsx` render with chevrons and do nothing
- `more.tsx` hardcodes `Version 3.4.1 · Build 20240414` while `app.json` says `1.0.0`
- No crash reporting, no analytics, no CI — a tester's crash is invisible to you
- The injury filter is six regexes, documented in-code as "not a physiotherapy-grade
  contraindication database", behind a welcome screen claiming "Science-Backed"

**Undifferentiated — why the market score is 4**
- No Health Connect / Apple Health sync, no form guidance, no offline mode, no monetization.
  Every pillar of the app has a better-funded incumbent (Fitbod, MacroFactor, Hevy, Cal AI).
  The real advantage — deterministic constraints making the programming *safe* — is invisible
  to users and unmarketed.

**Target on completion:** 9/10 production-ready. Market realistically lands 7–8 at launch;
the remainder is retention and reviews, which no roadmap can commit to.

---

## Standing rules for every prompt

Same rules as `claww-phased-prompts.md`, plus two:

- One prompt at a time; read the diff before accepting.
- After each working change: commit with a message describing what now works.
- If a prompt would require widening what Groq decides, stop — that's a signal the constraint
  belongs in the query or the deterministic math instead.
- Update the "Current phase" checklist in `CLAUDE.md` as phases complete.
- **Never mark a prompt done on a clean typecheck alone.** The existing checklist is honest
  about which items were live-verified and which weren't — keep that standard.
- **Legal and policy text is not code.** SHIP PHASE 7 produces text that goes in a Play Console
  form and on a public URL. Claude drafts it; a human reads every word before it's submitted.

---

## SHIP PHASE 6 — Prove the engine is alive

**Nothing else on this roadmap matters until this phase passes.** If Groq is returning 403 in
production, every user is getting the same hardcoded fallback plan and the app's entire value
proposition is fictional. Everything downstream — differentiation, monetization, testers — is
built on the assumption that generation works. Verify it, then make it impossible for this to
ever be silently untrue again.

### 6.1 — Confirm generation works end-to-end in production

> Determine directly whether `generate-plan` is producing real Groq output in the live Supabase
> project, or silently falling back to `DEFAULT_PLAN`. The function already logs a distinct
> `[generate-plan] GENERATED` vs `[generate-plan] FELL BACK` line — read the actual Edge
> Function logs for the deployed project rather than inferring from plan shape.
> Separately verify both model ids in `supabase/functions/_shared/groq.ts` — `GROQ_MODEL`
> (`openai/gpt-oss-120b`) and `GROQ_VISION_MODEL` (`qwen/qwen3.6-27b`) — actually exist in
> Groq's current catalog and are enabled for this org. Do not assume either is valid; the
> vision model in particular has never been confirmed working in any phase note.
> Report findings before changing anything.

### 6.2 — A health endpoint that tells the truth

> Add a `supabase/functions/health-check` Edge Function that makes one minimal real call to
> each configured Groq model and reports per-model status (`ok`, `permission_blocked`,
> `not_found`, `error`) plus the model id it tried. Require a shared secret from
> `Deno.env.get()` so it isn't publicly callable. This is the one place where "is the AI
> actually working" is a direct read rather than an inference — it exists so that question is
> never answered by guessing again.
> Do not add a generation-cap check here; a health probe must not burn a user's daily slot.

### 6.3 — Make silent degradation loud

> Right now a Groq failure degrades to `DEFAULT_PLAN` and nothing anywhere surfaces it. Add a
> `generation_failures` table (`user_id`, `function_name`, `failure_kind`, `detail`,
> `created_at`) written on every fallback path in `generate-plan`, `parse-meal`, and
> `parse-meal-photo` — including schema-validation failures and grounding-filtered-everything,
> not just permission errors. RLS'd own-rows-only per the standing rule, but these rows are for
> operators, so also confirm a service-role read works for monitoring.
> This does not violate design principle #2: nothing about this is user-facing. The user still
> never sees an AI label — you just stop being blind to how often the engine is failing them.

### 6.4 — A fallback chain instead of a cliff

> `callGroqJSON` currently has one model and one outcome on failure. Give it an ordered list of
> candidate models, trying each in turn on a retryable failure (`5xx`, rate limit, model not
> found), and returning which model actually served the response so 6.3 can record it.
> A `GroqPermissionError` on the primary should fall through to the next candidate rather than
> aborting — a blocked model is exactly the case a fallback chain exists for.
> Keep `DEFAULT_PLAN` as the final backstop. Do not retry indefinitely: one pass through the
> chain, then fall back.

**SHIP PHASE 6 is done when:** the health endpoint reports `ok` for every configured model, a
fresh onboarding produces a plan whose logs say `GENERATED` and not `FELL BACK`, and you can
query `generation_failures` to see the real failure rate over the last 24 hours.

---

## SHIP PHASE 7 — Legal and policy compliance

Every item here is a hard Google Play blocker. None are technically difficult; all of them will
stop a submission dead. Do this phase early — the privacy policy needs a live URL, and hosting
that takes longer than writing it.

### 7.1 — In-app account deletion

> Google Play requires any app offering account creation to also offer in-app account deletion,
> plus a publicly reachable web URL for deletion requests from users who've uninstalled.
> Add a "Delete account" flow reachable from `app/app/profile.tsx`, with a genuine confirmation
> step (type-to-confirm or a two-step dialog — not a single tap), that deletes the `auth.users`
> row. Every `user_id`-scoped table in `database/schema.sql` already cascades from
> `profiles(id)`, which itself cascades from `auth.users(id)` — verify that chain actually
> holds for all 12 tables rather than trusting it, and confirm `generation_usage` and
> `xp_events` go with it.
> Deletion needs elevated privileges, so this must be a new Edge Function using the service
> role — the one legitimate service-role use in this codebase. Guard it by requiring the
> caller's own valid JWT and deleting only `user.id`; never accept a user id from the request
> body.

### 7.2 — Privacy policy and terms, hosted at a real URL

> Draft a privacy policy and terms of service for CLAWW, specific to what this app actually
> does — not a generic template. Read the schema and Edge Functions first and enumerate the
> real data flows: email and password via Supabase Auth; body metrics (height, weight, age,
> gender); free-text injury descriptions; sleep, meal, water and workout logs; **meal photos
> transmitted to Groq, a third-party US processor**; and the anon key shipping in the client
> binary. Name Supabase and Groq explicitly as subprocessors — Play's Data Safety form requires
> third-party sharing to be declared and users will compare the two.
> Cover retention, the deletion path from 7.1, the export path from 7.5, and a contact address.
> Output as markdown in `docs/legal/` plus a minimal static page ready to host. Flag clearly in
> your summary that a human must read this before it goes live — this is a legal document and
> you are drafting, not advising.

### 7.3 — Data Safety form content

> Produce `docs/legal/data-safety.md`: a field-by-field answer sheet for the Play Console Data
> Safety form, derived from the same audit as 7.2. For each data type, state collected yes/no,
> shared with third parties yes/no, whether it's required or optional, and the purpose.
> Pay specific attention to the **Health and fitness** category and the **Photos** category —
> both carry additional Play requirements, and both apply here. Note where Play's answers
> demand something the app doesn't currently do (for example, data encrypted in transit is
> satisfied, but "users can request data deletion" is only satisfied once 7.1 ships).

### 7.4 — Medical disclaimer and a claims audit

> This app prescribes exercise to users who self-report injuries in free text, and estimates
> calories from photos. The injury filter in `generate-plan/index.ts` is six regexes and its own
> comment calls it "a deliberately simple, best-effort heuristic (not a physiotherapy-grade
> contraindication database)". Meanwhile `app/app/screens/auth/welcome.tsx` advertises
> "Science-Backed" and "100% Personalized".
> Two changes. First, add a medical disclaimer: shown once during onboarding with an explicit
> acknowledgement, and permanently reachable from the Profile screen. It must say plainly that
> CLAWW is not medical advice, that users with injuries or conditions should consult a
> professional, and that nutrition figures are estimates.
> Second, audit every marketing claim in the UI against what the code actually does and bring
> them into line. "Science-Backed" is defensible for the deterministic rep-range tables; it is
> not defensible as a blanket claim covering the injury filter or photo calorie estimates.
> Fixing the gap between claim and implementation matters more than the disclaimer.

### 7.5 — Data export

> Add a "Download my data" action alongside the deletion flow from 7.1, producing a single JSON
> export of everything the user owns across all `user_id`-scoped tables. GDPR and India's DPDP
> both require this, and it's the cheap half of the pair you're already building for deletion.
> Reuse the caller's own JWT and let RLS scope the reads — no service role needed here, which
> is itself a useful check that the policies are correct.

**SHIP PHASE 7 is done when:** a user can delete their account from inside the app and every
row of theirs is provably gone; the privacy policy is live at a URL you can paste into Play
Console; and `docs/legal/data-safety.md` answers every field of the form.

---

## SHIP PHASE 8 — Finish the unfinished UI

Ten dead menu rows is what separates "prototype" from "product" in a tester's mind, and it's
the cheapest phase on this roadmap. Do it before anyone external sees the app.

### 8.1 — Every row either works or goes

> In `app/app/(tabs)/more.tsx` and `app/app/profile.tsx`, ten menu rows render with chevrons
> implying navigation and have no `onPress` at all: Notifications, Settings, Appearance,
> Connected Apps, Help & Support, Rate CLAWW, About (more.tsx) and Notifications, Privacy &
> Data, Help & Support (profile.tsx).
> Resolve every one. Cheap wins first: "Rate CLAWW" opens the Play listing, "About" opens a
> real about screen, "Privacy & Data" opens the policy from 7.2 plus the export/delete actions
> from 7.1 and 7.5, "Help & Support" opens a contact route. Anything that can't be made real in
> this phase gets deleted, not left as a decorative stub — a missing row reads as a smaller app,
> a dead row reads as a broken one.
> `more.tsx`'s `sections` array is `as const` with a conditional `'onPress' in row` check, which
> is what let the dead rows pass typecheck. Type the row shape so a row without a handler is a
> compile error.

### 8.2 — A real Settings screen

> Build the Settings screen that 8.1's row now points at. Scope: units (metric/imperial —
> currently kg/cm is hardcoded throughout, so this needs a display-layer conversion, not a
> schema change), the daily generation caps as read-only information so a user hitting a 429
> understands why, notification preferences from 8.3, and sign-out moved here from wherever it
> currently lives.
> Use the existing primitives in `app/components/ui/`. Do not introduce a new settings-row
> component pattern when `more.tsx`'s section/row layout already exists — extract it instead.

### 8.3 — Notifications that exist

> Add `expo-notifications` and implement the three reminders the UI already promises: a workout
> reminder on scheduled training days, an evening sleep-log prompt, and a meal-logging nudge.
> Request permission contextually — after a user completes their first workout, not on cold
> start — and respect the preferences from 8.2. Store the preference in `profiles`.
> Android 13+ requires the `POST_NOTIFICATIONS` runtime permission; handle a denial gracefully
> rather than repeatedly re-prompting.

### 8.4 — Password reset and auth hardening

> There is no password reset anywhere. A user who forgets their password today is permanently
> locked out, which is both a support burden and a one-star review.
> Add a "Forgot password" flow from `app/app/screens/auth/sign-in.tsx` using Supabase's
> `resetPasswordForEmail`, with the deep link wired through the app's existing `claww://` scheme
> and a reset screen to set the new password.
> While in here: `signInWithGoogle` in `app/lib/auth.ts` returns `{ user: null }` and relies on
> a redirect that nothing appears to handle. Either finish the OAuth callback properly or remove
> the function and its button — a sign-in method that silently does nothing is worse than one
> that isn't offered.

### 8.5 — Version string from app config

> `app/app/(tabs)/more.tsx` hardcodes `Version 3.4.1 · Build 20240414`. `app.json` says
> `1.0.0`. Read the real values from `expo-constants` at runtime so this can never drift again,
> and delete the hardcoded string.

**SHIP PHASE 8 is done when:** you can tap every row in More and Profile and something real
happens, a forgotten password is recoverable, and the version shown matches the build.

---

## SHIP PHASE 9 — Observability, CI, and release engineering

You currently have 20 good tests that nothing runs automatically, and zero visibility into
production. This phase is what makes the closed test in SHIP PHASE 12 informative rather than
anecdotal.

### 9.1 — Crash reporting

> Add Sentry (`@sentry/react-native`) to the Expo app and to the four Edge Functions. Keys in
> environment variables and EAS secrets, never committed — `app/.env.example` documents the
> convention, extend it.
> Set the release and dist to the real build version from 8.5 so a crash report names a build.
> Scrub PII before send: this app handles health data, body metrics, free-text injury
> descriptions and meal photos, none of which belong in a crash breadcrumb.

### 9.2 — Product analytics on the core loop

> Add PostHog (free tier) and instrument exactly the core loop, not everything: `onboarding_
> started`, `onboarding_completed`, `plan_generated`, `workout_started`, `set_logged`,
> `workout_completed`, `meal_logged`, `sleep_logged`. Include whether a generation was real or
> a fallback, joining up with SHIP PHASE 6.3 — retention conditional on the engine actually
> working is the single most valuable number you can have during the closed test.
> Respect an opt-out in Settings and declare analytics in the Data Safety answers from 7.3.

### 9.3 — CI

> There is no `.github/` in this repo. Add a GitHub Actions workflow running on push and PR:
> `npm ci`, `npx tsc --noEmit`, and `npm test` from `app/`. Cache node_modules by lockfile hash.
> Add a second job running `npm audit --audit-level=high` as non-blocking for now — the current
> 36 findings are all transitive Expo/Metro dev tooling and none ship in the app binary, so a
> blocking gate would be noise. Revisit once they're cleaned up.

### 9.4 — Production build profile and store assets

> `app/eas.json` has only `development` and `preview` profiles — no AAB can be produced as
> configured. Add a `production` profile targeting an Android App Bundle with
> `autoIncrement` on the version code, and matching EAS secrets for the environment variables
> the app needs at build time.
> Then audit the store assets against Play's current requirements: adaptive icon (foreground
> and background layers, 512×512 mask-safe), 512×512 hi-res icon, 1024×500 feature graphic,
> and phone screenshots. `app/assets/` currently has `icon.png`, `adaptive-icon.png`,
> `splash-icon.png` and `favicon.png` — check each against the real size and format spec and
> report precisely what's missing rather than generating placeholders.

### 9.5 — Secrets and dependency hygiene

> Confirm no secret has ever been committed to this repo's history, not just the working tree
> — `app/.env` was tracked at some point before Phase 4.2 and `git log` is the only way to know
> whether a key is still sitting in an old commit. If one is, rotate it; the anon key is
> RLS-protected and low-risk, but `GROQ_API_KEY` is a paid API and is not.
> Then work the `npm audit` list down: 36 findings, 2 critical (`tar`, `shell-quote`), all
> transitive through `@expo/cli` and `metro`. Most should clear with an Expo SDK patch bump.
> Report anything that can't be resolved without a breaking change instead of forcing it.

**SHIP PHASE 9 is done when:** CI is green on a push, a deliberate crash appears in Sentry with
the right build number, PostHog shows the core-loop funnel, and `eas build --profile production`
produces an installable AAB.

---

## SHIP PHASE 10 — Safety and correctness hardening

This phase is where the 9/10 is actually earned. Everything above is table stakes; this is the
part that makes the app defensible when a real user with a real bad knee uses it.

### 10.1 — An injury filter worth the claim

> Replace the six-regex `INJURY_EXCLUSIONS` heuristic in `generate-plan/index.ts` with a
> structured contraindication mapping: a real table of body region → contraindicated movement
> patterns, joined against `exercises` on a new `movement_pattern` column rather than pattern-
> matching exercise names with `/squat|lunge|jump/i`.
> Matching on names is the actual defect — a new catalog row named "Bulgarian Split Stance
> Knee Drive" sails straight through a knee exclusion today, and the catalog has 183 rows.
> Add the column and backfill it in `database/seed_exercises.sql`, idempotently per the
> standing rule. Keep free-text injury intake as the user-facing input, but parse it into
> structured regions deterministically — this stays entirely out of the LLM's hands per design
> principle #1.
> Add tests to `supabase/functions/_shared/planning.test.ts` covering each region, including
> the name-based false-negative above as an explicit regression test.

### 10.2 — Input validation and abuse limits

> Two gaps. `parse-meal-photo` accepts an unbounded base64 data URI — `app/app/meal-log.tsx`
> requests `quality: 0.5` but sets no `maxWidth`, so a modern phone photo can still be several
> megabytes inflated by base64. Add a server-side size ceiling returning a clear 413, and
> downscale client-side before upload.
> Separately, the daily generation caps from Phase 4.3 are the only rate limit — there is no
> per-minute bound, so a user can burn all 20 plan generations in ten seconds. Add a short
> per-user window limit alongside the daily cap, reusing the same atomic
> `check_and_increment_generation_usage` approach rather than a select-then-insert.

### 10.3 — Offline and failure resilience

> Every screen assumes the network works. Audit the app for what happens on a dropped
> connection mid-workout — `workoutSession.tsx` logging sets is the case that actually hurts,
> because a user loses real work they just did.
> Queue set logs locally and flush them when connectivity returns. Add a global network-state
> indicator using the existing `ErrorCard` primitive rather than a new pattern. The Phase 5.3
> loading and error states are good; they just assume failures are transient and retryable,
> and a tunnel is neither.

### 10.4 — Test coverage where it's thin

> Current coverage is 20 tests across three pure-function modules — genuinely good tests, but
> they cover recovery scoring, plan grounding and nutrition math only. Nothing covers the data
> layer, the React components, or any screen.
> Add React Native Testing Library and cover the paths where a silent break costs real data:
> `workoutSession.tsx` set logging (including the 10.3 offline queue), `appState.tsx` auth
> transitions and the `hasPlan` derivation that was a real bug in Phase 5.3, and the deletion
> and export flows from SHIP PHASE 7 — a broken delete is a compliance failure, not just a bug.
> Wire these into the 9.3 CI job.

### 10.5 — Accessibility

> Run an accessibility pass. Every `TouchableOpacity` in this codebase — and there are many —
> needs an `accessibilityLabel` and `accessibilityRole`; icon-only buttons currently announce
> as nothing at all. Check contrast on the dark theme in `app/lib/theme.ts`, particularly the
> `#71717A` secondary text on `#050505`, against WCAG AA. Verify the app is usable at the
> largest system font scale without clipping — several screens use fixed `fontSize` with fixed
> container heights, which is exactly the combination that breaks.
> This is also a Play Store quality signal, not only an ethical one.

**SHIP PHASE 10 is done when:** the injury filter has structured tests including the
false-negative regression, a mid-workout network drop loses nothing, and the app is navigable
with a screen reader.

---

## SHIP PHASE 11 — Differentiation

Phases 6–10 produce a shippable app. This phase is the one that moves the market score, by
removing the reasons a user picks Fitbod or MacroFactor instead. Sequenced by leverage.

### 11.1 — Health Connect and Apple Health sync

> The highest-leverage single addition on this roadmap. Fitness apps retain users through
> accumulated data; an app that reads and writes the platform health store becomes painful to
> leave and stops asking users to hand-log things their phone already knows.
> Integrate Android Health Connect (and Apple HealthKit, so the iOS path isn't foreclosed).
> Read: sleep (replacing manual sleep logging as the primary path, which feeds `compute-recovery`
> directly), steps, heart rate, active energy. Write: completed workouts as real workout
> sessions.
> This requires a native module, so it cannot run in Expo Go — the dev-client build is already
> configured, which is why this is feasible now. Health Connect also has its own Play Console
> declaration and a separate permissions review; budget for that, and fold the answers into the
> 7.3 Data Safety sheet.

### 11.2 — Form guidance

> A generated plan naming "Bulgarian Split Squat" is useless to a beginner who doesn't know
> what that is, and this is the most common complaint about AI fitness apps generally.
> Add per-exercise form guidance to the `exercises` catalog: a short cue list, common mistakes,
> and a demonstration. Surface it in `LiveWorkoutPlayer.tsx` as a tap on the exercise name —
> not a separate screen, not something that interrupts the set.
> Text cues first for all 183 rows; visual demonstrations can follow for the most common
> movements. Do not generate exercise form advice with the LLM at request time — this is
> exactly the numbers-and-safety category design principle #1 keeps out of the model's hands.
> Author it once, store it, review it.

### 11.3 — Progress and insights

> The app collects rich data — `workout_logs` with prescribed vs achieved, `xp_events`,
> `workout_day_events`, sleep, meals — and shows the user almost none of it back. Progress
> visualization is the single most-requested feature in this category and you already have the
> data.
> Add a Progress screen: volume over time, per-exercise strength trend from the
> prescribed/achieved split, adherence rate from `workout_day_events`, and how recovery tracked
> against training load. Use `react-native-svg`, already a dependency.
> This is also where the invisible advantage becomes visible — a user seeing their prescribed
> range adapt to their actual performance is the app explaining its own intelligence without
> ever printing the word "AI".

### 11.4 — Onboarding conversion

> The onboarding flow is now long: 3 intro steps, then 7 workout-setup steps, then 5
> nutrition-setup steps, before the user sees a single thing the app does. Phase 5.1 and 5.2
> made each step feel good, which is not the same as the sequence converting.
> Instrument drop-off per step with the 9.2 analytics, then cut or defer everything that isn't
> load-bearing for the first generated plan. Nutrition setup in particular does not block a
> workout plan and could move to first use of the Nutrition tab.
> Get the user to a real generated plan as fast as possible — that moment is the product.

### 11.5 — Monetization

> There is no revenue model in the repo at all, and Groq calls cost money per user per day.
> Add subscriptions via RevenueCat (handles Play Billing and StoreKit, and the free tier covers
> early volume). Decide and implement the free/paid boundary — the daily caps in
> `_shared/usageCap.ts` (`GENERATION_CAPS`) are already the natural seam, which is a genuinely
> good piece of foresight from Phase 4.3.
> Keep the core loop usable free: a paywall in front of the first generated plan kills the
> activation moment 11.4 exists to protect. Gate depth — regeneration frequency, photo meal
> logging, the 11.3 progress history — not access.
> Subscriptions bring their own Play policy requirements: pricing clarity, restore purchases,
> and cancellation instructions. Fold them into the 7.3 sheet.

**SHIP PHASE 11 is done when:** the app reads sleep from Health Connect without the user typing
it, a beginner can learn any prescribed movement without leaving the app, and a subscription
can actually be purchased in a production build.

---

## SHIP PHASE 12 — Beta, closed testing, and launch

The 14-day closed test is a wall-clock requirement that cannot be compressed. **Start 12.2 the
moment SHIP PHASE 9.4 produces an installable build** — it runs in parallel with Phases 10 and
11. Sequencing it last on the calendar rather than last in the list costs two weeks for nothing.

### 12.1 — Device QA matrix

> Build and run a real QA pass on physical Android devices, not just a simulator. Cover: a
> low-end device (2GB RAM), a current mid-range, and a tablet, since `app.json` declares
> `supportsTablet`. Check cold-start time, the Phase 5.3 loading states on a slow connection,
> the edge-to-edge layout declared in `app.json` against gesture navigation, and behavior on
> the Android back gesture given `predictiveBackGestureEnabled: false`.
> Write the results into `docs/qa-matrix.md` as a repeatable checklist, not a one-off report.

### 12.2 — Closed testing

> Google requires personal developer accounts to run a closed test with at least 12 testers for
> 14 consecutive days before production access is granted. This is calendar time — it cannot be
> shortened, and the 12 testers must actually remain opted in for the full window.
> Set up the closed track, recruit the testers, and prepare a short brief telling them what to
> try first: complete onboarding, generate a plan, run one full workout logging real reps,
> then regenerate and see whether the new plan reflects what they did. That loop is the product;
> feedback on anything else is secondary.
> Watch the 9.2 funnel and the 6.3 failure table daily during the window.

### 12.3 — Store listing

> Write the Play Store listing: title, short description, full description, and the screenshot
> set from 9.4. The positioning problem is real — "AI fitness app" is the most crowded phrase in
> the category and competing on it directly is a losing trade.
> Lead with what's actually true and rare here: the programming is bounded by real exercise-
> science constraints rather than whatever a model produced, and the plan adapts to reps you
> actually hit rather than a form you filled in once. Do not use the phrase "AI-powered" in the
> listing — it's both undifferentiated and against design principle #2's spirit.
> Re-check every claim against 7.4's audit.

### 12.4 — Launch

> Final pre-submission checklist: signing key backed up somewhere that isn't one laptop,
> production Supabase project separate from dev with the schema and seed applied, EAS secrets
> populated for the production profile, Sentry release tagging confirmed on a production build,
> the privacy policy URL live, Data Safety submitted, and content rating completed.
> Submit to a staged rollout — 10%, then widen as the Sentry crash-free rate holds. Do not ship
> to 100% on day one; the first real-world crash always comes from a device you didn't test.

**SHIP PHASE 12 is done when:** CLAWW is live on the Play Store on a staged rollout, with a
crash-free rate above 99% and the core-loop funnel visible in analytics.

---

## Suggested sequencing

Phases 6, 7 and 8 are strictly ordered — 6 gates everything, 7 has the longest external
dependencies (hosting, Play Console forms), 8 is fast and makes the app presentable. After 9.4
produces a build, 12.2's 14-day clock starts and everything else runs alongside it:

```
Week 1      SHIP PHASE 6 ──► SHIP PHASE 7 ──► SHIP PHASE 8
Week 2      SHIP PHASE 9  ──────────────────► 9.4 build ──┐
Weeks 2–4   SHIP PHASE 10        SHIP PHASE 11            │
Weeks 2–4   SHIP PHASE 12.2 closed test (14 days) ◄───────┘
Week 5      SHIP PHASE 12.1, 12.3, 12.4 ──► launch
```

Roughly 5 weeks of focused work, floored at 2 weeks by the closed-testing requirement no matter
how fast the code goes.
