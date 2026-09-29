# ScreenPulse Chrome extension

ScreenPulse is a local-first Chrome extension for scheduled screenshots of the active browser tab. It stores images in local IndexedDB by default; uploads to a self-hosted ScreenPulse instance are optional.

## Install from source

Prerequisite: Chrome desktop and Node.js 20 or later.

```bash
npm install
npm run dev
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose `.output/chrome-mv3-dev`. The extension opens setup after installation.

For a production build, run `npm run build` and load `.output/chrome-mv3`.

## Configure and use

1. Set a start date, optional end date, and daily start/end times.
2. Select **Enable tracking** and approve the website-capture permission.
3. Use **Capture now** for a one-off screenshot, or wait for scheduled captures every 30 minutes.
4. Select **Open gallery** to view, download, or delete screenshots. **Reset gallery** permanently removes every locally saved screenshot and resets the count to zero.

Use **Pause tracking** to stop scheduled captures without deleting your schedule or gallery.

## Privacy and permissions

- Captures only the active, visible HTTP/HTTPS tab in the last-focused Chrome window.
- Never captures Incognito windows, Chrome internal pages, desktop applications, or full-page scrolls.
- Stores JPEG quality-70 images locally and stops automatic capture when the queue reaches 100 screenshots.
- Does not delete screenshots automatically.
- The `alarms` and `storage` permissions schedule captures and retain local settings. Website access is requested only when tracking is enabled, and is needed for Chrome’s visible-tab capture API.

## Optional self-hosted uploads

 To connect ScreenPulse to the companion web app:

1. Sign in to the web app, open **Devices**, and create a device token.
3. In extension **Settings**, set the upload endpoint to `https://YOUR_WEB_APP_URL/api/extension/uploads` and paste the device token.
4. Select **Test connection**. After the connection succeeds, new screenshots are saved locally first and then uploaded automatically.

The endpoint and device token are stored locally in Chrome; keep the token private.

## Verify

```bash
npm test
npm run build
```

The production unpacked extension is written to `.output/chrome-mv3`.
