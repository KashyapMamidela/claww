import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const WAITLIST_URL = import.meta.env.VITE_WAITLIST_URL ?? 'https://vaweeztulqvkciuqytyi.supabase.co/functions/v1/join-waitlist';

const INTERESTS = [
  ['strength', 'Get stronger'],
  ['yoga_mobility', 'Yoga and mobility'],
  ['weight_loss', 'Lose weight'],
  ['nutrition', 'Eat better'],
  ['steps', 'Move more every day'],
] as const;

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string; field?: string } | { kind: 'done'; position: number; emailSent: boolean; already?: boolean };

export function Waitlist({ open, onClose, instagram }: { open: boolean; onClose: () => void; instagram: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [email, setEmail] = useState('');

  useEffect(() => {
    const d = dialog.current!;
    if (open && !d.open) {
      d.showModal();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(panel.current, { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'power3.out' });
      }
    } else if (!open && d.open) d.close();
  }, [open]);

  // The success moment: the place in line counts up and a plate spins on.
  useEffect(() => {
    if (status.kind !== 'done' || !panel.current) return;
    const num = panel.current.querySelector<HTMLElement>('.wl-pos-num');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !num || status.position < 2) return;
    const o = { v: 0 };
    gsap.to(o, { v: status.position, duration: 1.1, ease: 'power3.out', onUpdate: () => (num.textContent = '#' + Math.round(o.v).toLocaleString('en-IN')) });
    gsap.from(panel.current.querySelector('.wl-plate'), { x: 120, rotate: 300, opacity: 0, duration: 0.9, ease: 'power3.out' });
  }, [status]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const platforms = f.getAll('platforms') as string[];
    if (!platforms.length) {
      setStatus({ kind: 'error', message: 'Pick Android, iPhone or both.', field: 'platforms' });
      return;
    }
    const payload = {
      name: f.get('name'),
      email: f.get('email'),
      city: f.get('city'),
      platforms,
      interests: f.getAll('interests'),
      company: f.get('company'),
    };
    setEmail(String(payload.email ?? ''));
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch(WAITLIST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? 'Couldn’t join right now. Try again in a minute.', field: data.field });
        return;
      }
      setStatus({ kind: 'done', position: data.position, emailSent: data.emailSent, already: data.already });
    } catch {
      setStatus({ kind: 'error', message: 'Couldn’t reach the server. Check your connection and try again.' });
    }
  }

  const err = status.kind === 'error' ? status : null;

  return (
    <dialog
      ref={dialog}
      className="wl"
      aria-labelledby="wl-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="wl-panel" ref={panel}>
        <button type="button" className="wl-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {status.kind === 'done' ? (
          <div className="wl-done" role="status">
            <span className="wl-plate" aria-hidden />
            <p className="wl-kicker">{status.already ? 'You were already on the list.' : 'You’re officially on the waitlist.'}</p>
            <p className="wl-pos">
              <span className="wl-pos-num">#{status.position.toLocaleString('en-IN')}</span>
              <span className="wl-pos-label">in line</span>
            </p>
            <p className="wl-text">
              {status.emailSent ? (
                <>
                  We&rsquo;ve sent your waitlist pass to <strong>{email}</strong>. Not in your inbox? Check spam, tap <strong>Not spam</strong> and add clawwapp@zohomail.in to your contacts, so the launch-day email reaches you.
                </>
              ) : (
                <>
                  We&rsquo;ll email <strong>{email}</strong> once, on launch day.
                </>
              )}
            </p>
            <div className="actions">
              <a className="cta" href={instagram} target="_blank" rel="noopener noreferrer">
                Follow @clawwcrew
              </a>
              <button type="button" className="cta-ghost" onClick={onClose}>
                Back to the site
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate={false}>
            <h2 id="wl-title">Join the waitlist</h2>
            <p className="wl-text">CLAWW is coming to Android and iOS. We&rsquo;ll email you once, on launch day.</p>

            <div className="wl-grid">
              <label className="field">
                <span>Your name</span>
                <input name="name" required maxLength={80} autoComplete="name" aria-invalid={err?.field === 'name' || undefined} />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" aria-invalid={err?.field === 'email' || undefined} />
              </label>
              <label className="field">
                <span>
                  City <em>optional</em>
                </span>
                <input name="city" maxLength={80} autoComplete="address-level2" />
              </label>
            </div>

            <fieldset className="choice" aria-invalid={err?.field === 'platforms' || undefined}>
              <legend>Which phone do you use?</legend>
              <div className="chips">
                <label className="chip big">
                  <input type="checkbox" name="platforms" value="android" />
                  <span>Android</span>
                </label>
                <label className="chip big">
                  <input type="checkbox" name="platforms" value="ios" />
                  <span>iPhone</span>
                </label>
              </div>
            </fieldset>

            <fieldset className="choice">
              <legend>
                What do you want from CLAWW? <em>optional, pick any</em>
              </legend>
              <div className="chips">
                {INTERESTS.map(([v, l]) => (
                  <label key={v} className="chip">
                    <input type="checkbox" name="interests" value={v} />
                    <span>{l}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Hidden from people; bots fill it in. */}
            <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden />

            {err && (
              <p className="wl-error" role="alert">
                {err.message}
              </p>
            )}

            <button type="submit" className="cta wl-submit" disabled={status.kind === 'sending'}>
              {status.kind === 'sending' ? 'Joining…' : 'Join the waitlist'}
            </button>
            <p className="wl-fine">
              We only use your details to tell you when CLAWW launches. <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a>
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
