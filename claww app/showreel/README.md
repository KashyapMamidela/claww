# CLAWW showreel

A 45-second, 1920 x 1080, 30 fps motion-graphics ad for CLAWW, built in
[Remotion](https://www.remotion.dev). The app is dark, so the film is light:
ivory and pastel canvases with the dark app screens as the hero. Each scene
owns one of the app's area colors (`AREA_COLORS` in `app/lib/theme.ts`), and
the background, wipes and accent type all follow it.

## Preview and render

```bash
npm run dev                       # Remotion Studio, scrub the timeline
npx remotion render Showreel out/claww-showreel.mp4 --codec=h264 --crf=18
npx remotion render Showreel out/claww-showreel.mov --codec=prores --prores-profile=4444
npx remotion still Moodboard out/moodboard.png
```

Use the ProRes 4444 render for DaVinci Resolve.

## Music and the beat grid

The edit runs on a **120 BPM** grid: one beat is 15 frames. Every scene starts
on a beat, so any 120 BPM track lines up when its first downbeat sits at 0:00.
For a track at another tempo, change `BEAT` in `src/design/tokens.ts`
(frames per beat = 30 x 60 / BPM) and every scene moves with it.

| Time | Beat | Scene | Hit points inside the scene |
|---|---|---|---|
| 0:00 | 0 | 1 Hook: "60 KG × 10. Twice." | slam on frame 2, "Twice." on beat 3 |
| 0:03 | 6 | 2 Decision: "62.5 KG · WEIGHT UP" | pill pops on 0:03.8 |
| 0:06 | 12 | 3 Adaptive plan | cards drop on the off-beats |
| 0:13 | 26 | 4 Recovery | score counts up from 0:15 |
| 0:19 | 38 | 5 One tap | "DONE." slam + tap at 0:21.1 |
| 0:25 | 50 | 6 Indian food | food card at 0:27.1 |
| 0:31 | 62 | 7 Proof (Tracker) | counters from 0:32.7 |
| 0:37 | 74 | 8 Montage: LIFT / EAT / RECOVER / ADAPT | one word every 2 beats |
| 0:41 | 82 | 9 End card | logo spin, CLAWW, tagline |

Sound design that fits: a low hit on each slam, a whoosh on each diagonal
wipe (they cover the frame exactly on the cut), a soft tick on each card drop,
and a click on the "Done" tap.

## Sound effects (first pass, in the project)

`src/Sfx.tsx` places about 90 sound cues, each on the frame of the animation it
belongs to (slams, wipes, card drops, counters, the Done tap, the montage hits,
the logo). Sources:

- Kenney sound packs, CC0 (free for commercial use, no credit needed):
  `public/sfx/KENNEY-LICENSE.txt`.
- Our own synthesized whooshes, swell, sub boom and riser:
  `python scripts/synth_sfx.py` regenerates them.

The layer peaks around -5 dBFS, leaving headroom for voice and music.

## For DaVinci Resolve

```bash
npx remotion render Showreel out/claww-showreel-prores-hq.mov --codec=prores --prores-profile=hq --muted
npx remotion render Showreel out/claww-showreel-sfx.wav --codec=wav
```

1. Import `claww-showreel-prores-hq.mov` (picture only) and
   `claww-showreel-sfx.wav` (the effects) and put both at 00:00:00:00. They are
   the same length (45.000 s), so they stay in sync.
2. Add the voice lines from `VOICEOVER.md` and the music on their own tracks.
3. Rebalance, swap or mute any effect; the cue list with times is in
   `VOICEOVER.md` and `src/Sfx.tsx`.
4. Export the final H.264 from Resolve (YouTube 1080p preset is fine).

`claww-showreel-with-sfx.mp4` is a quick preview with the effects mixed in.

## Files

- `src/Showreel.tsx`: the timeline (scene order, durations, wipes, background stops).
- `src/scenes/`: the nine scenes and shared motion parts.
- `src/app/`: the app screens, rebuilt in Inter from the real app.
- `src/design/`: tokens (colors, beat), fonts, motion helpers, the living background, kinetic type.
- `src/Moodboard.tsx`: the one-page moodboard still.
