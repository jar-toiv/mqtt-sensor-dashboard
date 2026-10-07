# mqtt-sensor-dashboard

A proof of concept web dashboard for water meter readings. Users go from site to location to meter, and the readings update on screen as new data arrives in the database. Built with Nuxt 3. This is not production code.

The dashboard is the third of four services. Two of the others are in their own repositories, and the fourth is a local server that feeds demo data.

```
MQTT client  -->  mqtt-broker  -->  mqtt-listener  -->  MongoDB + InfluxDB  -->  mqtt-sensor-dashboard
```

- [mqtt-broker](https://github.com/jar-toiv/mqtt-broker) receives the messages and passes them on.
- [mqtt-listener](https://github.com/jar-toiv/mqtt-listener) stores the readings in MongoDB and InfluxDB.

The dashboard does not talk to MQTT or to the meters. It reads what the listener has written to MongoDB. The only data it writes is user accounts.

## Status

- The dashboard is deployed on DigitalOcean with Docker and Caddy.
- The project has moved from live data to demo data. No live device is connected.
- The demo data is Apator water meter readings, captured as JSON through a Teltonika TRB143 gateway.
- There are no automated tests. A GitHub Actions workflow builds the Docker image on every push and pull request to `main`.

## Features

- Drill-down view from site to location to gateway to meter, on a single page.
- Live updates without polling. MongoDB change streams are pushed to the browser over Socket.IO.
- A meter is shown as Live when it was updated within the last hour, and as Stale otherwise.
- Sign-in with a JWT in an httpOnly cookie. Two roles, `basic` and `admin`.
- Accounts are created by invitation. An admin adds an email, and the invited user chooses a password at first sign-in.
- Removing a user deactivates the account and ends an open session at once.
- An activity feed for admins that shows each change in readable form.

## Tech stack

| Concern | Choice |
|---------|--------|
| Framework | Nuxt 3 (Vue 3) with the Nitro server |
| State | Pinia, one store per entity |
| Sensor data | MongoDB native driver, database `sensorDataDB` |
| Users | Mongoose, one `User` model |
| Live updates | MongoDB change streams and Socket.IO on port `3020` |
| Logging | Winston on the server, a small console wrapper in the browser |
| Deployment | Docker and Caddy |

## How live data works

1. When a user opens a site or a location, the Pinia store fetches the data from an API route, which reads MongoDB.
2. `server/service/changeStreamManager.js` watches the `sites`, `locations`, `gateways` and `meters` collections.
3. `server/plugins/websocket.js` sends each change to the browser over Socket.IO.
4. `pages/dashboard.vue` updates the changed fields in the store, so the card on screen changes without a reload.

Change streams need a MongoDB replica set. MongoDB Atlas provides one.

## Users and access

- `server/middleware/roleCheck.js` runs on every API request. It verifies the JWT from the cookie and then checks the account in the database, so a deactivated user loses access on the next request.
- `/api/login` and `/api/set-password` are open. `/api/register` and everything under `/api/users/` are for admins only.
- An admin cannot deactivate their own account or the last active admin.
- Passwords are hashed with PBKDF2 (1000 iterations, SHA-512) and a random salt for each user. The minimum length is 8 characters.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/login` | POST | Sign in. Returns `{ firstLogin: true }` for an invited account with no password. |
| `/api/set-password` | POST | Set the first password of an invited account |
| `/api/logout` | POST | Clear the cookie |
| `/api/me` | GET | The signed-in user |
| `/api/register` | POST | Create a user directly, admin only |
| `/api/users/users` | GET | List users, admin only |
| `/api/users/invite` | POST | Invite or re-invite a user, admin only |
| `/api/users/deactivate` | POST | Deactivate a user, admin only |
| `/api/sites/sites` | GET | All sites |
| `/api/locations/:siteId` | GET | Locations of one site |
| `/api/gateways/:locationId` | GET | Gateways of one location |
| `/api/meters/:gatewayId` | GET | Meters of one gateway |

There are also routes that return all locations, all gateways and all meters.

## Running locally

You need a MongoDB replica set. The Docker image uses Node.js 24.

```bash
# Install dependencies
npm install

# Start the app, web on port 3000 and websocket on port 3020
npm run dev
```

Before the first run, create a file named `.env` in the project root. See the next section.

### Creating the first admin

There is no sign-up page, and inviting a user needs an admin. The first admin is created by hand.

1. Add `'/api/register'` to `openRoutes` in `server/middleware/roleCheck.js`.
2. Send a POST request to `/api/register` with `email`, `password` and `"role": "admin"`.
3. Remove `'/api/register'` from `openRoutes` again.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | MongoDB connection string. Must point at a replica set. |
| `JWT_SECRET` | Yes | Secret for signing the tokens |
| `JWT_EXPIRES` | Yes | Token lifetime, for example `1h` |
| `WS_URI` | No | Address the browser uses for the websocket |
| `WS_PORT` | No | Port of the Socket.IO server. Default `3020`. |
| `CLIENT_ORIGIN` | No | Allowed origin for the websocket. Default `http://localhost:3000`. |
| `LOG_LEVEL` | No | Winston log level |
| `LOG_DIR` | No | Folder for log files. Default `logs`. |

In Docker the values come from `.env.production.example` and `docker-compose.yml`.

## Deployment

`docker-compose.yml` runs two containers.

- `app` is the built Nuxt app. It serves the web on port 3000 and the websocket on port 3020.
- `caddy` is a reverse proxy on ports 80 and 443. It maps `DOMAIN` to the app and `WS_DOMAIN` to the websocket, and fetches the certificates.

```bash
cp .env.production.example .env
docker compose up -d --build
```

## Known rough edges

- The websocket server does not check who connects. The client states its own role when it registers, so the admin room is not protected.
- An invited account has no password until the user sets one. Anyone who knows the invited email can claim the account first.
- Only admins receive live updates. A `basic` user sees the data on load and nothing after that.
- `server/plugins/websocket.js` registers its change handlers at start-up and again for each connection, so one change can be sent more than once.
- Two websocket clients exist and only one runs. `pages/dashboard.vue` opens the connection that is in use. `plugins/websocket.client.js` is not called.
- `components/user/UserSettings.vue` is a stub. The form shows, and saving does nothing.
- `components/admin/SidePanel.vue` is not used anywhere.
