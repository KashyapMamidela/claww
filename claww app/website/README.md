# CLAWW website

The landing page at **[claww.me](https://claww.me)**: one scrolling story built around a 3D barbell that gets heavier as each part of the app is explained (20 kg at the top, 62.5 kg at the end). The design idea, tokens and layout are in [`DESIGN.md`](DESIGN.md).

## Stack

- Vite, React 19, TypeScript
- three.js for the barbell, GSAP for scroll-driven motion
- Static pages for privacy and terms (`public/`), `sitemap.xml`, `robots.txt`, `llms.txt` and JSON-LD for search
- Waitlist: a Supabase Edge Function (`supabase/functions/join-waitlist`) that stores the sign-up and sends the confirmation email
- Hosted on Vercel (`vercel.json`)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then production build into dist/
npm run lint       # oxlint
```

The waitlist needs a Supabase project and the secrets used by the function (service role key, and a Resend key if emails are enabled). Without them the page works but sign-ups are not stored.

## License

See the [repository license](../../LICENSE): source-available for reading and review, all rights reserved.
