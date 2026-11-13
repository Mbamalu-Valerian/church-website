# Azure App Service Deployment

## Requirements

- A Linux Azure App Service Web App using Node.js 24 LTS
- GitHub Actions access to the repository and an Azure publish profile for the app
- App Service persistent storage enabled
- One running app instance while SQLite is in use

## Azure App Service Setup

In the Azure Portal, open the target Web App:

1. Select the **Linux** operating system and the **Node 24 LTS** runtime stack.
2. Set the startup command to `npm start`.
3. Under **Configuration > General settings**, enable App Service storage and set **Always On** if the plan offers it.
4. Under **Configuration > Application settings**, add the settings below. Keep `PORT` unset; App Service supplies it.
5. In the GitHub repository, add the publish profile for **this** Web App as the `AZUREAPPSERVICE_PUBLISH_PROFILE` repository secret (instructions below).
6. Under **Monitoring > Health check**, optionally set the path to `/api/health`.
7. After deployment, open `https://<app-name>.azurewebsites.net/api/health`. A healthy response includes `"ok": true` and `"database": "connected"`.

### Required application settings

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_ORIGIN` | Exact public HTTPS origins, comma-separated and without trailing slashes. For the Azure hostname: `https://hrccw-church-website.azurewebsites.net`. Add `https://hrccw.com.ng` and `https://www.hrccw.com.ng` after those custom domains are connected. |
| `DATABASE_PATH` | `/home/data/dominus.sqlite` |
| `SESSION_SECRET` | A unique random secret of at least 32 characters. |
| `DOMINUS_USERNAME` | Your private Dominus login name. |
| `DOMINUS_PASSWORD` | A unique, strong Dominus password. |
| `WEBSITE_ENABLE_APP_SERVICE_STORAGE` | `true` |

Do not set credentials in source files or commit them. In Azure, mark sensitive settings as deployment-slot settings where that option is available. `WEBSITE_HOSTNAME` is supplied by App Service and the server automatically permits its HTTPS origin; `APP_ORIGIN` must still be present in production and must include every custom domain used to access the site.

Generate a secret locally with PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

### GitHub Actions deployment

The workflow at `.github/workflows/main_hrccw-church-website.yml` runs the server tests, TypeScript check, and production build. It packages the frontend, Express server, migration seeds, and production-only dependencies, then deploys that package to `hrccw-church-website` on pushes to `main` or a manual workflow run.

To configure its credential:

1. In Azure Portal, open the **hrccw-church-website** Web App and download its publish profile from **Overview > Get publish profile**.
2. In GitHub, open **Mbamalu-Valerian/church-website > Settings > Secrets and variables > Actions**.
3. Create or update the repository secret named `AZUREAPPSERVICE_PUBLISH_PROFILE`, using the full contents of the downloaded XML file as its value.
4. If Azure will not provide a publish profile because SCM basic authentication is disabled, enable SCM basic authentication for this Web App, download the profile, then store it only in the GitHub secret. Never commit or share the XML.
5. In GitHub, open **Actions > Build and deploy to Azure App Service - hrccw-church-website** and run the workflow, or push a change to `main`.

Use the publish profile for **hrccw-church-website**, not the previous `hrccw-test` app. Never put the profile contents in a tracked file.

The workflow packages dependencies before deployment, so Azure does not need to build the app during deployment. Runtime content is deployed separately from the SQLite database, which lives at `/home/data/dominus.sqlite`.

## Production

The app serves both the Vite-built website and `/api` from the same origin. On production startup it fails explicitly if required credentials/origins or the frontend build are missing. App Service must run the deployed package with `npm start`.

In Dominus, create an event album or select an existing one, then choose multiple JPG, PNG, or WebP photos (up to 5 MB each) or a folder. The dashboard optimizes each photo and stores it with the album metadata in SQLite. Publish the photos for the site, then optionally feature an album or photo and choose an album cover. Visitors browse albums at `/gallery` and each album's photos in its detail view. Keep the SQLite database on persistent storage and back it up with the rest of the site data.

SQLite is appropriate for this single-server parish site. Keep the database on persistent storage and run one application instance; use managed PostgreSQL before scaling to multiple instances. Back up with SQLite's online backup API; do not copy only the main database file while the server is running in WAL mode. The login uses a database-backed, HttpOnly, SameSite cookie session, a scrypt password hash, origin checks, and per-process login throttling.

## Local Development

1. Copy `.env.example` to `.env` and set private local credentials. Do not commit `.env`.
2. Install dependencies with `npm ci`.
3. Run `npm run server` and `npm run dev` in separate terminals.
4. Open the Vite URL and go to `/dominus`. Vite proxies `/api` requests to the local server.

The first API start imports announcements from `server/data/announcements.json`, feast days from `src/data/ordoCalendar.json`, and the first article from `server/data/articles.json`. It also automatically creates the reserved gallery albums and moves existing photos without an album into **General Gallery**. This album migration runs once on server startup; no manual SQL or image re-upload is needed. These seed files must be present in the deployed package for a new database; subsequent changes are stored in SQLite.