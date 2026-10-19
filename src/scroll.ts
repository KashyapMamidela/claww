import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { store } from './story';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll (Lenis) driving ScrollTrigger, plus the story position.
 * Each chapter after the hero adds 0..1 to `store.pos` as it scrolls from the
 * bottom of the viewport to a quarter from the top, so `pos` runs 0..5.
 * Returns a cleanup.
 */
export function startScroll(chapters: HTMLElement[]): () => void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  store.reducedMotion = reduce;

  let lenis: Lenis | null = null;
  let tick: ((time: number) => void) | null = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    tick = (time: number) => lenis!.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  const parts = chapters.slice(1).map(() => 0);
  const triggers = chapters.slice(1).map((el, i) =>
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      end: 'top 25%',
      onUpdate: (self) => {
        parts[i] = self.progress;
        store.pos = parts.reduce((a, b) => a + b, 0);
      },
    })
  );

  const onPointer = (e: PointerEvent) => {
    store.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    store.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  return () => {
    triggers.forEach((t) => t.kill());
    window.removeEventListener('pointermove', onPointer);
    if (tick) gsap.ticker.remove(tick);
    lenis?.destroy();
  };
}
