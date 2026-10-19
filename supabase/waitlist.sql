-- CLAWW website waitlist. Run once against the CLAWW Supabase project.
-- Only the join-waitlist Edge Function (service role) touches this table: RLS is on with no policies,
-- so the public anon key can neither read nor write it.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  city text check (city is null or char_length(city) <= 80),
  platforms text[] not null check (cardinality(platforms) >= 1 and platforms <@ array['android', 'ios']),
  interests text[] not null default '{}' check (interests <@ array['strength', 'yoga_mobility', 'weight_loss', 'nutrition', 'steps']),
  ip_hash text,
  email_sent_at timestamptz,
  email_error text
);

create unique index if not exists waitlist_email_key on public.waitlist (lower(email));
create index if not exists waitlist_ip_recent on public.waitlist (ip_hash, created_at);

alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
