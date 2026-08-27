# Sensor Dashboard

A Nuxt 3 web application for viewing water meter readings collected from M-Bus sensors in the field. Users drill down through a **Site → Location → Instrument → Meter detail** hierarchy, and readings update live on screen as new measurements arrive in the database — no page refresh, no polling.

This app is the **presentation layer** of a four-part system. It does not talk to MQTT or to the sensors itself; it reads what the ingestion services have already written to MongoDB.

## Table of Contents

- [Where this app fits](#where-this-app-fits)
- [Tech stack](#tech-stack)
- [How live data works](#how-live-data-works)
- [Data model](#data-model)
- [Users, roles and access](#users-roles-and-access)
- [API routes](#api-routes)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Logging](#logging)
- [Known rough edges](#known-rough-edges)

## Where this app fits

Data flows in one direction, from the physical meters to this dashboard:

```
M-Bus meters ──▶ Teltonika gateway ──MQTT/TLS──▶  broker  ──MQTT──▶  listener
                 (flattens M-Bus                 (Aedes)            (writes docs)
                  into JSON)                                             │
                                                                         ▼
                                                            MongoDB  ┌── sensorDataDB
                                                            InfluxDB │   sites
                                                                     │   locations
   ┌─────────────────────────────────────────────────────────────────┤   gateways
   │                                                                 └── meters
   ▼
sensor-dashboard  ──── REST reads ────▶ MongoDB
   (this repo)    ◀─── change streams ─┘
```

The two upstream services live in sibling repositories:

| Service | Role |
|---|---|
| `broker` | Aedes MQTT broker. Authenticates devices and brokers pub/sub traffic between the field gateways and the listener. |
| `listener` | Subscribes to the broker, parses each MQTT message, and upserts the Site/Location/Gateway/Meter documents into MongoDB (plus time-series points into InfluxDB). |

MQTT topics are shaped `<site>/<location>/<gateway>/<meter>`, which is exactly where the four-level hierarchy this dashboard renders comes from. The listener creates a document per topic segment and links each one to its parent.

**This dashboard is read-only with respect to sensor data.** It never writes to `sites`/`locations`/`gateways`/`meters` — the listener owns those. The only data the dashboard writes is user accounts.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Nuxt 3 (Vue 3) with the built-in Nitro server |
| State | Pinia, one store per entity |
| Database (sensor data) | MongoDB native driver, database `sensorDataDB` |
| Database (users) | Mongoose, the single `User` model |
| Real-time transport | Socket.IO on its own HTTP listener, port `3020` |
| Real-time source | MongoDB change streams |
| Auth | JWT in an httpOnly cookie (`auth-token`) |
| Logging | Winston (server), a thin console wrapper (client) |
| Deployment | Docker + Caddy (automatic HTTPS) |

There is no test suite in this project.

## How live data works

The dashboard gets data over two separate channels.

**1. Initial load — plain HTTP.** When you click a card, the matching Pinia store `fetch`es from a Nitro API route, which queries MongoDB directly. Selecting a site fetches its locations; selecting a location fetches its gateways and then, for each gateway, its meters.

**2. Updates — change streams pushed over Socket.IO.** No polling is involved:

```
listener writes to MongoDB
        │
        ▼
changeStreamManager.js      watches sites/locations/gateways/meters,
  (singleton EventEmitter)  re-emits every change as "<collection>-change"
        │
        ▼
server/plugins/websocket.js  Socket.IO server on port 3020.
        │                    Emits to the "admin" room:
        │                      site-change / location-change /
        │                      gateway-change / meter-change  (raw change docs)
        │                      data-activity                  (human-readable summary)
        ▼
pages/dashboard.vue          patches the relevant store in place via
                             apply*Update(id, updatedFields)
```

Because updates are applied field-by-field into existing store state, a meter card's reading changes on screen without anything else re-rendering or re-fetching.

The Socket.IO server runs on **port 3020, separate from Nitro's own port 3000**. It is started by a Nitro plugin, so both come up with a single `npm run dev`, but in production they are two distinct ports and Caddy proxies them as two hostnames.

**Rooms.** On connect, the client emits `register` with its user id and role. Every socket joins a private `user:<id>` room and admins additionally join the `admin` room — which is currently the only room that receives data changes. Per-user filtering by accessible sites is not implemented.

**Activity feed.** Alongside each raw change, the server builds a readable `data-activity` event: it resolves the changed document's name and turns any referenced ObjectIds into the names they point at, so an admin sees *"Meter #12345 updated Saved Volume"* rather than a wall of hex ids. `components/admin/ActivityChatBox.vue` renders these in a resizable, collapsible panel that is only mounted for admins.

## Data model

Four collections in `sensorDataDB`, each holding a reference to its parent and an array of child ids. Written by the listener, read here:

```
site      { siteName, locationIds[] }
 └─ location  { locationName, siteId, gatewayIds[] }
     └─ gateway   { gatewayName, locationId, topic, meterIds[] }
         └─ meter     { meterId, meterName, gatewayId, savedVolume,
                        instantaneousVolume, flowRate, currentEventFlags,
                        diagnostics, updatedAt }
```

The UI reads a small part of the meter document: `meterId` as the label, `savedVolume` as the headline reading (m³), `flowRate` as the secondary stat, and `updatedAt` to decide whether a meter counts as **Live** (updated within the last hour) or **Stale**.

The `users` collection is separate and is the one thing this app owns. It is accessed through Mongoose (`server/models/User.js`) rather than the native driver, because it needs schema validation and password hashing hooks.

## Users, roles and access

Two roles: `basic` and `admin`. There is no public sign-up — accounts are created by invitation.

**Invite flow.** An admin opens the gear menu → *Add user* and enters an email. That creates an active account **with no password**. When the invitee first logs in, the server recognises the passwordless account and answers `{ firstLogin: true }` instead of an error; the login form then switches to a "choose your password" step, and `POST /api/set-password` claims the account and signs the user straight in.

**Removal is deactivation, not deletion.** `POST /api/users/deactivate` flips `isActive` to `false`. Two guards apply: you cannot deactivate yourself, and you cannot deactivate the last remaining active admin. Deactivation also pushes a `force-logout` event to that user's socket room, so an open session is dropped immediately rather than surviving until its JWT expires. Re-inviting the same email reactivates the account and resets it to the passwordless invite state.

**Passwords** are hashed with `crypto.pbkdf2Sync` (1000 iterations, SHA-512) against a per-user random salt — not bcrypt. Minimum length is 8 characters.

**Request authorization** happens in `server/middleware/roleCheck.js`, which runs on every request. It reads the `auth-token` cookie, verifies the JWT, and puts the payload on `event.context.user`. Beyond verifying the token it re-checks the account against the database on every API call, so a user deactivated mid-session loses access on their next request. `/api/login` and `/api/set-password` are open; anything under `/api/users/` and `/api/register` is admin-only.

Client-side, `middleware/auth.global.js` bounces anyone who is not logged in back to `/`, and `plugins/auth.js` restores the session on page load by calling `/api/me` with the cookie.

## API routes

All under `/api`, served by Nitro from `server/routes/api/`.

| Route | Method | Purpose |
|---|---|---|
| `/api/login` | POST | Log in; returns `{ firstLogin: true }` for unclaimed invites |
| `/api/set-password` | POST | Claim an invited account by setting its first password |
| `/api/logout` | POST | Clear the auth cookie |
| `/api/me` | GET | Current session user, used to restore state on reload |
| `/api/register` | POST | Create a user directly (admin only) |
| `/api/users/users` | GET | List all users (admin only) |
| `/api/users/invite` | POST | Invite or re-invite by email (admin only) |
| `/api/users/deactivate` | POST | Deactivate an account (admin only) |
| `/api/sites/sites` | GET | All sites |
| `/api/locations/locations` | GET | All locations |
| `/api/locations/:siteId` | GET | Locations belonging to one site |
| `/api/gateways/gateways` | GET | All gateways |
| `/api/gateways/:locationId` | GET | Gateways belonging to one location |
| `/api/meters/meters` | GET | All meters |
| `/api/meters/:gatewayId` | GET | Meters belonging to one gateway |

## Getting started

**Prerequisites:** Node.js 20+, and a **MongoDB replica set** — change streams do not work against a standalone `mongod`. MongoDB Atlas satisfies this out of the box.

```bash
npm install
```

Create a `.env` in the project root (see below), then:

```bash
npm run dev       # http://localhost:3000, websocket server on :3020
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # eslint .
npm run lint:fix  # eslint --fix
```

**Creating the first admin.** There is no sign-up page, and inviting users requires an admin — so the very first account has to be created by hand.

Note that `npm install` runs under a project `.npmrc` with `ignore-scripts=true`, `save-exact=true` and `min-release-age=2` — the same supply-chain policy the `broker` repo uses. Install scripts never run, versions are pinned exactly, and no package published in the last 48 hours will be resolved.

## Environment variables

`.env` is gitignored. `.env.production.example` lists the deployment set.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string. Must point at a replica set. |
| `JWT_SECRET` | Yes | Signing secret for auth tokens. |
| `JWT_EXPIRES` | Yes | Token lifetime, e.g. `1h`. |
| `WS_URI` | No | Public URL the browser uses for the websocket. Defaults to `http://127.0.0.1:3020`. |
| `WS_PORT` | No | Port the Socket.IO server binds to. Defaults to `3020`. |
| `CLIENT_ORIGIN` | No | Allowed CORS origin for the websocket. Defaults to `http://localhost:3000`. |
| `LOG_LEVEL` | No | Winston level. Defaults to `info` in production, `debug` otherwise. |
| `LOG_DIR` | No | Where log files are written. Defaults to `logs`. |

In production these are supplied through Nuxt's runtime-config env names instead — `NUXT_MONGODB_URI`, `NUXT_JWT_SECRET`, `NUXT_JWT_EXPIRES`, `NUXT_PUBLIC_WEBSOCKET_URI` — as `docker-compose.yml` shows.

## Project structure

```
server/
├── middleware/roleCheck.js       # JWT verification + role gate on every request
├── models/User.js                # the only Mongoose model (pbkdf2 password hashing)
├── plugins/
│   ├── mongoose.js               # opens the Mongoose connection (users only)
│   └── websocket.js              # Socket.IO server on :3020, activity-event builder
├── routes/api/                   # file-based API routes, one folder per entity
├── service/
│   ├── changeStreamManager.js    # singleton watching the four collections
│   └── apiService.js             # axios wrapper used by the Pinia stores
└── utils/
    ├── db.js                     # native MongoDB client, returns the Db instance
    ├── realtime.js               # holds the io reference; forceLogout()
    ├── publicUser.js             # strips a user document down to safe fields
    └── logger.js                 # Winston setup

store/                            # Pinia, one store per entity
├── auth.js       sites.js        locations.js
├── users.js      gateways.js     meters.js
└── activity.js                   # admin live-activity feed entries

pages/
├── index.vue                     # public landing page
└── dashboard.vue                 # the whole drill-down UI + socket wiring

components/
├── common/    SiteCard, LocationCard, MeterCard, MeterDetail,
│              Breadcrumb, Header, Footer, LoginForm
├── admin/     AdminSettings (user management), ActivityChatBox (live feed)
└── user/      UserSettings

plugins/
├── auth.js                       # restores the session from the cookie on load
├── websocket.client.js           # see "Known rough edges"
└── fontawesome.js

middleware/auth.global.js         # client-side route guard
```

The whole drill-down is a single page. `pages/dashboard.vue` holds a `step` ref (`sites` → `locations` → `instruments` → `detail`) and swaps which card grid is rendered, with `Breadcrumb` offering the way back up. Nothing is routed per level.

## Deployment

`docker-compose.yml` runs two containers:

- **app** — the built Nuxt app, exposing `3000` (web) and `3020` (websocket).
- **caddy** — reverse proxy on `80`/`443`, mapping `DOMAIN` to the app and `WS_DOMAIN` to the websocket, with automatic Let's Encrypt certificates.

The `Dockerfile` is a three-stage build (deps → build → runtime) producing a slim `node:24-alpine` image that runs only `.output` as the non-root `node` user. `.github/workflows/docker-build.yml` builds the image on every push and PR to `main` as a smoke test.

```bash
cp .env.production.example .env    # fill in MONGODB_URI, JWT_*, DOMAIN, WS_DOMAIN
docker compose up -d --build
```

## Logging

Winston writes level-separated files under `logs/`:

| File | Content |
|---|---|
| `error.log` | Errors |
| `warnings.log` | Warnings — failed logins, denied access, closed change streams |
| `process.log` | Runtime processing, including every change-stream event |
| `initProcess.log` | Startup events — DB connected, websocket listening, streams watching |
| `combined.log` | Everything, JSON |
| `exceptions.log` / `rejections.log` | Uncaught exceptions and unhandled rejections |

Console output is added when `NODE_ENV !== 'production'`. On the client, `utils/clientLogger.js` is a thin `console` wrapper that silences everything outside dev.

## Known rough edges

Worth knowing before reading the code, so the duplication does not look intentional:

- **Two websocket clients exist; only one runs.** `plugins/websocket.client.js` provides an `initializeWebSocket()` helper, but nothing ever calls it — `pages/dashboard.vue` opens its own Socket.IO connection in `onMounted` instead, and that is the code path actually in use. The plugin's handlers also expect an older event shape and would not work as written. The plugin is the intended long-term home; the page-level socket is what currently works.
- **`server/plugins/websocket.js` registers its change-stream handlers twice** — once at startup and again per connection — so the same change can be emitted more than once to the admin room.
- **Only admins receive live updates.** Data changes are emitted to the `admin` room only. A `basic` user sees data on load but nothing after that. Per-user filtering by accessible sites was designed but not built.
- **`components/user/UserSettings.vue` is a stub.** The form renders but `handleSubmit` does nothing — non-admins cannot yet change their own email or password.
- **`components/admin/SidePanel.vue` is not imported anywhere.**

## Related documents

- `CHANGELOG.md` — dated, feature-by-feature history of what changed and why, including the files each change touched. Tracked in git.
