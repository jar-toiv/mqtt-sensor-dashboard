# Changelog

## 2026-08-12

### Access management (new feature)

- Gear icon in the header now opens a working access menu (it existed before but could never open — see Fixed).
- Admins can **add a user** by email only. The account is created with no password; the invitee sets one on their first login.
- Admins can **remove a user** via select-then-confirm: click a row to highlight it (translucent blue), then click **Delete**. Deletion is a soft delete (`isActive: false`), not a destructive one.
- Re-adding a previously removed user's email reactivates the account, clears any old password, and puts them back through the first-login flow.
- Search box filters the user list by email; the list is sorted alphabetically.
- Buttons are color-coded to match the header: **Add user** green (`rgb(65, 199, 32)`), **Delete** red (`#d32f2f`), selection uses the header's blue at 15% opacity.
- An admin cannot select or deactivate their own row, and the last remaining active admin cannot be deactivated.
- A deactivated user's session is terminated immediately if they're online (see Real-time session termination), and otherwise on their next API call.

**New files:**
- `server/routes/api/users/users.js` — admin-only user listing
- `server/routes/api/users/invite.js` — admin creates a basic user from an email
- `server/routes/api/users/deactivate.js` — admin soft-deletes a user, blocked for self / last admin
- `server/routes/api/set-password.js` — open route where an invited user claims their account
- `server/utils/publicUser.js` — allow-list of user fields safe to send to the client
- `store/users.js` — Pinia store backing the access menu

### Session persistence (new feature)

- Refreshing the page no longer logs the user out. Previously Pinia state reset on every reload while the `auth-token` cookie stayed valid, leaving the header showing "logged out" and any protected page unusable until a fresh login.
- A client plugin now restores the session from the cookie at app init.

**New files:**
- `server/routes/api/me.js` — returns the account behind the current `auth-token` cookie
- `plugins/auth.client.js` — restores the Pinia session on app init

**Changed:**
- `store/auth.js` — added `restoreSession()`
- `server/service/apiService.js` — added `auth.me()`

**Renamed:**
- `middleware/auth.js` → `middleware/auth.global.js` — the `.global` suffix is required for a Nuxt route middleware to run automatically; without it the file was never executed.

### Real-time session termination (new feature)

- When an admin deactivates a user who is currently online, that user's session is terminated immediately via a push over the existing WebSocket connection, rather than waiting for their next API call.
- The dashboard now opens a WebSocket connection for **every** logged-in user, not just admins — required so a basic user can receive the termination push. Live data-change events (site/location/gateway/meter updates) remain admin-only, gated by Socket.IO room membership on the server.

**New files:**
- `server/utils/realtime.js` — bridge letting HTTP route handlers reach connected sockets (`forceLogout`, per-user rooms)

**Changed:**
- `server/plugins/websocket.js` — every authenticated socket joins a `user:<id>` room
- `server/routes/api/users/deactivate.js` — calls `forceLogout()` after deactivating
- `pages/dashboard.vue` — connects a socket for all users, listens for `force-logout`, calls `authStore.logout()` on receipt

### Logging overhaul

- Replaced all `console.*` calls across the codebase (69 live call sites, 20 files) with structured logging.
- Server code now uses Winston (`server/utils/logger.js`); browser code uses a new lightweight shim (`utils/clientLogger.js`), since Winston's file transports depend on Node-only APIs and cannot run in the browser bundle.
- Roughly half of the former client-side calls were scratch tracing noise (e.g. value dumps with no diagnostic value) and were deleted rather than converted.
- Three call sites were logging secrets — a raw JWT and, in two settings components, the user's password — all removed.

**New files:**
- `utils/clientLogger.js` — browser-safe `error`/`warn`/`info`/`debug` logger, silences below `warn` in production

**Changed:**
- `server/utils/logger.js` — rewritten with npm-standard levels (`error: 0` … `debug: 5`, replacing an inverted scale that was silently discarding every `logger.error()` call), per-level file transports (previously every transport wrote every level regardless of its configured level), stack-trace capture, and a `combined.log`.

### Fixed

- **Login returning 500 instead of 401/403 on bad credentials.** `throw createError(...)` inside `login.js`'s own `try` block was being caught by its own `catch` and rewritten to a generic 500.
- **Open account takeover via the first-login flow.** The first-login challenge was initially keyed on the `firstLogin` schema flag, which defaults to `true` and was never set on accounts that predate this feature — so any *existing* account with a real password could have its password reset by anyone who knew the email. Fixed to key on password *absence* instead, in both `login.js` and `set-password.js`.
- **`/dashboard` returning a raw 401 JSON error instead of redirecting when logged out.** `roleCheck.js` ran on every request, including page loads, so an unauthenticated request never reached Nuxt's rendering — meaning `middleware/auth.global.js` never got a chance to run its redirect. Scoped `roleCheck.js` to `/api/` routes only; page-level auth is now handled entirely by the client middleware.
- **Settings modals could never open.** Both `AdminSettings.vue` and `UserSettings.vue` declared `isVisible` as a local `ref` instead of a prop, so the `v-if="isVisible"` passed down from `Header.vue` was always ignored.
- **Settings modals threw when closed.** Both components called `emit('update')` without declaring `defineEmits`.
- **Dev server crashing on every hot-reload.** The WebSocket server bound port 3020 from request middleware with no `error` handler; a stale listener from the previous reload caused `EADDRINUSE`, which surfaced as an uncaught exception and killed the entire Nitro worker (every route then returned 500 with `worker exited with code 0`). Moved the WebSocket server into a proper Nitro plugin (`server/plugins/websocket.js`) that registers a `close` hook so the port is actually released on reload, and added an `error` handler so a bind failure degrades to a warning instead of a crash.
- **Gateway/meter live updates never arriving.** The server emitted `gateways-update` / `meters-update`; the client listened for `gateway-change` / `meter-change`. Event names now match.
- **Change-stream listener leak.** `changeStreamManager.removeListener()` was passed an object of handlers instead of each individual function reference, so listeners accumulated on every socket connect/disconnect cycle instead of being cleaned up.
- **`store/gateways.js` crashing on password-less `User.pre('save')`.** The hook hashed unconditionally on `this.isNew`, so creating an invited user with no password threw inside `crypto.pbkdf2Sync(undefined, ...)`. Now skips hashing when there's no password to hash.
- **Password hash and salt were included in the login API response.** `login.js` now returns only `{_id, email, role, isActive, firstLogin}`.
- **`pages/dashboard.vue` crash on unmount for non-admin users.** `onUnmounted` called `socket.disconnect()` unconditionally, but `socket` was only ever assigned for admins.

### Documentation

- Added `CLAUDE.md` — architecture and command reference for future coding-assistant sessions in this repo.
