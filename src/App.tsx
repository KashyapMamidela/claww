import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { Scene } from './scene/Scene';
import { startScroll } from './scroll';
import { formatKg, loadAt, PLATES, store } from './story';
import { MealFragment, MuscleFragment, PrescriptionFragment, SetFragment } from './fragments';
import Magnet from './vendor/Magnet';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const INSTAGRAM = 'https://www.instagram.com/clawwcrew';

/** The running load, top of the bar's world: 20 kg empty, 62.5 kg at the end. Written straight to the DOM every frame. */
function LoadCounter() {
  const num = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let shown = '';
    let smooth = 0;
    const loop = () => {
      smooth += (store.pos - smooth) * (store.reducedMotion ? 1 : 0.12);
      const next = formatKg(loadAt(smooth));
      if (next !== shown && num.current) {
        num.current.textContent = next;
        shown = next;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="load" aria-hidden>
      <span ref={num} className="load-num">
        20
      </span>
      <span className="load-unit">kg on the bar</span>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

const plateKg = (i: number) => `+${PLATES[i].kg} kg`;

function Marker({ i }: { i: number }) {
  return (
    <p className="marker" style={{ ['--plate' as string]: PLATES[i].color }}>
      <span className="marker-disc" aria-hidden />
      {plateKg(i)} a side
    </p>
  );
}

export default function App() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chapters = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-chapter]'));
    return startScroll(chapters);
  }, []);

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;

      // Hero: the headline settles in once, on load. The only motion that isn't driven by the reader.
      const hero = SplitText.create('.hero h1', { type: 'lines', mask: 'lines' });
      gsap.from(hero.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.15 });
      gsap.from('.hero .lede, .hero .hint', { opacity: 0, y: 12, duration: 0.9, ease: 'power3.out', delay: 0.55, stagger: 0.08 });

      // ...and lifts away, softly blurring, as the first plate comes in.
      gsap.fromTo(
        '.hero > *',
        { y: 0, filter: 'blur(0px)', autoAlpha: 1 },
        {
          y: -90,
          filter: 'blur(6px)',
          autoAlpha: 0,
          stagger: 0.05,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: { trigger: '.hero', start: 'bottom 85%', end: 'bottom 30%', scrub: 0.6 },
        }
      );

      const tintTo = (color: string) => gsap.to('.tint', { '--tint': color, opacity: 1, duration: 1.2, ease: 'power2.out', overwrite: 'auto' });

      gsap.utils.toArray<HTMLElement>('.chapter').forEach((el, i) => {
        const split = SplitText.create(el.querySelector('h2')!, { type: 'lines', mask: 'lines' });
        const frag = el.querySelector('.fragment');

        // In: the marker disc spins on like the plate itself, the headline rises line by line,
        // and the app card unfolds towards the reader.
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: 'top 78%', end: 'top 30%', scrub: 0.6 } })
          .from(el.querySelector('.marker'), { opacity: 0, x: -16, ease: 'none' }, 0)
          .from(el.querySelector('.marker-disc'), { scale: 0.3, rotate: -270, ease: 'none' }, 0)
          .from(split.lines, { yPercent: 105, stagger: 0.12, ease: 'none' }, 0.05)
          .from(el.querySelectorAll('.body'), { opacity: 0, y: 14, ease: 'none' }, 0.3)
          .from(
            frag,
            {
              clipPath: 'inset(0% 0% 100% 0% round 22px)',
              rotateX: 32,
              transformPerspective: 900,
              transformOrigin: '50% 0%',
              ease: 'none',
            },
            0.4
          );

        // Each card's own small moment (the pill pops, bars fill, the set gets ticked).
        const moment = { trigger: el, start: 'top 45%', end: 'top 15%', scrub: 0.6 };
        const pops = el.querySelectorAll('[data-moment=""]');
        const fills = el.querySelectorAll('[data-moment="fill"]');
        if (pops.length) gsap.from(pops, { scale: 0.5, opacity: 0, ease: 'none', scrollTrigger: moment });
        if (fills.length) gsap.from(fills, { scaleX: 0, transformOrigin: 'left center', stagger: 0.15, ease: 'none', scrollTrigger: moment });

        // Out: copy and card leave at different speeds, so the hand-off to the next plate has depth.
        const out = { trigger: el, start: 'bottom 75%', end: 'bottom 20%', scrub: 0.6 };
        gsap.fromTo(el.querySelector('.copy'), { y: 0, autoAlpha: 1 }, { y: -50, autoAlpha: 0, ease: 'none', immediateRender: false, scrollTrigger: out });
        gsap.fromTo(frag, { y: 0, autoAlpha: 1 }, { y: -130, autoAlpha: 0, ease: 'none', immediateRender: false, scrollTrigger: out });

        // The room takes on the colour of the plate going on.
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          end: 'bottom 40%',
          onToggle: (self) => self.isActive && tintTo(PLATES[i].color),
        });
      });

      ScrollTrigger.create({
        trigger: '.hero',
        start: 'top top',
        end: 'bottom 40%',
        onEnterBack: () => gsap.to('.tint', { opacity: 0, duration: 1, ease: 'power2.out', overwrite: 'auto' }),
      });
      ScrollTrigger.create({ trigger: '.finale', start: 'top 60%', onEnter: () => tintTo('#2563EB'), onLeaveBack: () => tintTo(PLATES[3].color) });

      // The running counter hands off to the finale's own "62.5 kg." headline.
      gsap.to('.load', { autoAlpha: 0, y: 20, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top 60%', end: 'top 35%', scrub: 0.6 } });

      const fin = SplitText.create('.finale h2', { type: 'chars', mask: 'chars' });
      gsap
        .timeline({ scrollTrigger: { trigger: '.finale', start: 'top 75%', end: 'top 25%', scrub: 0.6 } })
        .from(fin.chars, { yPercent: 110, stagger: 0.04, ease: 'none' })
        .from('.finale .body', { opacity: 0, y: 16, stagger: 0.1, ease: 'none' }, 0.3)
        .from('.finale .actions', { opacity: 0, y: 24, ease: 'none' }, 0.5);
    },
    { scope: root }
  );

  return (
    <div ref={root}>
      <div className="stage">
        <Scene />
      </div>
      <div className="tint" aria-hidden />

      <header className="top">
        <a className="brand" href="#top" aria-label="CLAWW home">
          <img className="mark" src="/claww-mark.png" alt="" width={30} height={28} />
          <span>CLAWW</span>
        </a>
        <span className="soon">
          Coming to Android
          <a className="insta" href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="CLAWW on Instagram">
            <InstagramIcon />
          </a>
        </span>
      </header>

      <LoadCounter />

      <main id="top">
        <section className="hero" data-chapter>
          <h1>Stop guessing at the gym.</h1>
          <p className="lede">CLAWW plans every workout for you and gets a little smarter each time you train. You just show up and lift.</p>
          <p className="hint">Scroll to load the bar</p>
        </section>

        <section className="chapter" data-chapter>
          <div className="copy">
            <Marker i={0} />
            <h2>It knows when you&rsquo;re ready for more.</h2>
            <p className="body">Lift a weight with ease twice, and next time CLAWW adds a little. Struggle, and it waits for you. No notebooks, no maths.</p>
          </div>
          <PrescriptionFragment />
        </section>

        <section className="chapter" data-chapter>
          <div className="copy">
            <Marker i={1} />
            <h2>Tired today? It listens.</h2>
            <p className="body">Tell it what&rsquo;s sore before you start. It goes easy on those muscles and pushes the fresh ones.</p>
          </div>
          <MuscleFragment />
        </section>

        <section className="chapter" data-chapter>
          <div className="copy">
            <Marker i={2} />
            <h2>One tap, then back to lifting.</h2>
            <p className="body">Your weights are already filled in. Tap Done, the rest timer starts, and the next set is ready. Less phone, more training.</p>
          </div>
          <SetFragment />
        </section>

        <section className="chapter" data-chapter>
          <div className="copy">
            <Marker i={3} />
            <h2>Eat for the work you did.</h2>
            <p className="body">Simple Indian meals that fit the protein and calories you still need today. Dal, paneer, eggs: food you already eat.</p>
          </div>
          <MealFragment />
        </section>

        <section className="finale" data-chapter>
          <div className="copy">
            <h2>62.5 kg.</h2>
            <p className="body big">Stronger every month, and you never had to guess.</p>
            <p className="body">CLAWW is coming to Android soon. Follow along on Instagram, or get one email on launch day.</p>
          </div>
          <div className="actions">
            <Magnet padding={70} magnetStrength={4} wrapperClassName="cta-wrap">
              <a className="cta" href="mailto:hello@claww.app?subject=Tell%20me%20when%20CLAWW%20launches">
                Email me at launch
              </a>
            </Magnet>
            <a className="cta-ghost" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
              <InstagramIcon />
              Follow @clawwcrew
            </a>
          </div>
        </section>
      </main>

      <footer className="foot">
        <span>&copy; 2026 CLAWW</span>
        <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
        <span>Made in India, for everyone who lifts.</span>
      </footer>
    </div>
  );
}
