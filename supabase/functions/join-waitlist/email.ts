// The "you're on the list" email, designed as a CLAWW waitlist pass: a loaded barbell drawn in
// table cells (no images, so it shows even when a mail app blocks them), the place in line, and a
// tear-off stub with the person's details. Tables and inline styles, because that is what email renders.

const INSTAGRAM = 'https://www.instagram.com/clawwcrew';

const C = {
  page: '#E6E9ED',
  ink: '#1A1D23',
  steel: '#6F7884',
  card: '#0A0A0B',
  line: '#232327',
  dim: '#8B8B94',
  soft: '#D5D5DB',
  bar: '#9AA3AD',
  blue: '#2563EB',
  engine: '#A855F7',
  recovery: '#2DD4BF',
  workouts: '#3B82F6',
  nutrition: '#22C55E',
};

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function phoneLabel(platforms: string[]) {
  const a = platforms.includes('android');
  const i = platforms.includes('ios');
  if (a && i) return 'Android and iPhone';
  return a ? 'Android' : 'iPhone';
}

/* ---------- the barbell, in cells ---------- */

// [colour, height, width] per plate, innermost first: 15 kg, 2.5, 2.5, 1.25. The story the website tells.
const PLATES: [string, number, number][] = [
  [C.engine, 118, 22],
  [C.recovery, 84, 14],
  [C.workouts, 84, 14],
  [C.nutrition, 62, 12],
];

const plateCell = ([color, h, w]: [string, number, number]) =>
  `<td valign="middle" style="padding:0 2px"><div style="width:${w}px;height:${h}px;background:${color};border-radius:6px;font-size:0;line-height:0">&nbsp;</div></td>`;

const barCell = (w: number, h: number, color = C.bar, cls = '') =>
  `<td valign="middle"><div${cls ? ` class="${cls}"` : ''} style="width:${w}px;height:${h}px;background:${color};border-radius:${h / 2}px;font-size:0;line-height:0">&nbsp;</div></td>`;

function barbell() {
  const left = [...PLATES].reverse().map(plateCell).join('');
  const right = PLATES.map(plateCell).join('');
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
    ${barCell(26, 12)}${barCell(8, 26, '#C4CBD3')}${left}${barCell(6, 22, '#C4CBD3')}
    ${barCell(150, 7, C.bar, 'shaft')}
    ${barCell(6, 22, '#C4CBD3')}${right}${barCell(8, 26, '#C4CBD3')}${barCell(26, 12)}
  </tr></table>`;
}

/* ---------- pieces ---------- */

const stripe = () => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="40%" style="height:6px;background:${C.engine};border-radius:28px 0 0 0;font-size:0;line-height:0">&nbsp;</td>
    <td width="20%" style="height:6px;background:${C.recovery};font-size:0;line-height:0">&nbsp;</td>
    <td width="20%" style="height:6px;background:${C.workouts};font-size:0;line-height:0">&nbsp;</td>
    <td width="20%" style="height:6px;background:${C.nutrition};border-radius:0 28px 0 0;font-size:0;line-height:0">&nbsp;</td>
  </tr></table>`;

// The tear line: a dashed rule with a half-circle bitten out of each edge.
const perforation = () => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="14" style="width:14px;height:28px;background:${C.page};border-radius:0 14px 14px 0;font-size:0;line-height:0">&nbsp;</td>
    <td style="padding:0 10px"><div style="border-top:2px dashed ${C.line};font-size:0;line-height:0">&nbsp;</div></td>
    <td width="14" style="width:14px;height:28px;background:${C.page};border-radius:14px 0 0 14px;font-size:0;line-height:0">&nbsp;</td>
  </tr></table>`;

const stubField = (label: string, value: string, align = 'left') => `
  <td valign="top" align="${align}" style="padding:0 6px">
    <div style="font:600 11px/1.3 ${FONT};color:${C.dim};padding-bottom:6px">${label}</div>
    <div style="font:700 15px/1.3 ${FONT};color:#FFFFFF">${value}</div>
  </td>`;

const feature = (color: string, title: string, body: string) => `
  <td valign="top" width="50%" style="padding:6px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:18px">
      <tr><td style="padding:18px 18px 20px">
        <div style="width:28px;height:28px;border-radius:14px;background:${color};font-size:0;line-height:0">&nbsp;</div>
        <div style="font:800 16px/1.25 ${FONT};color:${C.ink};padding-top:14px">${title}</div>
        <div style="font:400 14px/1.45 ${FONT};color:${C.steel};padding-top:4px">${body}</div>
      </td></tr>
    </table>
  </td>`;

/* ---------- the email ---------- */

export function waitlistEmail(opts: { name: string; position: number; platforms: string[]; joinedAt?: string }) {
  const name = opts.name.trim();
  const first = name.split(/\s+/)[0];
  const pos = opts.position.toLocaleString('en-IN');
  const passNo = 'CLAWW-' + String(opts.position).padStart(4, '0');
  const phone = phoneLabel(opts.platforms);
  const joined = new Date(opts.joinedAt ?? Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const subject = `${first}, you're in. Your CLAWW waitlist pass (#${pos})`;

  const text = [
    `${first}, you're in.`,
    '',
    `You're #${pos} on the CLAWW waitlist. Pass ${passNo}.`,
    `Name: ${name} | Phone: ${phone} | Joined: ${joined}`,
    '',
    `We'll email you once, on launch day, with the link for ${phone}. No newsletters in between.`,
    '',
    "What's waiting for you:",
    '- A plan that adapts: strength, cardio, mobility or yoga, adjusted after every session',
    '- Snap your plate: calories and protein from a photo',
    '- Your whole day: steps, sleep and water in the same app',
    '- The CLAWW Tracker: your progress as clear charts',
    '',
    `Follow along until then: ${INSTAGRAM}`,
    '',
    'The CLAWW team',
    '',
    "You're getting this because you joined the waitlist on the CLAWW website. Reply \"remove\" and we'll take you off the list.",
  ].join('\n');

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
<style>
  @media (max-width:520px) {
    .px { padding-left:20px !important; padding-right:20px !important; }
    .pos { font-size:88px !important; }
    .feat td[width="50%"] { display:block !important; width:100% !important; }
    .shaft { width:60px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">You're #${pos} in line. We'll email you once, on launch day.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td align="center" style="padding:28px 12px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">

  <!-- masthead -->
  <tr><td style="padding:0 8px 18px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:900 22px ${FONT};letter-spacing:3px;color:${C.ink}">CLAWW</td>
      <td align="right" style="font:600 13px ${FONT};color:${C.steel}">Coming to Android and iOS</td>
    </tr></table>
  </td></tr>

  <!-- the pass -->
  <tr><td style="background:${C.card};border-radius:28px;overflow:hidden">
    ${stripe()}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="px" style="padding:22px 32px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font:700 14px ${FONT};color:#FFFFFF">Waitlist pass</td>
          <td align="right" style="font:600 13px ${FONT};color:${C.dim};letter-spacing:1px">${passNo}</td>
        </tr></table>
      </td></tr>

      <tr><td align="center" style="padding:34px 12px 30px">${barbell()}</td></tr>

      <tr><td class="px" style="padding:0 32px">
        <div style="font:800 22px/1.25 ${FONT};color:#FFFFFF">${esc(first)}, you&rsquo;re in.</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px"><tr>
          <td valign="bottom" class="pos" style="font:900 112px/0.9 ${FONT};letter-spacing:-5px;color:#FFFFFF">#${pos}</td>
          <td valign="bottom" style="padding:0 0 12px 14px;font:600 14px/1.3 ${FONT};color:${C.dim}">your place<br>in line</td>
        </tr></table>
        <div style="font:400 15px/1.55 ${FONT};color:${C.soft};padding:18px 0 26px;max-width:420px">
          We&rsquo;ll email you once, on launch day, with the link for ${phone}. No newsletters in between.
        </div>
      </td></tr>

      <tr><td>${perforation()}</td></tr>

      <tr><td class="px" style="padding:12px 26px 30px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          ${stubField('Name', esc(name))}
          ${stubField('Phone', phone)}
          ${stubField('Joined', joined, 'right')}
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- what's waiting -->
  <tr><td style="padding:36px 8px 10px;font:800 20px ${FONT};color:${C.ink}">What&rsquo;s waiting for you</td></tr>
  <tr><td style="padding:0 2px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="feat">
      <tr>
        ${feature(C.engine, 'A plan that adapts', 'Strength, cardio, mobility or yoga, adjusted after every session.')}
        ${feature(C.nutrition, 'Snap your plate', 'Calories and protein from a photo of your meal.')}
      </tr>
      <tr>
        ${feature(C.workouts, 'Your whole day', 'Steps, sleep and water in the same app as your workouts.')}
        ${feature(C.recovery, 'The CLAWW Tracker', 'Your progress as clear charts, not raw logs.')}
      </tr>
    </table>
  </td></tr>

  <!-- follow -->
  <tr><td style="padding:26px 8px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ink};border-radius:22px"><tr>
      <td class="px" style="padding:22px 24px;font:600 15px/1.45 ${FONT};color:${C.soft}">
        <span style="color:#FFFFFF;font-weight:800">Until launch day</span><br>Behind the scenes, early looks and the countdown live on Instagram.
      </td>
      <td align="right" style="padding:22px 24px 22px 0;white-space:nowrap">
        <a href="${INSTAGRAM}" style="display:inline-block;background:${C.blue};color:#FFFFFF;text-decoration:none;font:800 14px ${FONT};padding:13px 20px;border-radius:999px">Follow @clawwcrew</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- footer -->
  <tr><td style="padding:28px 8px 0;font:400 12px/1.6 ${FONT};color:${C.steel}">
    You&rsquo;re getting this because you joined the waitlist on the CLAWW website. Reply &ldquo;remove&rdquo; and we&rsquo;ll take you off the list.<br>
    CLAWW &middot; Made in India
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
