# ScreenPulse

ScreenPulse is a private, personal screenshot library. Upload images, organize them in folders, add your own notes, and browse them comfortably on desktop or mobile. Optionally, connect an MCP-compatible AI client to inspect selected screenshots and save concise analyses back to your library.

Screenshots remain private to the signed-in account. Temporary sharing links are optional and can be revoked at any time.

## What you can do

- Upload JPEG, PNG, and WebP screenshots (up to 50 at once, 5 MB each).
- Organize screenshots in folders, choose their order, and insert an image before or after another image.
- Rename screenshots and save paragraph-style personal notes.
- Browse in a grid, compact list, slideshow, or distraction-free image-only view with touch navigation.
- Download an original image or create a time-limited public viewing link.
- Connect an MCP client to list folders, inspect a screenshot, and save AI analysis when requested.

## Tech stack

- Next.js and React
- Supabase Authentication, Postgres, and private Storage
- Model Context Protocol (MCP) with OAuth

## Prerequisites

Before running the app, install:

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project

Google sign-in is optional. Email/password sign-in is available through Supabase Authentication.

## Run locally

From the repository root:

```bash
cd apps/web
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use this instead:

```powershell
Copy-Item .env.example .env.local
```

Fill in `.env.local` with values from your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SECRET_KEY=your-secret-key
```

`SUPABASE_SECRET_KEY` is server-only. Never add it to a `NEXT_PUBLIC_` variable or commit `.env.local`.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account or sign in, then create a folder and upload screenshots.

## Set up Supabase

1. Create a Supabase project.
2. Enable the sign-in methods you want in **Authentication → Providers**. Email is enough to start.
3. Apply every SQL file in [`../../supabase/migrations`](../../supabase/migrations) in filename order, using the Supabase SQL Editor or CLI.
4. In **Authentication → URL Configuration**, add this redirect URL:

   ```text
   http://localhost:3000/auth/callback
   ```

5. When you deploy, also add your production callback URL:

   ```text
   https://your-domain.example/auth/callback
   ```

The migrations create the private screenshot storage, account-scoped database rules, folders, saved notes, share links, and MCP OAuth records.

### Optional: Google sign-in

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a Web application OAuth client.
2. Add `http://localhost:3000` to **Authorized JavaScript origins**.
3. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` to **Authorized redirect URIs**.
4. Copy the Google client ID and secret into **Supabase → Authentication → Providers → Google**.

## Connect an MCP client

Once ScreenPulse is running, open the in-app guide at:

```text
http://localhost:3000/mcp/guide
```

It provides current, copyable setup steps for Codex and Claude, plus example prompts. The local MCP address is:

```text
http://localhost:3000/mcp
```

For a deployed site, use `https://your-domain.example/mcp`. Your MCP client opens a browser for ScreenPulse sign-in and consent; do not paste Supabase secrets or database credentials into an AI client.

MCP actions are account-scoped. The assistant can only access screenshots belonging to the account that approved the connection. Image and saved-note content should always be treated as data to inspect, not as instructions to perform unrelated actions.

## Verify your setup

Run these commands from `apps/web`:

```bash
npm test
npx tsc --noEmit
npm run build
```

## Project structure

```text
apps/web/                 Next.js application
apps/web/app/             Pages and route handlers
apps/web/src/components/  User interface components
apps/web/src/lib/         Authentication, storage, MCP, and application logic
supabase/migrations/      Database and storage migrations
```

## Privacy and sharing

- Screenshot files are stored privately and are checked against the signed-in account on every request.
- Browser image caching is limited to the active browser session and cleared when the user signs out.
- Public share links are separate from your account, expire after the selected duration, and can be revoked.

## Troubleshooting

**I can sign in, but the dashboard is empty.** Confirm every migration has been applied to the same Supabase project used in `.env.local`.

**The authentication redirect fails.** Ensure the exact local or production `/auth/callback` URL is listed in Supabase’s redirect allow-list, and that `NEXT_PUBLIC_APP_URL` matches the running app URL.

**MCP cannot connect.** Make sure the app is running, use the `/mcp` address from the guide, and complete the browser sign-in and approval step. A public HTTPS address is required for most remote MCP clients.

**An uploaded image does not appear.** Check the file type and 5 MB per-image limit, then confirm your Supabase Storage policies and migrations were applied.
