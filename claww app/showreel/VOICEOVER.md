# CLAWW showreel: voiceover script and sound plan

The film already says the big words on screen. The voice should **not read the
screen back**. It is the quiet line underneath, as if a friend who trains with
you is talking in your ear before a set: low, close to the mic, unhurried, a bit
dry. That contrast (loud type, calm voice) is what keeps it from sounding like
every other AI ad, which all shout over the visuals.

Rules for the read:

- Short lines, contractions, half-sentences. People talk in fragments.
- Leave the slams silent. The voice comes in after a hit, never on it.
- No "introducing", no "revolutionary", no "AI-powered", no "unlock your potential".
- Speed about 0.9 to 0.95 of normal. Breaths stay in.

## Voice

**ElevenLabs model:** Eleven v3, which understands the bracketed tags below (`[exhales]`, `[short pause]`, `[softly]`). If a tag gets spoken aloud, the model is wrong: switch to v3.

**Settings:** Stability "Natural" (or about 0.35 to 0.45), Similarity 0.75, Style about 0.2, Speaker boost on, Speed 0.92.

**Voice:** pick one from the Voice Library by searching *conversational*, *narration*, *calm*, *deep*, and if you want it to feel local, *Indian English*. Avoid anything tagged *advertisement* or *announcer*. Or use Voice Design with this description:

> Male, late 20s, Indian English accent. Low, relaxed, slightly husky. Speaks close to the microphone like he's talking to a friend at the gym at 6 am. Dry, confident, a little amused. Never shouts, never sells. Natural breaths.

Female alternative:

> Female, late 20s, Indian English accent. Low, warm, unhurried, close to the microphone. Calm and certain, a coach who doesn't need to raise her voice. Dry humour, natural breaths.

**Generate each line as its own clip** (the numbered lines below), so you can drop each one at its exact time in Resolve. Generate 2 or 3 takes of each and keep the most human one.

## Script, line by line

Times are where each clip should **start** on the timeline. Each scene's slot is in brackets; the word counts are sized so every line fits with room to breathe.

| # | Start | Scene (slot) | On screen | Voice line (paste into ElevenLabs as is) |
|---|---|---|---|---|
| 1 | 0:00.6 | Hook (0:00 to 0:03) | 60 KG × 10. *Twice.* | `[softly] Sixty for ten. [short pause] Twice.` |
| 2 | 0:03.9 | Decision (0:03 to 0:06) | 62.5 KG · WEIGHT UP | `So today... it puts more on the bar.` |
| 3 | 0:06.6 | Adaptive plan (0:06 to 0:13) | YOUR PLAN REWRITES ITSELF | `Most apps hand you a plan and leave. [short pause] This one rewrites yours... every single time you train.` |
| 4 | 0:13.5 | Recovery (0:13 to 0:19) | IT KNOWS WHAT'S SORE | `It asks how you feel. [short pause] Sore chest? It holds the weight. [short pause] Tired triceps? One set less.` |
| 5a | 0:19.6 | One tap (0:19 to 0:25) | ONE TAP. | `Log a set in one tap.` |
| 5b | 0:22.4 | (after the Done tap) | DONE. Rest ring | `[exhales] Rest starts on its own.` |
| 6 | 0:25.6 | Indian food (0:25 to 0:31) | REAL INDIAN FOOD | `Hungry? [short pause] Real food. Paneer chilla, ragi dosa... picked to fit what's left of your day.` |
| 7 | 0:31.6 | Tracker (0:31 to 0:37) | PROOF, NOT VIBES | `And week after week, you see it. [short pause] Stronger. Steadier. [short pause] Proof, not vibes.` |
| 8a | 0:37.0 | Montage | LIFT. | `Lift.` |
| 8b | 0:38.0 | Montage | EAT. | `Eat.` |
| 8c | 0:39.0 | Montage | RECOVER. | `Recover.` |
| 8d | 0:40.0 | Montage | ADAPT. | `[short pause] Adapt.` |
| 9 | 0:41.9 | End card | CLAWW · Lift. Eat. Adapt. | `CLAWW. [short pause] The plan that pays attention.` |

Lines 8a to 8d land exactly on the word changes (every 2 beats = 1 second). Generate them as four separate one-word clips with the same voice and trim the silence off the front of each, so the consonant hits on the frame.

If a line runs long in a slot, trim the pause tags first, then speed that clip by up to 5% in Resolve (Clip Attributes, or Change Clip Speed with pitch correction).

## Sound effects, with times

Everything is on the 120 BPM grid (one beat = 0.5 s). Free, commercial-use sources:
[Pixabay sound effects](https://pixabay.com/sound-effects/), [Mixkit](https://mixkit.co/free-sound-effects/),
[Freesound](https://freesound.org) (check each file's licence), and the free
**Fairlight Sound Library** for DaVinci Resolve (Blackmagic support site, under DaVinci Resolve; installs a searchable library into Resolve).

Search terms are in quotes.

| Time | What happens | Sound | Search |
|---|---|---|---|
| 0:00.07 | "60 KG × 10" slams in | deep sub hit with a short tail | "cinematic boom", "sub drop hit" |
| 0:01.5 | "Twice." rises | soft reverse swell into it | "reverse whoosh short" |
| 0:03.0 | cut to 62.5 | tick-tick counter as the number rolls 0:03.0 to 0:03.7 | "digital counter tick", "number count" |
| 0:03.8 | WEIGHT UP pill pops | bright pop, small | "ui pop", "bubble pop" |
| 0:05.8 | wipe to plan | fast whoosh centred on 0:06.0 | "fast whoosh", "swoosh transition" |
| 0:06.1 | phone rises | low airy swell under it | "air rise", "riser short" |
| 0:06.8 to 0:07.8 | four prescription cards drop | four soft ticks, one per card | "soft ui tick", "card flick" |
| 0:08.4 | WHY card floats in | paper slide | "paper slide", "card slide" |
| 0:12.8 | wipe to recovery | whoosh | same family as 0:05.8 |
| 0:13.6 to 0:14.4 | body map lights up | glassy shimmer | "magic shimmer", "glass chime soft" |
| 0:14.9 | 65 counts up | the counter ticks again | same as 0:03.0 |
| 0:18.8 | wipe to player | whoosh | |
| 0:21.1 | Done tap + "DONE." slam | crisp click layered with the sub hit | "phone tap click" + "cinematic boom" |
| 0:22.3 | rest screen swaps in | soft slide | "ui swipe" |
| 0:22.8 | rest notification chip | phone notification ping | "notification soft" |
| 0:24.8 | wipe to food | whoosh | |
| 0:25.3 to 0:26.6 | three meal cards drop | three ticks | |
| 0:27.1 | Paneer chilla card | warm pop + light sizzle under it | "sizzle short", "pan sizzle" |
| 0:30.8 | wipe to tracker | whoosh | |
| 0:31.7 | strength line draws | rising tone that climbs with the line | "riser tonal", "ascending tone" |
| 0:32.7 | +18 / 31 / 96 count up | counter ticks | |
| 0:37.0, 0:38.0, 0:39.0, 0:40.0 | LIFT / EAT / RECOVER / ADAPT slabs | punchy hit on each, each a little higher in pitch | "punch hit", "impact short" |
| 0:40.8 | wipe to end card | big whoosh + reverse cymbal into it | "reverse cymbal" |
| 0:41.1 | logo spins in | shimmer + low hit as it lands | "logo reveal" |
| 0:42.1 | tagline | single soft chime | "soft bell" |
| 0:43.0 to 0:45 | end | let the music ring out | |

## Music

Pick a **120 BPM** track (or tell me the BPM and I'll re-time the cuts). Styles that fit
this look: minimal electronic with a strong low end, "future garage", or
lo-fi house; avoid generic "epic motivational" stock music. Put the first downbeat at
0:00, duck it about 8 dB under each voice line (Fairlight: sidechain the music
to the voice track, or keyframe the volume), and let it play out on the end card.

## Mixing the voice in Resolve (Fairlight) so it sounds recorded, not generated

1. High-pass at 80 Hz, small cut around 300 Hz if it sounds boxy.
2. De-esser on, gentle.
3. Compressor about 3:1, 3 to 6 dB of reduction.
4. A very short, small-room reverb at 5 to 10% wet. Synthetic voices are too dry; a little room is the biggest single fix.
5. Leave a tiny bit of room tone or the music under every gap, so the voice never sits in dead silence.

Targets for social: voice peaks around -6 dBFS, final mix about -14 LUFS integrated, true peak -1 dB.

## Also make a no-voice version

Most social video plays muted, and the on-screen type already tells the story.
Export one version with voice and music for YouTube and ads, and one with only
music and sound effects for Reels and autoplay feeds.
