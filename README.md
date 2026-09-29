# ScreenPulse

ScreenPulse is a private screenshot system made of three connected parts:

1. A Chrome extension captures scheduled screenshots of the active tab and keeps a local copy.
2. A Next.js web app receives optional uploads, manages devices, and presents a private gallery.
3. An MCP server lets an authorized AI client inspect a user's screenshots and save factual descriptions.

## Architecture and repository layout

- `app/` contains Next.js pages, route handlers, and server actions.
- `src/components/` contains web UI components. `src/lib/` contains Supabase clients, MCP/OAuth logic, upload validation, and gallery utilities.
- `extension/` is the runnable WXT Chrome extension workspace. Run extension commands from this directory or with `npm --prefix extension ...`.
- `extension/entrypoints/` contains the background service worker, options page, popup, and gallery. `extension/src/` contains capture, scheduling, IndexedDB queue, and upload logic.
- `extension/` is the sole source of truth for Chrome extension code and configuration. Do not add extension entrypoints or WXT configuration at the repository root.
- `.env.example` is the safe, committed environment-variable template. `.env.local` is machine-local and must never be committed.

## How the Chrome extension works

The extension is local-first. It captures the visible HTTP/HTTPS tab in the last-focused Chrome window, encodes it as a JPEG, and writes the capture to its local IndexedDB queue before attempting any network request. It never captures Incognito windows, Chrome internal pages, the desktop, or full-page scrolls.

When tracking is enabled, captures run every 30 minutes during the configured date and time window. The queue retains at most 100 screenshots. The popup and gallery show local and upload status; a user can pause tracking, capture immediately, retry uploads, download screenshots, or clear their local gallery.

Uploading is optional. In extension settings, the user enters the web app endpoint (`https://<app-origin>/api/extension/uploads`) and a revocable device token created in the web app. The endpoint and token are stored in Chrome local storage, not in the web app's `.env.local`. Each capture is still saved locally if an upload is unavailable or fails.

For setup, Chrome loading instructions, privacy details, and extension build commands, see the full [Chrome extension README](extension/README.md).

## How the web app works

The web app is a Next.js application deployed at the repository root. Supabase provides authentication, the database, and private screenshot storage.

1. A user signs up or signs in through the web app. Google sign-in is optional and is configured in Supabase.
2. In **Devices**, the user creates a revocable device token for one extension installation.
3. The extension sends a multipart request to `POST /api/extension/uploads` with that token.
4. The upload route validates the token, capture metadata, and image type/size; it stores the screenshot privately in Supabase Storage and records its metadata for that user.
5. The user views their uploaded screenshots in the dashboard and screenshot-detail pages.

Important web routes:

| Route | Purpose |
| --- | --- |
| `/` | Landing page and sign-in entry point |
| `/login`, `/signup`, `/auth/callback` | User authentication flow |
| `/dashboard` | Private screenshot gallery |
| `/devices` | Create and revoke extension device tokens |
| `/screenshots/[id]` | One stored screenshot and its analysis |
| `/mcp/guide` | In-app MCP connection guide |
| `/api/extension/uploads` | Extension upload API |

### Extension upload API

`POST /api/extension/uploads` requires `Authorization: Bearer <device-token>` and `multipart/form-data` fields named `screenshot`, `captureId`, `capturedAt`, `pageUrl`, `pageTitle`, and `mimeType`.

- A valid upload returns `201` with `{ "screenshotId": "..." }`.
- An already finalized `captureId` returns `409`; the extension treats this as successfully uploaded.
- `{ probe: "true" }` validates the endpoint and token without saving a screenshot.
- JPEG uploads are limited to 5 MB. Invalid input, media type, or authorization receives an appropriate `4xx` response.

## MCP server

ScreenPulse exposes an authenticated MCP endpoint at `/mcp`. It is designed for private, per-user screenshot access: every data query is scoped to the user represented by the OAuth access token.

### Connection flow

1. Set `NEXT_PUBLIC_APP_URL` to the exact local or deployed app origin.
2. Add `<app-origin>/mcp` as an MCP server in your client.
3. The client discovers the protected resource metadata at `/.well-known/oauth-protected-resource` and OAuth server metadata at `/.well-known/oauth-authorization-server`.
4. The client dynamically registers with `/oauth/register`, then starts an authorization-code flow at `/oauth/authorize` using S256 PKCE.
5. The user signs in to ScreenPulse and explicitly approves the requested scopes.
6. The client exchanges the code at `/oauth/token` and calls `/mcp` with `Authorization: Bearer <access-token>`.

No Supabase secret belongs in an MCP client. The client only receives its own OAuth tokens, and the web app uses its server-only Supabase key to perform authorized requests.

### Scopes and tools

| Scope | Available tools |
| --- | --- |
| `screenshots:read` | `get_latest_screenshot`, `get_screenshot`, `get_latest_five_screenshots`, `list_screenshots`, `list_unanalyzed_screenshots` |
| `screenshots:analysis:write` | `save_screenshot_analysis` |

`get_profile` is also available to identify the connected ScreenPulse account. Image tools return private JPEG content directly to the MCP client. Metadata may include a short-lived, 60-second manual preview URL; it is not an MCP resource and must not be logged or shared. `save_screenshot_analysis` accepts one or up to five owned screenshot IDs and stores factual descriptions for the gallery and detail view.

## Local setup

1. Create a Supabase project and enable Email Auth.
2. Apply the ScreenPulse database schema. Migration SQL is not currently included in this repository, so obtain the schema from its source before running the app.
3. Copy `.env.example` to `.env.local` and provide the Supabase URL, publishable key, app URL, and server-only secret key.
4. Install and start the web app:

   ```bash
   npm install
   npm run dev
   ```

5. Install and run the extension separately:

   ```bash
   npm --prefix extension install
   npm --prefix extension run dev
   ```

6. In the web app, create a device token, then configure the extension upload endpoint and token as described in the [extension README](extension/README.md).

## Google sign-in

1. In the [Google Auth Platform](https://console.cloud.google.com/auth/clients), create a **Web application** OAuth client and add the app origin under **Authorized JavaScript origins**.
2. Add the Supabase callback URL, `https://<project-ref>.supabase.co/auth/v1/callback`, under **Authorized redirect URIs**.
3. In Supabase **Authentication > Providers > Google**, enable Google and enter the client ID and secret.
4. In Supabase **Authentication > URL Configuration**, add `http://localhost:3000/auth/callback` and every deployed `https://<domain>/auth/callback` URL.

## Vercel deployment

Vercel deploys the root Next.js app only; the Chrome extension is built and distributed separately. Set the Vercel root directory to this repository root and configure these production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL` — deployed HTTPS origin, without a trailing slash
- `SUPABASE_SECRET_KEY` — server-only; never prefix it with `NEXT_PUBLIC_`

Add `https://<domain>/auth/callback` to Supabase redirect URLs after every domain change. `.env.local`, `.vercel/`, dependency folders, and build output are excluded from Git and deployment input; commit `.env.example` only.

## Verification

Run these checks when dependencies are available:

```bash
npm run lint
npm test
npm run build
npm --prefix extension test
npm --prefix extension run build
```
