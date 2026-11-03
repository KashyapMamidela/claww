# Server push setup (V2 PHASE 3.4)

Local reminders work without any of this. These steps turn on the server-sent
nudges (missed workout next morning, streak about to break), which need
accounts only you can create. Do them in order.

## 1. Apply the database changes

Run `database/schema.sql` against the project (it's idempotent) in the
Supabase SQL editor, or:

```bash
npx supabase db query --linked --file database/schema.sql
```

This adds `push_tokens`, `push_sends` and `workout_logs.client_id`
(V2 PHASE 2.5).

## 2. Firebase (Android only — iOS needs nothing extra through Expo)

1. Go to https://console.firebase.google.com and create a project (any name,
   e.g. "CLAWW"). Analytics can stay off.
2. Add an **Android app** with package name **`com.claww.app`** (must match
   `app.json`).
3. Download **`google-services.json`** and put it at `app/google-services.json`.
4. In `app/app.json`, under `expo.android`, add:
   ```json
   "googleServicesFile": "./google-services.json"
   ```
   Don't add this line before the file exists — the build fails without it.
5. In Firebase → Project settings → **Service accounts** → **Generate new
   private key**. This downloads a JSON key. Keep it out of the repo.
6. Upload it to EAS:
   ```bash
   cd app
   npx eas-cli credentials
   ```
   Choose **Android** → the `preview` (and later `production`) profile →
   **Google Service Account** → **Manage your Google Service Account Key for
   Push Notifications (FCM V1)** → **Upload a new service account key** →
   pick the JSON from step 5.
7. Build a new APK (`npx eas-cli build --platform android --profile preview`).

Without steps 2–7 the app still works; `registerPushToken` just can't get a
token on Android, so no server pushes reach that phone.

## 3. Deploy the function and its secret

```bash
npx supabase functions deploy send-reminders --no-verify-jwt --project-ref vaweeztulqvkciuqytyi
npx supabase secrets set CRON_SECRET=<a long random value> --project-ref vaweeztulqvkciuqytyi
```

Optional: if you turn on "Enhanced security for push notifications" in the
Expo dashboard, also set `EXPO_ACCESS_TOKEN`.

## 4. Schedule it hourly (pg_cron + pg_net)

This project uses **pg_cron calling the function through pg_net** (Supabase
has no separate scheduled-functions product for this). The function runs
every hour and only acts on users whose *local* time is 09:00 (missed
workout) or 20:00 (streak), from the time zone their phone registered.

In the Supabase dashboard → Database → Extensions, enable **pg_cron** and
**pg_net**. Then, in the SQL editor (replace the secret with the same value as
`CRON_SECRET`):

```sql
-- Store the secret in Vault so it isn't written into the cron job itself.
select vault.create_secret('<same value as CRON_SECRET>', 'claww_cron_secret');

select cron.schedule(
  'claww-send-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://vaweeztulqvkciuqytyi.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'claww_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

To stop it: `select cron.unschedule('claww-send-reminders');`

## 5. Check it

- `select * from cron.job_run_details order by start_time desc limit 5;` —
  the job runs.
- Call it by hand: `curl -X POST -H "x-cron-secret: <value>"
  https://vaweeztulqvkciuqytyi.supabase.co/functions/v1/send-reminders` →
  `{"candidates": N, "sent": M, ...}`. `candidates` is 0 outside 09:00/20:00
  local for every registered user, which is expected.
- `select * from push_tokens;` — a row appears after you turn reminders on in
  a build that has FCM set up.

## Rules the function follows

- At most 2 notifications a day per user, counting the phone's own local
  reminders (it replays which ones fired today) plus pushes already sent.
- Never the same nudge twice a day (`push_sends` unique key).
- Missed workout: only for users with a plan who trained in the week before
  yesterday, didn't train yesterday and didn't tap Skip — and only if the
  Workout reminder switch is on.
- Streak: only for a streak of 2+ days ending yesterday with nothing logged
  today, and only if at least one reminder type is on.
- Tokens Expo reports as `DeviceNotRegistered` are deleted.
