# Domain Launch Checklist (`arbishield.xyz`)

Use this as a no-miss launch list.

## 1) App deployment ready
- Create a separate app repo (private is fine) that contains your full Next.js code.
- Deploy that app repo to Vercel.
- Set production environment variables in Vercel (for example `OPENROUTER_API_KEY`).
- Confirm build and runtime are green in Production.

## 2) Connect domain in Vercel
- In your Vercel project, open **Settings -> Domains**.
- Add `arbishield.xyz`.
- Add `www.arbishield.xyz`.
- Set one canonical domain (recommended: `arbishield.xyz`).

## 3) DNS at your registrar
- Copy exact DNS records shown in your Vercel domain screen.
- Add records for apex (`@`) and `www`.
- Wait for DNS verification to complete in Vercel.

## 4) Redirect and SSL
- Force HTTPS.
- Redirect `www.arbishield.xyz` -> `arbishield.xyz` (or opposite, choose one).
- Confirm SSL certificate is active for both hostnames.

## 5) Final checks before campaign submission
- Open `https://arbishield.xyz` in normal browser and private tab.
- Test wallet connect and disconnect flow.
- Test mobile view and desktop view.
- Verify no API keys are exposed in browser source or public repo.
- Update campaign links in `SUBMISSION_LINKS.md`.

## 6) Optional polish
- Add `preview.arbishield.xyz` for staging demos.
- Add simple uptime monitoring.
- Add analytics and session replay for demo troubleshooting.
