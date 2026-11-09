# Widgets: liquid glass pass (plan for Sonnet 5.5)

Branch `premium/12-widgets-pro`. The user approved the preview in chat on 2026-11-09 (rings, food, steps, water 2×2 and 4×2 on glass).
Build nothing until the code below is done; then one EAS development build, install over USB, add all four widgets, check on the phone.

## Already done (committed on this branch)

- `lib/widgetSnapshot.ts`: snapshot v3 (`WIDGET_KEY` `claww.widget.snapshot.v3`), `forToday` (midnight reset), `staleLabel`, `sizeClass`, `activityView`, `nutritionView`, `waterView`, `stepsView`, `sameSnapshot`. Tests in `lib/widgetSnapshot.test.ts`.
- `lib/widgetSvg.ts`: `ringsSvg` (tracks in each ring's own colour at 0.2), `iconSvg` (flame, droplet, footprints, plus, camera, utensils, check, play, barcode, zap), `glassSvg(w, h, tint, tint2)`, `stepsGaugeSvg(pct)`, `ringHole(size, rings, stroke, gap)`.
- `widgets/theme.ts`, `widgets/parts.tsx`, `widgets/ActivityWidget.tsx`, `widgets/NutritionWidget.tsx`, `widgets/WaterWidget.tsx`, `widgets/widgetTaskHandler.tsx` (flat dark version; must move to glass, below).
- Home (`app/(tabs)/index.tsx`) and `components/WaterRow.tsx` already send the full v3 snapshot through `syncWidget`.
- `app.json`: widgets `Today` (rings), `Nutrition`, `Quick` (water) with Bricolage fonts. **Provider names must stay** (`Today`, `Quick` are already on the user's home screen).

## To do

### 1. Glass card (all widgets)
- In `widgets/parts.tsx` replace `Card` with `GlassCard({ width, height, tint, tint2, click, data, row, center, children })`:
  root `OverlapWidget` (`width/height: 'match_parent'`, the click action on it) holding
  `SvgWidget svg={glassSvg(width, height, tint, tint2)}` sized `width × height`, then a `FlexWidget` (`match_parent`, `padding: 16`) with the children. No `backgroundColor` on the root (the SVG draws the rounded pane, so the wallpaper shows through the corners).
- Tints: Rings `#3B82F6` / `#2DD4BF`; Food `#22C55E` / `#F472B6`; Steps `#F59E0B` / `#FB7185`; Water `#38BDF8` / `#6366F1`.
- Text on glass: primary `#FFFFFF`; secondary `rgba(255, 255, 255, 0.62)`. Labels in lighter tints: Workout `#60A5FA`, Food `#4ADE80`, Recovery `#5EEAD4`, Protein `#F9A8D4`, Carbs `#FCD34D`, Fat `#7DD3FC`. Bar tracks `rgba(255, 255, 255, 0.14)`. Secondary buttons `rgba(255, 255, 255, 0.14)`.
- `SignedOut` uses the glass card too.

### 2. Rings 4×2 (`ActivityWidget`, provider `Today`)
- Fix the overlap: ring size 124 (medium), `stroke 8`, `gap 2.5`; centre font = `Math.round(ringHole(size, 3, 8, 2.5) * 0.36)` (≈18); drop "of today" unless the hole is ≥ 60 dp.
- **Remove steps from this widget** (they get their own). Foot row: flame icon + "N day streak" in `#FDBA74` (or `staleLabel` when set).
- Small size: rings only, centre % with the same hole rule. Large: keep the session card with Start.

### 3. Food 4×2 (`NutritionWidget`, provider `Nutrition`)
- Header buttons, left to right, 34 dp round: camera → `claww:///scan`; **barcode** → `claww:///barcode`; green plus → `claww:///?quicklog=1` (opens the Quick log sheet in the app, which offers scan, add food, barcode, water, sleep, activity).
- Everything else as previewed (ring with kcal left / over in amber, three macro bars, "Up next · …").

### 4. Steps 2×2 (new `widgets/StepsWidget.tsx`, provider `Steps`)
- Header: footprints icon (`#FCD34D`) + "Steps"; right: `stepsView.km` shortened to "1.4 km" (muted).
- Middle: `stepsGaugeSvg(pct)` at 104 dp in an `OverlapWidget`, centre `steps` (22, extra bold) and "of {goal}" (10, muted).
- Bottom: full-width pill (32 dp, `rgba(255,255,255,0.16)`), play icon `#FCD34D` + "Start activity" → `claww:///?quicklog=activity`.
- Wider than 280 dp: gauge left, right column with "8,149 to go", "about 1.4 km", and the pill.
- Add to `WIDGET_NAMES` and `widgetFor` in the handler; add to `app.json`: name `Steps`, label "CLAWW Steps", description "Today's steps against your goal, and a quick start for an activity", 110dp × 110dp min, target 2×2, resizable, `updatePeriodMillis` 1800000.

### 5. Water (provider `Quick`)
- Same layouts as now, on glass. Primary button `#38BDF8` with text `#03121C`; "+ 500 ml" secondary glass pill with text `#BAE6FD`. Glass markers: filled `#38BDF8`, empty `rgba(255,255,255,0.14)`.

### 6. Deep links into Quick log
- `components/QuickLog.tsx`: add `openActivity` to the context value (`setActivityOpen(true)`).
- `app/(tabs)/_layout.tsx`: `const { quicklog } = useGlobalSearchParams<{ quicklog?: string }>()`; effect: `'1'` → `open()`, `'activity'` → `openActivity()`, then `router.setParams({ quicklog: undefined })` so it fires once.

### 7. Checks
- `npx tsc --noEmit`, `npm test -- --run` (all pass; add a test for any new pure helper).
- Update `docs/premium-status.md` (what was seen on the phone, what was not), commit (attribution line from the session), push, PR against `premium/11-widgets-v2`.

### 8. Device (after the build)
- `npx --yes eas-cli build --profile development --platform android --non-interactive --no-wait`, wait with a `while` loop in the background (not `until s=$(...)`, that exits at once), download the APK, `adb install -r`, `adb reverse tcp:8081 tcp:8081`, open with `exp+claww://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`, open Home once so the snapshot is written.
- Long-press home → Widgets → search "claww" → add Rings, Food, Steps, Water. Check: centre % clear of the rings, glass shows the wallpaper at the corners, numbers match Home, each button opens the right place (plus opens Quick log, barcode opens the scanner, Start activity opens the activity sheet), + 250 ml adds a `water_logs` row.
- Do not swipe from a screen corner (it opens Samsung's pop-up view); use `adb shell input swipe 540 1900 540 700 300` to scroll.
