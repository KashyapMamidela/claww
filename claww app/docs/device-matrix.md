# Device matrix

The phones every NG phase's "Needs device test" refers to. Written in NG PHASE 0.2 (2026-11-03).

| | Device | What it is for | Status |
| --- | --- | --- | --- |
| **A** | Your Android phone, 6 GB RAM, 128 GB (model and Android version: fill in) | Every device test first | In use |
| **B** | iQOO, 8 GB RAM, 128 GB (model and Android version: fill in) | Second Android: repeat the starred tests, baseline numbers | Available |
| **C** | iPhone 18 Pro | iOS checks | **Not tested** until an Apple Developer account exists (below) |

## The low-end gap

The plan's budgets (60 fps scrolling, set tap under 100 ms) are written for a 4 GB Android 12
phone. A and B are both stronger, so a pass on them doesn't prove the low-end case. Until a 4 GB
phone is borrowed, record the numbers from B and mark them "mid-range". Any time a friend has a
Redmi or Realme with 4 GB, install the APK and repeat 5.2 to 5.4 of `docs/ng0-checklist.md`.

## iOS (device C)

An APK is an Android-only file, so it can't be installed on an iPhone. EAS can build CLAWW for
iOS from the same code, but Apple only lets an app onto a real iPhone outside the App Store if
it is signed by a paid **Apple Developer Program** membership (USD 99 a year). With one:

1. `eas device:create` registers the iPhone (open the link it prints on the iPhone).
2. `eas build --profile preview --platform ios` makes an internal build; EAS sets up the signing.
3. Open the build link on the iPhone to install.
4. For push on iOS, also upload an APNs key with `eas credentials`.

Without the membership, iOS stays "not tested". Expo Go can't stand in for it: CLAWW uses native
modules that Expo Go doesn't include (Health Connect, the set queue's storage and network modules).

Known iOS differences to check when C is available: steps come from Core Motion, not Health
Connect; the rest-over notification and reminders need the iOS notification prompt; nothing has
been run on iOS yet.

## What to check on every device

| Check | A | B | C |
| --- | --- | --- | --- |
| Install the latest EAS preview build | | | |
| Skia rings and charts render (Home, Tracker) | | | |
| Reminders and push arrive with the phone locked | | | |
| Set queue survives airplane mode | | | |
| Health Connect (Android) or Motion (iOS) permission and steps | | | |
| Haptics on set done and rest end | | | |
| Notification channels exist (Android: Settings > Apps > CLAWW > Notifications) | | | |
| Font size at 1.3x: nothing clips | | | |
