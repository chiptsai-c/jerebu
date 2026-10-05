# Jerebu alerts server

A Cloudflare Worker that sends haze push alerts. Every 15 minutes it fetches the latest readings
for Malaysia's 66 DOE stations from the World Air Quality Index Project (WAQI), checks each phone's
followed stations against its alert level, and sends notifications through the Expo Push Service.

Runs within Cloudflare's free tier (Workers, Cron Triggers, D1 database).

## How alerts behave

- A phone gets **one** alert when a followed station reaches its level, and one "haze easing" alert when it drops back.
- "Back down" means 10 points below the level, and a station can't change state more than once every 2 hours,
  so a reading hovering around the level doesn't keep pinging.
- A station seen for the first time below the level is recorded silently.
- Phones that uninstall the app are removed when Expo reports `DeviceNotRegistered`.
  Phones that haven't updated their settings for 90 days are removed too.

## API

All device calls need `Authorization: Bearer <secret>`, where the secret is a random 32–128 character
string the app generates and keeps. The server stores only its SHA-256 hash.

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `PUT` | `/devices/<id>` | `{"pushToken": "ExponentPushToken[...]", "lang": "en" \| "bm", "threshold": 101 \| 151 \| 201 \| 301, "stations": ["2578", ...]}` | Registers or updates the phone. `stations` (up to 10 WAQI station IDs) replaces the previous list and should include the current nearest station. |
| `DELETE` | `/devices/<id>` | none | Stops alerts and deletes the phone's data |
| `GET` | `/health` | none | `{"ok": true}` |

`<id>` is a random ID the app generates (16–64 letters, digits or dashes).

## Announcements page

`/admin` is a password-protected web page for sending your own notifications, such as
"Schools in Selangor closed tomorrow".

- Write the message in English, and optionally BM. Phones set to BM get the BM version.
- Send to one push token (a test), to phones following stations in chosen states, or to everyone with alerts on.
- **Check reach** shows how many phones a message would go to. **Send** asks you to confirm that number first.

Turn it on by setting a long random password: `npx wrangler secret put ADMIN_PASSWORD`.
Without it, the page loads but every action answers "switched off". The page's API is
`GET /admin/api/summary` and `POST /admin/api/send`, both with `Authorization: Bearer <ADMIN_PASSWORD>`.

To get a test push token, open the Alerts tab in a development build and tap **Copy push token**.
You can also paste that token into Expo's own tool at https://expo.dev/notifications.

## Run locally

```
cd server
npm install
cp .dev.vars.example .dev.vars     # then paste your WAQI token
npm run db:migrate:local
npm run dev                        # http://127.0.0.1:8787
```

Trigger an alert run by hand: `curl "http://127.0.0.1:8787/__scheduled?cron=*/15+*+*+*+*"`.
Fake push tokens are rejected by Expo, and the server then deletes that test device. That is expected.

## Deploy

```
npx wrangler login                 # free Cloudflare account
npx wrangler d1 create jerebu      # copy the database_id it prints into wrangler.toml
npm run db:migrate:remote
npx wrangler secret put WAQI_TOKEN
npx wrangler secret put ADMIN_PASSWORD   # turns on the /admin announcements page
npm run deploy                     # prints https://jerebu-alerts.<your-subdomain>.workers.dev
```

Logs: `npx wrangler tail`, or the Workers dashboard (observability is on).

## Before going public

- **Data terms.** WAQI's terms forbid redistributing its data and ask organisations to contact them before
  public use. Get permission from WAQI, or switch to an official DOE feed, before releasing alerts to the public.
- **Privacy.** Push tokens and followed stations are personal data under Malaysia's PDPA. Publish a privacy policy.
- **Abuse.** There is no rate limiting yet. Add a Cloudflare rate-limiting rule on `/devices/*` before launch.
