# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Don Onofre" / "Alonzo Style" — a barbershop booking system. Monorepo with two independent apps, no shared root package.json:

- `client/` — React 18 + Vite SPA (public landing/booking site + admin panel), Tailwind CSS + Flowbite + MUI.
- `server/` — Express + Mongoose REST API (MongoDB), integrates WhatsApp (via a self-hosted Evolution API instance) and Web Push notifications.

Domain language is Spanish throughout the codebase (models, routes, variables: `turno` = appointment slot, `agenda` = schedule, `barbero` = barber, `horario` = time slot config, `servicio` = service). Keep new code consistent with this.

## Commands

All commands are run from within `client/` or `server/` — there is no root-level script runner.

```bash
# Client (client/)
npm run dev       # Vite dev server, http://localhost:5173
npm run build     # production build
npm run lint      # ESLint
npm run preview   # preview production build

# Server (server/)
npm start         # not defined — run directly: node server.js  (http://localhost:8000)
npm run seed:admin # run the admin user seeder standalone (scripts/runAdminSeeder.js)
```

There is no automated test suite in either package (`server`'s `npm test` is a stub). Verify server changes by hitting endpoints directly (curl/Postman) or through the client UI; verify client changes in the browser.

### Local environment

Both apps need a `.env` (see `client/.env.example` and `server/.env.example`). Server requires a running MongoDB (`MONGODB_URI`, defaults to local `mongodb://127.0.0.1:27017/OnofreDb`). WhatsApp features require the Evolution API stack, which is *not* started by `npm run dev`/`npm start` — bring it up separately:

```bash
docker compose -f docker-compose.evolution.yml up -d
```

This starts `evolution_api` (port 8081), plus its Postgres and Redis. The server's `whatsapp.service.js` talks to it via `EVOLUTION_API_URL`/`EVOLUTION_API_KEY`/`EVOLUTION_INSTANCE_NAME` env vars (defaults point at `localhost:8081` with the docker-compose's hardcoded API key). Without this stack running, WhatsApp connect/status/send endpoints will fail but the rest of the app works fine.

## Architecture

### Server structure (`server/`)

Standard Express layering: `routes/` → `controllers/` → `models/` (Mongoose), plus `services/` for business logic reused across controllers/cron, and `config/` for centralized settings.

- **`config/app.config.js`** is the single source of truth for env-derived config (port, DB, JWT secret, CORS allow-list, VAPID keys, payment keys) and has a `validate()` called at boot in `server.js` that throws in production if critical secrets are missing/default.
- **Two separate JWT auth implementations coexist**: `middleware/auth.middleware.js` (reads `JWT_SECRET`, used by `user.route.js` to protect user CRUD) and `config/jwt.config.js` (reads `SECRET`, imported by `agenda.route.js` but never actually wired into any route there). In practice **all `/api/agenda/*` routes are unauthenticated**, including destructive admin operations (`delete-and-create`, `eliminar-hoy`, `regenerar-fecha`, `limpiar-duplicados`, etc.). Be aware of this when adding new agenda endpoints or reasoning about what's protected — don't assume agenda routes are behind auth just because an `authenticate` import exists.
- **Appointment generation is barber-aware**: `services/agendaGenerator.service.js` is the current/active generator — for a given date it cross-products *active barbers* (`Barbero.activo && incluirEnAgenda`) with the day's configured `Horario` entries to create one `Agenda` (turno) document per barber per slot. `services/agendaService.js` is an older, single-barber-per-slot generator kept for the dashboard stats helper and initial-month bootstrap in `server.js`; new slot-generation logic should go through `agendaGenerator.service.js`. Both exist — don't assume one is dead code without checking call sites.
- **All appointment date/time logic must go through `utils/paraguayDate.js`** (`ParaguayDateUtil`, a `moment-timezone` wrapper pinned to `America/Asuncion`). Don't use raw `new Date()` day-boundary math for agenda queries — timezone bugs here directly cause double-booking/visibility bugs.
- **`Agenda` model** (`models/agenda.model.js`) is the central document: it embeds a snapshot of selected `servicios` (name/price/duration copied at booking time for historical accuracy, not live-joined), tracks `estado` (disponible → reservado → pagado → en_proceso → completado/no_show) and `estadoPago` independently, and auto-derives `diaSemana` from `fecha` in a pre-save hook.
- **`services/cron.service.js`** runs a `node-cron` job every minute that finds turnos ~1 hour out and sends a WhatsApp reminder via `whatsapp.service.js`, marking `recordatorioEnviado` to avoid resending. It's started once from `server.js` (`CronService.init()`).
- **WhatsApp integration** (`services/whatsapp.service.js`) is a thin axios client over the Evolution API's REST surface (instance create/delete/connect/QR/send). Paraguayan phone numbers are normalized to the `595...` international format before sending.
- **`controllers/migracion.controller.js`** and `routes/migracion.route.js` are a one-off data-migration path for moving legacy-shaped documents (`Fecha`/`Hora`/`NombreCliente` PascalCase fields) to the current schema — not part of normal request flow.
- Files suffixed `.backup.js` (e.g. `agenda.controller.backup.js`) are manually-kept snapshots, not imported anywhere — the team uses this instead of relying solely on git history for risky controller edits. Don't delete them without checking they're unreferenced, and don't treat them as live code.
- File uploads (`multer` + `sharp` for image processing, see `utils/imageProcessor.js`) are served statically from `server/uploads/` at `/uploads`; that directory is gitignored except for a `.gitkeep`.

### Client structure (`client/`)

- Vite + React Router SPA. `App.jsx` defines top-level routes: `/` (public `Landing`), `/admin` (`Login`, redirects to panel if already authed), `/admin/panel` (`Admin`, gated on `user` state), `/editar-turno/:turnoId` (public turno self-edit link, likely reached via a link sent to clients).
- Auth state lives in plain `UserContext` (`context/UserContext.js`) backed by `localStorage["user"]`, set up in `App.jsx` — there's no token refresh or route-guard middleware beyond the inline `user ? ... : <Navigate>` checks in `App.jsx`.
- **`src/config/api.config.js`** centralizes the backend base URL (`VITE_API_URL`) and every API path as a typed object — always add new endpoints here rather than hardcoding paths in components.
- **`src/hooks/useApi.js`** wraps a shared `axios` instance (`withCredentials: true`, cookie-based session) and exposes domain-grouped call helpers (`agenda`, `barberos`, `servicios`, `banners`, `contacto`, `ubicacion`, `horarios`, `notifications`, `users`, `auth`). Prefer extending this over calling `axios`/the `useAxios` hook directly in components.
- `src/hooks/useAxios.jsx` is a simpler one-off GET hook used in a few older components; `useApi.js` is the current pattern for anything beyond a trivial fetch.
- Admin UI lives under `components/panel/` (Dashboard, GestionUsuarios, WhatsappConnection) plus top-level admin components (`AdminDashboard.jsx`, `AgendaAdmin.jsx`, `FormAgendarAdmin.jsx`). `AgendaAdmin_backup.jsx` is a kept-around snapshot, same convention as the server's `.backup.js` files.
- The client is a PWA: `public/manifest.json` + `public/sw.js` + `components/NotificationManager.jsx`/`services/notificationService.js` handle install prompts and Web Push subscription, paired with the server's `webpush.config.js`/`notification.controller.js`.
- Styling: Tailwind (`tailwind.config.js`) + Flowbite React components + MUI (`@mui/material`) used together — check existing components in the same area before picking a UI library for new work.

### Cross-cutting notes

- CORS is an explicit allow-list in `server/config/app.config.js` (not a wildcard) — adding a new frontend origin (e.g. a new deployment domain) requires updating that list or the `CLIENT_URL`/`CLIENT_URL_WWW` env vars.
- Both client and server `.env.example` files are the authoritative list of required env vars; keep them in sync with any new config you add.
