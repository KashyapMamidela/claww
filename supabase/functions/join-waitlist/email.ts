// The "you're on the list" email. Table layout and inline styles, because that is what email clients render.

const INSTAGRAM = 'https://www.instagram.com/clawwcrew';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function platformLine(platforms: string[]) {
  const a = platforms.includes('android');
  const i = platforms.includes('ios');
  if (a && i) return 'Android and iPhone';
  return a ? 'Android' : 'iPhone';
}

export function waitlistEmail(opts: { name: string; position: number; platforms: string[] }) {
  const first = opts.name.trim().split(/\s+/)[0];
  const pos = opts.position.toLocaleString('en-IN');
  const phone = platformLine(opts.platforms);

  const subject = `You're on the CLAWW waitlist (#${pos})`;

  const text = [
    `Hi ${first},`,
    '',
    `You're officially on the CLAWW waitlist. You're #${pos} in line.`,
    '',
    `We'll email you once, on launch day, with the link for ${phone}.`,
    '',
    'What you are getting:',
    '- Workouts that adjust after every session: strength, cardio, mobility and yoga',
    '- Calories and protein from a photo of your plate',
    '- Steps, sleep and water in the same app',
    '- The CLAWW Tracker: your progress as clear charts',
    '',
    `Follow along until then: ${INSTAGRAM}`,
    '',
    'The CLAWW team',
    '',
    "You're getting this because you joined the waitlist on the CLAWW website. Reply \"remove\" and we'll take you off the list.",
  ].join('\n');

  const feature = (color: string, title: string, body: string) => `
    <tr><td style="padding:0 0 14px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" style="padding:5px 12px 0 0"><div style="width:12px;height:12px;border-radius:6px;background:${color}"></div></td>
        <td style="font:15px/1.45 Arial,Helvetica,sans-serif;color:#d5d5db"><strong style="color:#ffffff">${title}</strong> ${body}</td>
      </tr></table>
    </td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#e6e9ed">
<div style="display:none;max-height:0;overflow:hidden">You're #${pos}. We'll email you once, on launch day.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e6e9ed">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
    <tr><td style="padding:0 4px 18px;font:900 22px Arial,Helvetica,sans-serif;letter-spacing:2px;color:#1a1d23">CLAWW</td></tr>
    <tr><td style="background:#050505;border-radius:24px;padding:36px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font:15px Arial,Helvetica,sans-serif;color:#8b8b94;padding-bottom:6px">Hi ${esc(first)}, you're officially on the waitlist.</td></tr>
        <tr><td style="font:900 72px/1 Arial,Helvetica,sans-serif;color:#ffffff;letter-spacing:-2px;padding-bottom:6px">#${pos}</td></tr>
        <tr><td style="font:15px/1.5 Arial,Helvetica,sans-serif;color:#d5d5db;padding-bottom:28px">That's your place in line. We'll email you once, on launch day, with the link for ${phone}. No newsletters in between.</td></tr>
        <tr><td style="border-top:1px solid #1f1f23;padding-top:24px"></td></tr>
        <tr><td style="font:700 13px Arial,Helvetica,sans-serif;color:#8b8b94;padding-bottom:16px">What's waiting for you</td></tr>
        ${feature('#A855F7', 'A plan that adapts.', 'Strength, cardio, mobility or yoga, adjusted after every session.')}
        ${feature('#22C55E', 'Snap your plate.', 'Calories and protein from a photo of your meal.')}
        ${feature('#2DD4BF', 'Your whole day.', 'Steps, sleep and water in the same app.')}
        ${feature('#3B82F6', 'The CLAWW Tracker.', 'Your progress as clear charts, not raw logs.')}
        <tr><td style="padding-top:18px">
          <a href="${INSTAGRAM}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font:700 15px Arial,Helvetica,sans-serif;padding:14px 24px;border-radius:999px">Follow @clawwcrew</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 4px 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#6f7884">
      You're getting this because you joined the waitlist on the CLAWW website. Reply &ldquo;remove&rdquo; and we'll take you off the list.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  return { subject, text, html };
}
