# Holy Rosary Catholic Church Website

Public parish website and private Dominus content dashboard for Holy Rosary Catholic Church, Wuse Zone 2, Abuja.

## What the Site Includes

The public website is a single scrolling page. The navigation jumps to these sections:

- **Home:** parish identity, address, contact link, and Mass timetable.
- **About:** parish introduction and parish activities.
- **Community:** parish groups organized into interactive tabs.
- **Calendar:** feast and saint days (each with its liturgical color of the day) plus published parish announcements.
- **Gallery:** photos uploaded from a local folder, stored in SQLite, and browsed in an on-site media viewer.
- **Parish Articles:** published articles, expandable full text, and an archive of past posts.
- **Pastoral Team:** bishops and parish clergy.
- **Parish Office Days:** clergy availability and office services.
- **Testimonials:** parishioner comments.
- **Contact:** church address, phone, and Google Maps location.
- **Footer:** parish identity, Mass schedule, and social links.

The private **Dominus** dashboard is at `/dominus` and is intentionally omitted from public navigation. It requires server authentication.

## Content Sources

| Content | Source | Notes |
| --- | --- | --- |
| Site copy, Mass times, activities, clergy, office days, testimonials, and links | `src/App.tsx` | Update these source files and rebuild the frontend. |
| Parish gallery photos | SQLite `gallery_images` table | Upload photos from Dominus, publish selected photos, and choose one published photo as the featured display image. |
| Liturgical feast and saint days | SQLite `feast_days` table | Create and publish in Dominus with a title, date, category, and a color of the day (Green, White, Red, or Purple). Only this Sunday-to-Saturday week's entries appear publicly. |
| Parish announcements | SQLite `announcements` table | Create and publish in Dominus. Only published events dated Sunday through Saturday of the current Abuja-time week appear publicly; items stay in SQLite outside that display window. |
| Parish articles | SQLite `articles` table | Write, preview, edit drafts, publish immediately, or schedule a future publication date in Dominus. Each post has its own writer byline. Past published articles remain in the public archive. |
| Admin accounts and sessions | SQLite `admin_users` and `sessions` tables | Login passwords are stored as scrypt hashes; sessions are stored server-side. |

On first API startup, announcement rows are imported from `server/data/announcements.json` if that table is empty. The first published article is imported once from `server/data/articles.json`; `content_migrations` records that import so deleted seed content is not restored on later restarts. New dashboard changes are stored in SQLite.

## Write and Publish an Article

1. Sign in at `/dominus`.
2. In the **Articles** area, enter a title, writer name, short introduction, full article text, and publication date. The preview updates as you type.
3. Save as a draft. Drafts are private and can be edited or deleted.
4. Publish a draft. If its publication date is today or earlier in the `Africa/Lagos` timezone, it appears in the public **Parish Articles** section. A future-dated article becomes visible automatically on its publication date.
5. Public readers can expand the article in place. Published past articles remain available in the archive.

The writer name is shown as the article byline. Existing database articles receive a default byline of “Holy Rosary Catholic Church” during the schema update; new articles require a writer name. Article bodies support Markdown headings, bold, and italics; image uploads are not currently implemented. The editor limits writer names to 100 characters, titles to 200 characters, introductions to 400 characters, and article bodies to 30,000 characters.

## Manage Parish Announcements

Create announcements in Dominus with a title, description, and date. New entries are drafts. Publish one at a time or use **Publish all drafts**. The public Calendar shows only published announcements dated from Sunday through Saturday of the current week in Abuja time. The list rolls over each Sunday; announcements outside the current week remain in the dashboard and are not deleted.

## Manage Feast Days

Create feast and saint days in Dominus each week with a title, date, category, optional description, and a **color of the day** (Green, White, Red, or Purple). New entries are drafts; publish one at a time or use **Publish all**. The public Calendar shows only published feast days dated Sunday through Saturday of the current week in Abuja time, with the selected color displayed on the day's card. The list rolls over each Sunday; feast days outside the current week remain in the dashboard.

## Manage Gallery Photos

1. In Dominus **Photo Gallery**, choose a folder from your device. JPG, PNG, and WebP files up to 5 MB each are optimized and saved to SQLite as drafts.
2. Publish the photos you want displayed. Choose **Set as display photo** on a published photo to feature it prominently.
3. Visitors can select any published photo to open the on-site viewer and browse the gallery with its previous/next controls or keyboard arrows.

The photo files and gallery metadata are stored in SQLite. No Drive API key or separate thumbnail upload is needed.

## Technology and Layout

- React 19 and TypeScript for the site and dashboard UI.
- Vite 7 for local development and production builds.
- Express 5 for the API and production static-file hosting.
- Node's built-in SQLite interface (`node:sqlite`) for announcements, articles, accounts, and sessions.
- Tailwind CSS 4 through the Vite plugin; the production build is configured as a single HTML file.
- Node.js 22.13 or newer is required.

The public page and API are served from the same origin in production. During development, Vite proxies `/api` to `http://localhost:3001`.

## Local Development

1. Install Node.js 22.13 or newer.
2. In PowerShell, create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env`. Set a private `DOMINUS_USERNAME`, a unique `DOMINUS_PASSWORD`, and a strong random `SESSION_SECRET`. For example, generate a secret with:

   ```powershell
   node -p "require('node:crypto').randomBytes(48).toString('base64url')"
   ```

   Do not commit `.env` or share its values. Login is disabled until both Dominus credentials are configured.
4. Install packages:

   ```powershell
   npm install
   ```
5. Start the API and frontend in separate terminals:

   ```powershell
   npm run server
   ```

   ```powershell
   npm run dev
   ```
6. Open the Vite URL shown in the terminal, normally `http://localhost:5173/`. The public blog is at `/#articles`; open `/dominus` for the private dashboard.

The default API port is `3001`, matching the Vite proxy. If changing the API port for development, update the proxy in `vite.config.ts` too.

### Fix a Dominus login response error

If Dominus shows an empty or invalid JSON response (including HTTP 500) after you click **Enter Dominus**, the browser did not receive the API's normal login response. During local development, HTTP 500 commonly means the Vite `/api` proxy cannot reach the API because it is not running. Run the API and Vite frontend in two separate terminals:

```powershell
npm run server
```

```powershell
npm run dev
```

With the API terminal still running, open `http://localhost:3001/api/health`. It should return JSON with `"ok": true` and `"database": "connected"`. Then reload the Vite site and retry `/dominus`. Confirm `DOMINUS_USERNAME` and `DOMINUS_PASSWORD` in `.env` match the credentials you enter; a credentials mismatch should show **Invalid username or password**, not a JSON parsing error. If the API health check works but the page still errors, restart Vite after changing `.env` or `vite.config.ts`.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production` for deployment. |
| `PORT` | HTTP port; the host may set this automatically. Defaults to `3001`. |
| `APP_ORIGIN` | Allowed browser origin, such as `https://parish.example`. In production, use the exact HTTPS origin without a trailing slash. |
| `DATABASE_PATH` | SQLite file path. In production, point this at the host's persistent disk. |
| `SESSION_SECRET` | Long random secret used to sign Dominus session cookies. Required in production. |
| `DOMINUS_USERNAME` | Private dashboard login name. Required in production. |
| `DOMINUS_PASSWORD` | Private dashboard password. Required in production. |

`VITE_API_URL` may be set at frontend build time if the API is hosted separately. By default, the frontend uses the same-origin `/api` path.

## API Reference

Public endpoints:

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | API and SQLite health status. |
| `GET /api/public/announcements` | Published announcements dated today or later in Abuja time. |
| `GET /api/public/feast-days` | Published feast days dated today or later in Abuja time, including their liturgical color. |
| `GET /api/public/articles` | Published articles whose publication date has arrived; includes past articles for the archive. |
| `GET /api/public/gallery` | Published gallery photos, names, and featured-photo status. |
| `GET /api/public/gallery/:id/image` | View a published gallery photo. |

Dominus endpoints require a valid session unless noted:

| Method and path | Purpose |
| --- | --- |
| `POST /api/login` | Authenticate using the configured username and password; sets an HttpOnly session cookie. |
| `GET /api/session` | Check the current authenticated session. |
| `POST /api/logout` | Revoke the current session. |
| `GET /api/announcements` | List all announcements, including drafts and past items. |
| `POST /api/announcements` | Create a draft announcement. |
| `PUT /api/announcements/:id/publish` | Publish one announcement. |
| `PUT /api/announcements/publish-all` | Publish all announcement drafts. |
| `DELETE /api/announcements/:id` | Permanently delete an announcement. |
| `GET /api/feast-days` | List all feast days, including drafts and past items. |
| `POST /api/feast-days` | Create a draft feast day with a title, date, category, and liturgical color. |
| `PUT /api/feast-days/:id/publish` | Publish one feast day. |
| `PUT /api/feast-days/publish-all` | Publish all feast day drafts. |
| `DELETE /api/feast-days/:id` | Permanently delete a feast day. |
| `GET /api/articles` | List all articles, including drafts and scheduled posts. |
| `POST /api/articles` | Create an article draft. |
| `PUT /api/articles/:id` | Edit an article while it is a draft. |
| `PUT /api/articles/:id/publish` | Publish an article or schedule it for its publication date. |
| `DELETE /api/articles/:id` | Permanently delete an article. |
| `GET /api/gallery` | List gallery photos, including drafts (Dominus session required). |
| `GET /api/gallery/:id/image` | View a gallery photo in the authenticated dashboard. |
| `POST /api/gallery` | Save an optimized image upload (up to 1 MB after compression) as a draft (Dominus session required). |
| `PUT /api/gallery/:id/publish` | Publish a gallery photo. |
| `PUT /api/gallery/:id/unpublish` | Return a gallery photo to draft status. |
| `PUT /api/gallery/:id/feature` | Set a published photo as the featured display image. |
| `DELETE /api/gallery/:id` | Permanently delete a gallery photo. |

Mutating requests are origin-checked. Dominus uses an HttpOnly, SameSite session cookie, scrypt password hashing, and per-process login throttling. The production cookie is Secure and requires HTTPS.

## Build and Test

See [BUILD_NOTES.md](BUILD_NOTES.md) for system requirements, dependency versions, build output, package contents, and deployment build commands.

```powershell
npm run build
npm run test:server
```

The server tests use a disposable SQLite database and exercise authentication, gallery upload, image access, publishing and featured-photo selection, schema migration, announcement visibility, feast-day color/publish flow, article draft/edit/publish/scheduling, and persistence across a server restart.

For the complete build specification, system prerequisites, direct dependency inventory, npm scripts, and package contents, see [BUILD_NOTES.md](BUILD_NOTES.md).

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Azure App Service configuration and production checklist. The current SQLite setup is for one Node server instance on a host with a persistent writable disk. Use managed PostgreSQL before running multiple app instances. Configure production secrets in the hosting provider rather than committing them; enable HTTPS and back up SQLite with its online backup API while using WAL mode.

## Project Structure

```text
src/
  App.tsx                    Public site and Dominus dashboard
  data/ordoCalendar.json     One-time feast-day migration source
  index.css                  Global styles and theme
  main.tsx                   React application entry point
server/
  index.js                   Express API, SQLite schema, auth, static hosting
  index.test.js              API integration test
  data/announcements.json    One-time SQLite migration source
  data/articles.json         One-time first-article seed
public/images/               Public parish imagery
```
