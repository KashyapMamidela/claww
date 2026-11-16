# CLAWW site: design plan

## The idea: load the bar

CLAWW's whole promise is progressive overload done for you: the bar only gets
heavier when you have earned it. So the page is one barbell, in 3D, and the
story is told by loading it. It starts empty (20 kg). Each chapter of the story
slides one plate on, in the color of the part of the app that earned it, and a
running load counter in the corner climbs with it. The page ends at 62.5 kg,
the same number the app prescribes in the bench-press story.

One memorable thing (the barbell), everything around it quiet.

## Tokens

| Name | Hex | Use |
|---|---|---|
| Chalk | `#E6E9ED` | page background: cool gym-chalk grey, not cream |
| Chalk deep | `#D3D8DE` | floor glow, dividers |
| Iron | `#1A1D23` | type and the dark app fragments' frame |
| Steel | `#8E97A3` | secondary text, the bar |
| CLAWW blue | `#2563EB` | brand, the call to action |
| Plates | engine `#A855F7`, recovery `#2DD4BF`, workouts `#3B82F6`, nutrition `#22C55E` | the four plates, straight from the app's area colors |

**Type:** one family, Archivo, used at different widths as its voice:
expanded black for statements, condensed for numbers (like the numbers stamped
on plates), normal width for reading. Inter only inside the app fragments,
because that is the app's own font.

**Layout:** the 3D bar lives in a fixed full-screen layer, framed to the right.
The story column is left-aligned, about 34 characters wide, and scrolls over it.
Chapter markers are the plate weights (+15 kg, +2.5 kg ...) because the chapters
really are a sequence: the order the bar is loaded.

```
 CLAWW                                            Coming to Android
 ┌────────────────────┐
 │ Your plan          │         ══╡▌▌│════════════│▐▐╞══
 │ rewrites itself.   │              (3D, turns as you scroll)
 │ body, 34ch         │
 └────────────────────┘                                 20 kg  <- load
```

## Principles

- The bar is the only spectacle. No section fade-ups, no hover effects on
  everything, no gradient washes.
- Every motion is tied to scroll (the reader drives it) and means something: a
  plate going on is a decision the app made.
- App fragments are shown as they look in the app (dark, Inter), small, one per
  chapter, never as a grid of feature cards.
- Respect reduced motion (no smooth scrolling, no drifting dust; plates still
  arrive with the story), keyboard focus, and mobile.

## Not like the defaults

Checked against the usual generated landing page: no cream and serif, no
dark-plus-acid-accent, no feature-card grid, no all-caps eyebrows, no "→" on
buttons, no number-and-gradient hero. The hero is the empty bar.
