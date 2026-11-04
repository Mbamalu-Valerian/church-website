# Dominus Deployment

## Requirements

- Node.js 22.13 or newer
- A persistent writable disk for the SQLite database
- HTTPS in production

## Local Setup

1. Copy `.env.example` to `.env` and replace `SESSION_SECRET`, `DOMINUS_PASSWORD`, and `DOMINUS_USERNAME` with private values. Do not commit `.env`.
2. Install dependencies with `npm install`.
3. Run the API and Vite in separate terminals with `npm run server` and `npm run dev`.
4. Open `/dominus` on the Vite site. The Vite proxy sends `/api` requests to port 3001.

The first API start imports existing announcements from `server/data/announcements.json` into SQLite, imports existing feast days from `src/data/ordoCalendar.json`, creates the articles table, and imports the initial published article from `server/data/articles.json` once. Later announcements, feast days, article drafts, and published posts are stored in `server/data/dominus.sqlite`; the JSON files remain as migration/seed sources. Write and preview articles in Dominus, save drafts, then publish immediately or choose a future publication date. Add feast days each week in Dominus with a title, date, category, and liturgical color. Published articles appear in the public Articles section, with previous posts kept in its archive.

## Production

Set `NODE_ENV=production`, `PORT`, `APP_ORIGIN` to the public HTTPS origin, `SESSION_SECRET` to a long random secret, and the Dominus username/password in the hosting provider's secret settings. Set `DATABASE_PATH` to a file on the host's persistent disk. Then run `npm ci --include=dev`, `npm run build`, and `npm start`.

In Dominus, choose a local folder containing JPG, PNG, or WebP photos (up to 5 MB each). The dashboard optimizes each photo and stores it with the gallery metadata in SQLite. Publish the photos for the site, then choose one as the featured display photo. Visitors browse the published photos in the built-in media viewer. Keep the SQLite database on persistent storage and back it up with the rest of the site data.

SQLite is appropriate for this single-server parish site. Keep the database on persistent storage and run one application instance; use managed PostgreSQL before scaling to multiple instances. Back up with SQLite's online backup API; do not copy only the main database file while the server is running in WAL mode. The login uses a database-backed, HttpOnly, SameSite cookie session, a scrypt password hash, origin checks, and per-process login throttling.