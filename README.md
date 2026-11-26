# ScreenPulse

ScreenPulse is a private visual library for screenshots you want to keep, revisit, and understand. Save study material, work references, product ideas, design inspiration, or error messages in one secure place.

## Quick start

1. Follow the [web app setup guide](apps/web/README.md) to configure Supabase and environment variables.
2. From `apps/web`, run `npm install` and `npm run dev`.
3. Sign in, create a folder, and upload your screenshots.
4. Open the MCP guide in the app to connect your AI assistant when needed.

## Using ScreenPulse

- Upload up to 50 JPEG, PNG, or WebP images at a time, up to 5 MB each, then add more whenever you need to.
- Choose a folder during upload and arrange its screenshots in your preferred order.
- Rename screenshots, write multi-paragraph notes, and copy or listen to notes and AI analysis.
- Browse with a gallery, compact list, slideshow, or image-only view with mobile swipe navigation.
- Download original images or create temporary public viewing links that can expire or be revoked.
- Connect an MCP-compatible AI assistant to list folders, inspect selected screenshots, and save explanations to the account you approve.

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
