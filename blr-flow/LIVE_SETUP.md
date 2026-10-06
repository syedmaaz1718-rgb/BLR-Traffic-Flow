# Real live traffic mode: TomTom + Netlify Functions

## What is real, and what is not

The live panel retrieves current estimated speed, reference free-flow speed, travel time, road-closure status and provider confidence from TomTom Flow Segment Data. TomTom lists India in its flow coverage. Each request returns the road fragment nearest one of six fixed Bengaluru location anchors, not necessarily the exact junction, direction, or whole route.

The separate 24-hour random-forest graph remains SYNTHETIC, trained on generated data. It does not use the snapshot, and is not a measured real-world forecast. No model trained on historical Bengaluru observations is included. Building that needs lawful historical collection, enough observations and temporal held-out validation. Current traffic is not future prediction.

**Verification boundary:** adapter and UI success/error branches are tested with deterministic fixtures. No authenticated provider response or deployed Netlify endpoint was tested because no operator API key was supplied. After deployment, fetch a snapshot and verify actual coverage/entitlement.

## Free API account and key

Checked October 6, 2026: official pricing lists **Traffic Flow API Segment Data: 20,000 free requests/month**, no upfront credit card. Older 2,500 non-tile/day articles are not the current allowance. The exact account/product entitlement and overage behavior must be confirmed in your dashboard before enabling it. Do not add paid billing or auto-top-ups just to run a portfolio demo.

1. Open https://docs.tomtom.com/platform/documentation/my-tomtom/how-to-get-a-tomtom-api-key/ and follow its Register/Sign in route to create a TomTom account.
2. Complete email verification if requested; open the dashboard's **API & SDK Keys**.
3. Official instructions say a **My first API key** is already created. Select it, or create a dedicated key for BLR Flow. Confirm that **Traffic Flow API Segment Data** is enabled/available for that key.
4. Read the plan/terms shown for your account. Check usage/allowances in Analytics. Choose the free option; keep paid upgrades/auto-top-ups disabled. Review restrictions before retaining or redistributing traffic data.
5. Copy the key directly into Netlify's server-side environment settings below. Never send it in chat, put it in GitHub, enter it in the app, or name it VITE_TOMTOM_API_KEY.

Official sources:
- https://docs.tomtom.com/pricing/
- https://docs.tomtom.com/platform/documentation/my-tomtom/how-to-get-a-tomtom-api-key/
- https://docs.tomtom.com/platform/documentation/my-tomtom/api-key-management/
- https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/traffic-flow/flow-segment-data
- https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/product-information/market-coverage
- https://developer.tomtom.com/legal (account terms may require sign-in; no blanket right to store/redistribute is claimed)

HERE was considered: its current developer billing documentation says payment information up front, consumption-based overages and separate Traffic allowances. TomTom's explicit no-card segment allowance is simpler for this small manual-snapshot app. https://docs.here.com/here-kb/docs/how-is-billing-for-a-developer-here-platform-account

## Full-source Netlify deploy (required for LIVE)

**Dragging dist to Netlify Drop only deploys the static simulator. It does NOT create this source function.**

1. Extract the ZIP. Create your own GitHub repository and put the CONTENTS of this project at root (package.json, netlify.toml, src/, netlify/ etc). Do not include node_modules, .env or the provider key.
2. In Netlify, Add new project / Import an existing project, select GitHub and this repository.
3. Build command `npm run build`, publish `dist`, functions `netlify/functions`. netlify.toml already supplies these. Node version `22.23.3`.
4. In Project configuration / Environment variables, add **TOMTOM_API_KEY** with the copied key. Use All scopes or include Functions if your plan offers scopes. Do NOT put this value in netlify.toml, which does not supply function-runtime secrets.
5. Optional but recommended for a privately shared demo: add **LIVE_ACCESS_TOKEN** with a strong password, separately from the provider key. Visitors must enter this password in the live panel. Leave unset only if you intentionally want a public endpoint.
6. Redeploy after adding/changing variables. Open the app, scroll to Live traffic, select an anchor and click Fetch live snapshot. Open Functions/logs in Netlify if needed, but never log the upstream URL/key.
7. Confirm one genuine provider snapshot. 401 indicates the optional demo password, 502 may indicate invalid key/entitlement/coverage, 429 indicates provider or platform rate limit, 503 indicates missing server key. There is no fake live fallback.

Reference:
- https://docs.netlify.com/build/functions/configuration
- https://docs.netlify.com/build/functions/environment-variables/
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting

## Local development

`npm ci && npm test && npm run dev` runs Vite/simulator. For the live function, install/use Netlify CLI, create `.env` from `.env.example`, set server secrets privately, then run `npx netlify dev`. CLI sign-in/linking may be needed. The ordinary Vite server does not implement /api/traffic.

## Security, quota and storage

- Server reads process.env.TOMTOM_API_KEY; browser never receives it. Inputs are allowlisted integer anchors; cannot proxy arbitrary URLs.
- POST-only; optional password, timeouts, sanitized errors, strict numeric provider validation, Cache-Control:no-store. No database, local storage, export or archival of live data. Do not collect history until permitted by provider terms.
- Only explicit button clicks, one upstream request each. No polling. Six requests/minute/IP via Netlify's function config; confirm rule acceptance in deploy logs. A per-IP limit is NOT a global monthly cap and can be bypassed by distributed visitors. A public endpoint can consume your allowance. Use the password for a private demo, monitor dashboard usage and disable/remove the key if abused.
- No assertion that Netlify hosting/function invocations are unlimited/free. Review current Netlify plan credits and spend settings separately. No paid deployment was performed.
- Traffic data © TomTom shown in UI. Retrieval timestamp is our fetch time, not provider measurement time. Confidence is provider data quality, not ML accuracy.
- Anchors were geocoded from the named Bengaluru places. KR Puram uses the station-area anchor; Electronic City is an approximate locality anchor. TomTom chooses nearest available road segment. Actual segment availability/direction remains unverified until your key is used.
