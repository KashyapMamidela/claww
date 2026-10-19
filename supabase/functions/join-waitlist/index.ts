// join-waitlist: the website's waitlist form posts here.
// Saves the person, works out their place in line and sends the confirmation email over SMTP
// (Zoho or Gmail with an app password; Supabase only allows outbound SMTP on port 465).
//
// Secrets: SMTP_USER, SMTP_PASS (required to send), SMTP_HOST (default smtp.zoho.in), SMTP_PORT (465),
// MAIL_FROM_NAME (CLAWW). CRON_SECRET guards the "send-pending" backfill.
// Deploy with --no-verify-jwt: the website calls it without a Supabase session.

import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';
import { waitlistEmail } from './email.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const PLATFORMS = ['android', 'ios'];
const INTERESTS = ['strength', 'yoga_mobility', 'weight_loss', 'nutrition', 'steps'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_IP_PER_HOUR = 5;

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

function allowedOrigin(origin: string | null) {
  if (!origin) return '*';
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;
    if (protocol === 'https:' && (hostname.endsWith('.vercel.app') || hostname === 'claww.app' || hostname.endsWith('.claww.app'))) return origin;
    const extra = (Deno.env.get('WAITLIST_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (extra.includes(origin)) return origin;
  } catch {
    /* fall through */
  }
  return 'null';
}

function respond(req: Request, status: number, body: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin(req.headers.get('origin')),
      'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    },
  });
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const mailConfigured = () => Boolean(Deno.env.get('SMTP_USER') && Deno.env.get('SMTP_PASS'));

function transport() {
  return nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST') ?? 'smtp.zoho.in',
    port: Number(Deno.env.get('SMTP_PORT') ?? 465),
    secure: true,
    auth: { user: Deno.env.get('SMTP_USER')!, pass: Deno.env.get('SMTP_PASS')! },
  });
}

async function positionOf(seq: number) {
  const { count, error } = await supabase.from('waitlist').select('id', { count: 'exact', head: true }).lte('seq', seq);
  if (error) throw error;
  return count ?? seq;
}

type Row = { id: string; seq: number; name: string; email: string; platforms: string[] };

async function sendConfirmation(row: Row) {
  const position = await positionOf(row.seq);
  const mail = waitlistEmail({ name: row.name, position, platforms: row.platforms });
  const user = Deno.env.get('SMTP_USER')!;
  try {
    await transport().sendMail({
      from: { name: Deno.env.get('MAIL_FROM_NAME') ?? 'CLAWW', address: user },
      replyTo: user,
      to: row.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    await supabase.from('waitlist').update({ email_sent_at: new Date().toISOString(), email_error: null }).eq('id', row.id);
    return true;
  } catch (e) {
    // Keep the person on the list; "send-pending" retries them later (for example after a daily send limit).
    await supabase.from('waitlist').update({ email_error: String(e).slice(0, 500) }).eq('id', row.id);
    console.error('[join-waitlist] send failed', e);
    return false;
  }
}

function later(p: Promise<unknown>) {
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(p);
  else p.catch(() => {});
}

async function sendPending(req: Request) {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return respond(req, 401, { error: 'unauthorized' });
  if (!mailConfigured()) return respond(req, 400, { error: 'SMTP secrets are not set' });
  const { data, error } = await supabase
    .from('waitlist')
    .select('id, seq, name, email, platforms')
    .is('email_sent_at', null)
    .order('seq')
    .limit(40);
  if (error) throw error;
  let sent = 0;
  for (const row of data as Row[]) if (await sendConfirmation(row)) sent++;
  return respond(req, 200, { pending: data.length, sent });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return respond(req, 204, null);
  if (req.method !== 'POST') return respond(req, 405, { error: 'POST only' });

  try {
    if (new URL(req.url).searchParams.get('action') === 'send-pending') return await sendPending(req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return respond(req, 400, { error: 'Send the form as JSON.' });

    // Bots fill every field, including the hidden one. Pretend it worked.
    if (typeof body.company === 'string' && body.company.trim()) return respond(req, 200, { position: 0, emailSent: false });

    const name = String(body.name ?? '').trim().slice(0, 80);
    const email = String(body.email ?? '').trim().toLowerCase();
    const city = String(body.city ?? '').trim().slice(0, 80) || null;
    const platforms = Array.isArray(body.platforms) ? [...new Set(body.platforms.filter((p: unknown) => PLATFORMS.includes(p as string)))] : [];
    const interests = Array.isArray(body.interests) ? [...new Set(body.interests.filter((p: unknown) => INTERESTS.includes(p as string)))] : [];

    if (!name) return respond(req, 400, { error: 'Add your name.', field: 'name' });
    if (!EMAIL_RE.test(email) || email.length > 254) return respond(req, 400, { error: 'That email address doesn’t look right.', field: 'email' });
    if (!platforms.length) return respond(req, 400, { error: 'Pick Android, iPhone or both.', field: 'platforms' });

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
    const ipHash = ip ? await sha256(`claww-waitlist:${ip}`) : null;

    // Already on the list: show their place again instead of an error.
    const { data: existing } = await supabase.from('waitlist').select('id, seq, name, email, platforms, email_sent_at').eq('email', email).maybeSingle();
    if (existing) {
      if (!existing.email_sent_at && mailConfigured()) later(sendConfirmation(existing as Row));
      return respond(req, 200, { position: await positionOf(existing.seq), already: true, emailSent: Boolean(existing.email_sent_at) || mailConfigured() });
    }

    if (ipHash) {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await supabase.from('waitlist').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
      if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) return respond(req, 429, { error: 'Too many sign-ups from this connection. Try again in an hour.' });
    }

    const { data: row, error } = await supabase
      .from('waitlist')
      .insert({ name, email, city, platforms, interests, ip_hash: ipHash })
      .select('id, seq, name, email, platforms')
      .single();
    if (error) {
      if (error.code === '23505') return respond(req, 200, { position: 0, already: true, emailSent: false });
      throw error;
    }

    if (mailConfigured()) later(sendConfirmation(row as Row));
    return respond(req, 200, { position: await positionOf(row.seq), emailSent: mailConfigured() });
  } catch (e) {
    console.error('[join-waitlist]', e);
    return respond(req, 500, { error: 'Something went wrong on our side. Try again in a minute.' });
  }
});
