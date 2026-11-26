# Run the ScreenPulse web app locally

This guide covers only the web application setup. For the product overview, features, and development checks, see the [repository README](../../README.md).

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project

Email/password authentication is enough to get started. Google sign-in is optional.

## 1. Install dependencies

From the repository root:

```bash
cd apps/web
npm install
```

## 2. Add local environment values

Create a copy of `.env.example` named `.env.local` in the same `apps/web` folder.

**Easiest option — use your file explorer or code editor:** right-click `.env.example`, choose **Copy** (or **Duplicate**), then rename the copy to `.env.local`.

**Or use a terminal:** run **one** of the following commands while you are inside `apps/web`.

| Your terminal | Command |
| --- | --- |
| macOS or Linux Terminal | `cp .env.example .env.local` |
| Windows PowerShell | `Copy-Item .env.example .env.local` |
| Windows Command Prompt | `copy .env.example .env.local` |

When it is successful, you should see both `.env.example` and `.env.local` in the `apps/web` folder.

Set the values in `.env.local` from your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SECRET_KEY=your-secret-key
```

`SUPABASE_SECRET_KEY` is server-only. Do not commit `.env.local`, expose this key in browser code, or use a `NEXT_PUBLIC_` name for it.

## 3. Configure Supabase

1. Create a Supabase project.
2. Enable the authentication providers you want under **Authentication → Providers**.
3. Apply the SQL migrations in [`../../supabase/migrations`](../../supabase/migrations) in filename order. Use the Supabase SQL Editor or CLI.
4. In **Authentication → URL Configuration**, add:

   ```text
   http://localhost:3000/auth/callback
   ```

5. For a deployed app, add its matching callback URL too:

   ```text
   https://your-domain.example/auth/callback
   ```

The migrations set up private screenshot storage, account-scoped access rules, folders, notes, share links, and MCP OAuth records.

### Optional: Google sign-in

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a **Web application** OAuth client.
2. Add `http://localhost:3000` under **Authorized JavaScript origins**.
3. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` under **Authorized redirect URIs**.
4. Copy the Google client ID and secret into **Supabase → Authentication → Providers → Google**.

## 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account or sign in, then create a folder and upload screenshots.

## Connect an MCP client

When the local app is running, open its setup guide:

```text
http://localhost:3000/mcp/guide
```

The guide provides current, copyable steps for supported clients. The local MCP address is:

```text
http://localhost:3000/mcp
```

For a deployed app, use `https://your-domain.example/mcp`. The client opens a browser for ScreenPulse sign-in and consent. Never paste Supabase keys or database credentials into an AI client.

## Troubleshooting

**The dashboard is empty after sign-in.** Confirm all migrations were applied to the same Supabase project used in `.env.local`.

**The authentication redirect fails.** Add the exact running app URL plus `/auth/callback` to Supabase’s redirect allow-list. `NEXT_PUBLIC_APP_URL` must match that app URL.

**MCP cannot connect.** Confirm the app is running, use the `/mcp` address shown above, and complete the browser sign-in and approval step. Remote clients generally need a public HTTPS address.

**An uploaded image does not appear.** Check the image type and size limits, then verify that the migrations and Supabase Storage policies were applied.
