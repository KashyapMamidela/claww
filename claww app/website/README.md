# CLAWW website

The landing page at **[claww.me](https://claww.me)**: one scrolling story built around a 3D barbell that gets heavier as each part of the app is explained (20 kg at the top, 62.5 kg at the end). The design idea, tokens and layout are in [`DESIGN.md`](DESIGN.md).

## Stack

- Vite, React 19, TypeScript
- three.js for the barbell, GSAP for scroll-driven motion
- Static pages for privacy and terms (`public/`), `sitemap.xml`, `robots.txt`, `llms.txt` and JSON-LD for search
- Waitlist: a Supabase Edge Function (`supabase/functions/join-waitlist`) that stores the sign-up and sends the confirmation email
- Hosted on Vercel (`vercel.json`)

## Copyright

© 2026 CLAWW. All rights reserved. See the [repository license](../../LICENSE): the code may be read and reviewed, but not used, copied or redistributed.
