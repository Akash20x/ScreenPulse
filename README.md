# ScreenPulse

ScreenPulse is a private screenshot library with manual uploads, folders, personal notes, and optional AI analysis through MCP.

## Quick start

1. Follow the [web app setup guide](apps/web/README.md) to configure Supabase and environment variables.
2. From `apps/web`, run `npm install` and `npm run dev`.
3. Sign in, create a folder, and upload your screenshots.
4. Open the MCP guide in the app to connect your AI assistant when needed.

## Using ScreenPulse

- Upload up to 50 JPEG, PNG, or WebP images, up to 5 MB each, in batches of five.
- Organize screenshots into folders and arrange their order.
- Rename images, save paragraph notes, and copy or listen to notes and analysis.
- Browse with a gallery, slideshow, or image-only view with mobile gestures.
- Download images or create temporary public viewing links.
- Connect MCP to list your folders, inspect images, and save analysis when you ask.

Manual images stay in private account storage. Public viewing links allow anyone holding the link to access its image until expiry or revocation.

## Development

Run from `apps/web`:

```bash
npm test
npx tsc --noEmit
npm run build
```

The web application lives in `apps/web`. Database migrations live in `supabase/migrations`. Keep secret keys and local environment files out of source control.

## License

ScreenPulse is available under the [MIT License](LICENSE).
