import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { Faq } from './faq';

// Everything after the barbell: the rest of the app, shown in its own dark UI.
// The section grows out of the light page like a phone screen filling the view.

const MODES = [
  { name: 'Strength', color: '#A855F7', example: 'Push day · 5 exercises · 50 min' },
  { name: 'Cardio', color: '#F97316', example: 'Easy run · 30 min' },
  { name: 'Mobility', color: '#2DD4BF', example: 'Hips and lower back · 15 min' },
  { name: 'Yoga', color: '#F472B6', example: 'Morning flow · 20 min' },
];

function Modes() {
  return (
    <section className="w-block modes" id="features" aria-labelledby="modes-h">
      <div className="w-copy">
        <h2 id="modes-h">Not into lifting? It plans that too.</h2>
        <p className="w-body">
          Pick strength, cardio, mobility or yoga, or mix them. Tell CLAWW which days you&rsquo;re free and for how long, and it builds your week around that.
        </p>
      </div>
      <ul className="mode-grid">
        {MODES.map((m) => (
          <li key={m.name} className="mode" style={{ ['--c' as string]: m.color }}>
            <span className="mode-dot" aria-hidden />
            <span className="mode-name">{m.name}</span>
            <span className="mode-ex">{m.example}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- A day with CLAWW: one panel per everyday feature ---------- */

function PhotoUI() {
  return (
    <div className="ui ui-photo" aria-label="In the app: a photo of rajma chawal analysed into calories and protein" role="img">
      <div className="viewfinder">
        <div className="plate">
          <span className="food rice" />
          <span className="food rajma" />
          <span className="food salad" />
        </div>
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
        <span className="scanline" />
      </div>
      <div className="result">
        <div className="frag-row">
          <span className="frag-title">Rajma chawal, salad</span>
          <span className="pill pill-green">1 plate</span>
        </div>
        <div className="macros">
          <span>610 kcal</span>
          <span className="green">22 g protein</span>
          <span className="frag-dim">98 g carbs</span>
          <span className="frag-dim">14 g fat</span>
        </div>
      </div>
    </div>
  );
}

const R = 54;
const CIRC = 2 * Math.PI * R;

function CaloriesUI() {
  return (
    <div className="ui ui-cal" role="img" aria-label="In the app: 1,240 of 2,100 calories eaten, with protein, carbs and fat">
      <svg viewBox="0 0 140 140" className="ring" aria-hidden>
        <circle cx="70" cy="70" r={R} className="ring-bg" />
        <circle cx="70" cy="70" r={R} className="ring-fg" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - 1240 / 2100)} />
      </svg>
      <div className="ring-label">
        <strong>860</strong>
        <span>kcal left</span>
      </div>
      <div className="macro-bars">
        {[
          ['Protein', 92, 140, '#22C55E'],
          ['Carbs', 150, 230, '#3B82F6'],
          ['Fat', 38, 65, '#F59E0B'],
        ].map(([n, v, t, c]) => (
          <div key={n as string} className="mb">
            <div className="frag-row">
              <span>{n}</span>
              <span className="frag-dim">
                {v} / {t} g
              </span>
            </div>
            <div className="meter" style={{ background: `color-mix(in srgb, ${c} 18%, transparent)` }}>
              <div className="meter-fill grow" style={{ width: `${((v as number) / (t as number)) * 100}%`, background: c as string }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const WEEK_STEPS = [6200, 9100, 4800, 10400, 7700, 11200, 8432];

function StepsUI() {
  return (
    <div className="ui ui-steps" role="img" aria-label="In the app: 8,432 steps today, goal 10,000">
      <div className="steps-big">
        <strong className="count" data-to="8432">
          8,432
        </strong>
        <span className="frag-dim">of 10,000 steps</span>
      </div>
      <div className="meter steps-meter">
        <div className="meter-fill grow" style={{ width: '84%', background: '#3B82F6' }} />
      </div>
      <div className="week-bars" aria-hidden>
        {WEEK_STEPS.map((s, i) => (
          <span key={i} className={'wb grow-y' + (i === 6 ? ' today' : '')} style={{ height: `${(s / 11200) * 100}%` }} />
        ))}
      </div>
      <div className="week-days frag-dim" aria-hidden>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function SleepWaterUI() {
  return (
    <div className="ui ui-sw" role="img" aria-label="In the app: 7 hours 20 minutes of sleep and 6 of 8 glasses of water">
      <div className="sw-row">
        <div>
          <div className="frag-dim">Sleep last night</div>
          <strong className="sw-big">7 h 20 m</strong>
        </div>
        <span className="pill pill-violet">Good</span>
      </div>
      <div className="sleep-bars" aria-hidden>
        {[6.5, 7.2, 5.9, 8.1, 7.0, 6.8, 7.3].map((h, i) => (
          <span key={i} className="sb grow-y" style={{ height: `${(h / 8.5) * 100}%` }} />
        ))}
      </div>
      <div className="sw-row water-head">
        <div>
          <div className="frag-dim">Water</div>
          <strong className="sw-big">6 of 8 glasses</strong>
        </div>
      </div>
      <div className="glasses" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={'glass' + (i < 6 ? ' full' : '')} style={i < 6 ? { ['--fill' as string]: '100%' } : undefined} />
        ))}
      </div>
    </div>
  );
}

function FormUI() {
  return (
    <div className="ui ui-form" role="img" aria-label="In the app: step-by-step form cues for a Romanian deadlift">
      <div className="frag-row">
        <span className="frag-title">Romanian deadlift</span>
        <span className="pill pill-blue">How to</span>
      </div>
      <ol className="cues">
        <li>Stand tall, bar against your thighs, knees soft.</li>
        <li>Push your hips back. Keep the bar close to your legs.</li>
        <li>Stop when you feel a stretch in your hamstrings.</li>
        <li>Squeeze your glutes to stand back up.</li>
      </ol>
      <div className="frag-why">Works: hamstrings, glutes, lower back</div>
    </div>
  );
}

const DAY = [
  {
    key: 'photo',
    color: '#22C55E',
    title: 'Snap your plate.',
    body: 'Take a photo of your meal. CLAWW works out the calories, protein, carbs and fat for you. Typing works too.',
    ui: <PhotoUI />,
  },
  {
    key: 'cal',
    color: '#F59E0B',
    title: 'Know what’s left today.',
    body: 'A daily target built from your body and your goal, whether that’s losing fat, building muscle or just eating better.',
    ui: <CaloriesUI />,
  },
  {
    key: 'steps',
    color: '#3B82F6',
    title: 'Every step counts.',
    body: 'Your phone counts your steps, no watch needed. Walks show up next to your workouts, so the whole day adds up.',
    ui: <StepsUI />,
  },
  {
    key: 'sleep',
    color: '#8B5CF6',
    title: 'Sleep and water, one tap each.',
    body: 'Log last night’s sleep and every glass of water in a second. CLAWW uses your sleep to judge how hard today should be.',
    ui: <SleepWaterUI />,
  },
  {
    key: 'form',
    color: '#2563EB',
    title: 'Never wonder how.',
    body: 'Every exercise comes with simple, step-by-step form cues and the muscles it works. Over 180 of them.',
    ui: <FormUI />,
  },
];

function Day() {
  return (
    <section className="day" id="day" aria-labelledby="day-h">
      <div className="day-intro w-copy">
        <h2 id="day-h">And the rest of your day.</h2>
        <p className="w-body">Food, steps, sleep and water live in the same app as your workouts. No more five apps that don&rsquo;t talk to each other.</p>
      </div>
      <div className="day-pin">
      <div className="day-track">
        {DAY.map((d, i) => (
          <article key={d.key} className="day-panel" style={{ ['--c' as string]: d.color }}>
            <div className="day-copy">
              <span className="day-num" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{d.title}</h3>
              <p className="w-body">{d.body}</p>
            </div>
            {d.ui}
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}

/* ---------- The CLAWW Tracker ---------- */

const ORM = [58, 60, 60, 62.5, 63, 65, 66, 67.5, 70, 72];
function ormPath(w: number, h: number) {
  const min = 55;
  const max = 75;
  return ORM.map((v, i) => `${i ? 'L' : 'M'}${((i / (ORM.length - 1)) * w).toFixed(1)},${(h - ((v - min) / (max - min)) * h).toFixed(1)}`).join(' ');
}

// Deterministic "training days" for the consistency grid: mostly 4 days a week, getting steadier.
const HEAT = Array.from({ length: 84 }, (_, i) => {
  const week = Math.floor(i / 7);
  const day = i % 7;
  const plan = [1, 0, 1, 0, 1, 1, 0][day];
  const skip = (i * 37) % 11 === 0 && week < 7;
  return plan && !skip ? 1 + ((i * 13) % 3) : 0;
});

function Tracker() {
  return (
    <section className="w-block tracker" id="tracker" aria-labelledby="tracker-h">
      <div className="w-copy">
        <h2 id="tracker-h">The CLAWW Tracker.</h2>
        <p className="w-body">All your progress in one place, as charts you can read at a glance: strength, records, consistency, muscles, steps, sleep and protein.</p>
      </div>
      <div className="t-grid">
        <figure className="t-card t-wide">
          <figcaption className="t-label">Strength · estimated 1-rep max</figcaption>
          <div className="t-head">
            <strong>72 kg</strong>
            <span className="up">+14 kg in 10 weeks</span>
          </div>
          <svg viewBox="0 0 300 90" className="t-line" aria-label="Bench press estimated one-rep max rising from 58 to 72 kilograms over ten weeks" role="img">
            <path d={ormPath(300, 80) + ' L300,90 L0,90 Z'} className="t-area" />
            <path d={ormPath(300, 80)} className="t-stroke" pathLength={1} />
          </svg>
        </figure>

        <figure className="t-card">
          <figcaption className="t-label">Consistency · 12 weeks</figcaption>
          <div className="heat" role="img" aria-label="Training days over the last 12 weeks, about four a week">
            {HEAT.map((v, i) => (
              <span key={i} className={'hc l' + v} />
            ))}
          </div>
        </figure>

        <figure className="t-card">
          <figcaption className="t-label">Personal records</figcaption>
          <ul className="prs">
            <li>
              <span>Squat</span>
              <strong>90 kg × 5</strong>
            </li>
            <li>
              <span>Bench press</span>
              <strong>62.5 kg × 6</strong>
            </li>
            <li>
              <span>Deadlift</span>
              <strong>110 kg × 3</strong>
            </li>
          </ul>
        </figure>

        <figure className="t-card">
          <figcaption className="t-label">Weekly sets per muscle</figcaption>
          <div className="sets">
            {[
              ['Chest', 12],
              ['Back', 14],
              ['Legs', 16],
              ['Shoulders', 9],
            ].map(([m, n]) => (
              <div key={m as string} className="set-bar">
                <span>{m}</span>
                <div className="meter">
                  <div className="meter-fill grow" style={{ width: `${((n as number) / 18) * 100}%`, background: '#A855F7' }} />
                </div>
                <span className="frag-dim">{n}</span>
              </div>
            ))}
          </div>
        </figure>

        <figure className="t-card t-insight">
          <figcaption className="t-label">CLAWW insight</figcaption>
          <p>You&rsquo;ve trained four days a week for six weeks straight. That&rsquo;s your best run yet, and your bench is up 14 kg.</p>
        </figure>
      </div>
    </section>
  );
}

/* ---------- Why CLAWW ---------- */

const COMPARE: [string, string][] = [
  ['Give you a fixed plan and leave you to it', 'Rewrites your plan after every session'],
  ['One app for workouts, another for food, another for steps', 'Workouts, food, steps, sleep and water together'],
  ['Make you type in every meal from a list', 'Calories and protein from a photo'],
  ['Food lists made for other countries', 'Knows dal, roti, paneer and dosa'],
  ['Push the same workout on a tired day', 'Goes easier when you’re sore'],
  ['Make you fill in every set', 'One tap per set, numbers already filled in'],
];

function Compare() {
  return (
    <section className="w-block compare" id="why" aria-labelledby="compare-h">
      <div className="w-copy">
        <h2 id="compare-h">Why CLAWW.</h2>
        <p className="w-body">Most fitness apps track what you did. CLAWW decides what you should do next.</p>
      </div>
      <table className="cmp">
        <thead>
          <tr>
            <th scope="col">Most fitness apps</th>
            <th scope="col">CLAWW</th>
          </tr>
        </thead>
        <tbody>
          {COMPARE.map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>
                <span className="tick-sm" aria-hidden>
                  ✓
                </span>
                {b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ---------- Join ---------- */

function Join({ onJoin, instagram }: { onJoin: () => void; instagram: string }) {
  return (
    <section className="w-block join" id="join" aria-labelledby="join-h">
      <h2 id="join-h">Coming to Android and iOS.</h2>
      <p className="w-body">Join the waitlist and you&rsquo;ll get one email from us, on launch day. That&rsquo;s it.</p>
      <div className="actions">
        <button type="button" className="cta" onClick={onJoin}>
          Join the waitlist
        </button>
        <a className="cta-ghost on-dark" href={instagram} target="_blank" rel="noopener noreferrer">
          Follow @clawwcrew
        </a>
      </div>
    </section>
  );
}

export function World({ onJoin, instagram, footer }: { onJoin: () => void; instagram: string; footer: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const world = root.current!;

      // Header and stage follow the dark world in either motion mode.
      ScrollTrigger.create({
        trigger: world,
        start: 'top 64px',
        end: 'bottom top',
        refreshPriority: -1, // measure after the pinned day strip adds its scroll length
        onToggle: (self) => document.body.classList.toggle('is-dark', self.isActive),
      });
      ScrollTrigger.create({
        trigger: world,
        start: 'top top',
        refreshPriority: -1,
        onEnter: () => window.dispatchEvent(new CustomEvent('claww:stage', { detail: false })),
        onLeaveBack: () => window.dispatchEvent(new CustomEvent('claww:stage', { detail: true })),
      });

      if (reduce) return;

      // The dark world grows from a rounded "screen" to the full page.
      gsap.fromTo(
        world,
        { clipPath: 'inset(14% 7% 0% 7% round 48px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: world, start: 'top bottom', end: 'top top', scrub: 0.6 } }
      );

      // Section headlines rise line by line.
      gsap.utils.toArray<HTMLElement>('.w-copy h2, .join h2').forEach((h) => {
        const split = SplitText.create(h, { type: 'lines', mask: 'lines' });
        gsap.from(split.lines, { yPercent: 105, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: h, start: 'top 88%', end: 'top 55%', scrub: 0.6 } });
      });

      gsap.from('.mode', {
        y: 60,
        opacity: 0,
        rotateX: -25,
        transformPerspective: 800,
        stagger: 0.12,
        ease: 'none',
        scrollTrigger: { trigger: '.mode-grid', start: 'top 85%', end: 'top 45%', scrub: 0.6 },
      });

      const mm = gsap.matchMedia();

      // Wide screens: the day scrolls sideways, pinned, one panel at a time.
      mm.add('(min-width: 821px)', () => {
        const track = world.querySelector<HTMLElement>('.day-track')!;
        const distance = () => track.scrollWidth - window.innerWidth;
        const slide = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: { trigger: '.day-pin', start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.8, invalidateOnRefresh: true },
        });
        gsap.utils.toArray<HTMLElement>('.day-panel').forEach((panel) => panelMoment(panel, { containerAnimation: slide, start: 'left 75%', end: 'left 25%' }));
      });

      // Phones: panels stack; each plays its moment as it scrolls into view.
      mm.add('(max-width: 820px)', () => {
        gsap.utils.toArray<HTMLElement>('.day-panel').forEach((panel) => panelMoment(panel, { start: 'top 80%', end: 'top 30%' }));
      });

      // Tracker: cards rise in, the strength line draws itself, the heat grid fills week by week.
      gsap.from('.t-card', {
        y: 50,
        opacity: 0,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: '.t-grid', start: 'top 85%', end: 'top 35%', scrub: 0.6 },
      });
      gsap.fromTo('.t-stroke', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.t-line', start: 'top 85%', end: 'top 40%', scrub: 0.6 } });
      gsap.from('.t-area', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.t-line', start: 'top 60%', end: 'top 35%', scrub: 0.6 } });
      gsap.from('.hc', { scale: 0, opacity: 0, stagger: { each: 0.01, grid: [7, 12], axis: 'x', from: 'start' }, ease: 'none', scrollTrigger: { trigger: '.heat', start: 'top 85%', end: 'top 40%', scrub: 0.6 } });
      gsap.from('.tracker .grow', { scaleX: 0, transformOrigin: 'left center', stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.sets', start: 'top 85%', end: 'top 50%', scrub: 0.6 } });

      // Comparison: each row turns from the grey "most apps" side to the CLAWW side.
      gsap.utils.toArray<HTMLElement>('.cmp tbody tr').forEach((tr) => {
        gsap
          .timeline({ scrollTrigger: { trigger: tr, start: 'top 90%', end: 'top 60%', scrub: 0.6 } })
          .from(tr.children[0], { opacity: 0, x: -30, ease: 'none' })
          .from(tr.children[1], { opacity: 0, x: 30, ease: 'none' }, 0.2)
          .from(tr.querySelector('.tick-sm'), { scale: 0, rotate: -90, ease: 'none' }, 0.4);
      });

      gsap.from('.join .w-body, .join .actions', {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: '.join', start: 'top 75%', end: 'top 45%', scrub: 0.6 },
      });
    },
    { scope: root }
  );

  return (
    <div className="world" ref={root}>
      <Modes />
      <Day />
      <Tracker />
      <Compare />
      <Faq />
      <Join onJoin={onJoin} instagram={instagram} />
      {footer}
    </div>
  );
}

/** One everyday panel's small story: copy rises, the UI tilts up, bars grow, numbers count. */
function panelMoment(panel: HTMLElement, st: ScrollTrigger.Vars) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: panel, scrub: 0.6, ...st } });
  tl.from(panel.querySelectorAll('.day-num, h3, .w-body'), { y: 40, opacity: 0, stagger: 0.08, ease: 'none' }, 0)
    .from(panel.querySelector('.ui'), { y: 80, rotateX: 20, opacity: 0, transformPerspective: 900, ease: 'none' }, 0.1);

  const grows = panel.querySelectorAll('.grow');
  if (grows.length) tl.from(grows, { scaleX: 0, transformOrigin: 'left center', stagger: 0.08, ease: 'none' }, 0.35);
  const growY = panel.querySelectorAll('.grow-y');
  if (growY.length) tl.from(growY, { scaleY: 0, transformOrigin: 'bottom center', stagger: 0.04, ease: 'none' }, 0.35);

  const ring = panel.querySelector<SVGCircleElement>('.ring-fg');
  if (ring) tl.from(ring, { strokeDashoffset: CIRC, ease: 'none' }, 0.3);

  const scan = panel.querySelector('.scanline');
  if (scan) {
    tl.fromTo(scan, { top: '6%' }, { top: '90%', ease: 'none' }, 0.2).from(panel.querySelector('.result'), { y: 40, opacity: 0, ease: 'none' }, 0.55);
  }

  const glasses = panel.querySelectorAll('.glass.full');
  if (glasses.length) tl.fromTo(glasses, { '--fill': '0%' }, { '--fill': '100%', stagger: 0.05, ease: 'none' }, 0.4);

  const count = panel.querySelector<HTMLElement>('.count');
  if (count) {
    const to = Number(count.dataset.to);
    const o = { v: 0 };
    tl.to(o, { v: to, ease: 'none', onUpdate: () => (count.textContent = Math.round(o.v).toLocaleString('en-IN')) }, 0.3);
  }
}
