# Baseline numbers (NG PHASE 0.4)

The "before" numbers NG PHASE 15 compares against. Measured on the preview APK with
`EXPO_PUBLIC_PERF=1` (EAS `preview` profile), not a dev build: dev builds run unoptimised
JavaScript and would make every number look worse than a real install.

Device B (iQOO, 8 GB) is the main column; it is mid-range, not the 4 GB phone the targets assume
(see `docs/device-matrix.md`).

| Measure | How | Device B | Device A | NG target |
| --- | --- | --- | --- | --- |
| Tap to next set shown, median of 20 sets | Settings > Speed numbers > Reset set timings, log 20 sets, read the median | | | under 100 ms |
| Same, slowest 10 % | Same screen | | | |
| Taps to log one planned set | Count | | | 1 |
| Home first paint after a cold start | Swipe the app away, open it, then Settings > Speed numbers (time from JS start) | | | under 1 s |
| Log a meal by text: taps and seconds | Nutrition > Add, stopwatch from the first tap to the saved confirmation | | | 2 taps or 5 s |
| Log a meal by photo: taps and seconds | Same, with the camera | | | 4 taps |
| Finish nutrition setup: taps and seconds | Stopwatch | | | under 60 s, 12 taps |
| Workouts tab scroll | Smooth / some stutter / heavy stutter (a fps number needs a profiler) | | | 60 fps |

Date measured: (fill in)
