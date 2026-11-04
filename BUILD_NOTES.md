# Build Notes and System Requirements

## Project Package

- Package name: `react-vite-tailwind`
- Package version: `0.0.0` (private application; not published as an npm package)
- Module format: ECMAScript modules (`type: module`)
- Required Node.js: `22.13.0` or newer, as declared in `package.json`
- Lockfile: npm lockfile version 3 (`package-lock.json`)

The lockfile fixes the complete transitive dependency tree. Use `npm ci --include=dev` for repeatable source builds; Vite and TypeScript are build-time development dependencies. Do not install individual transitive packages manually.

## System Requirements

### Build and local development

- Windows, macOS, or Linux can be used for development; the repository's documented local commands use PowerShell.
- Node.js 22.13 or newer and npm (included with the Node.js installation).
- Internet access for the initial npm dependency install and optional Universalis calendar sync.
- A modern browser such as current Chrome, Edge, Firefox, or Safari.
- The API listens on port `3001` by default. Vite serves the frontend on port `5173` by default and proxies `/api` to `3001`.
- The Node runtime provides the SQLite API through `node:sqlite`; there is no separate database server or SQLite npm package to install.

### Production host

- Linux VPS or another host that runs a long-lived Node.js web process.
- Node.js 22.13 or newer.
- HTTPS, required for the production `Secure` Dominus cookie.
- A writable, persistent disk for the SQLite database and its WAL sidecar files. Do not use an ephemeral filesystem.
- One application instance for the SQLite configuration. Use managed PostgreSQL before running multiple instances.
- Set the host's `PORT`, `NODE_ENV=production`, exact HTTPS `APP_ORIGIN`, `DATABASE_PATH`, `SESSION_SECRET`, `DOMINUS_USERNAME`, and `DOMINUS_PASSWORD` environment values. Drive viewer links and SQLite-stored thumbnails do not require a Google API key. Production startup fails when the required origin or credentials are missing.

A practical initial VPS for this low-volume parish site is 1 vCPU and 2 GB RAM, with persistent storage sized for the repository, database, images, and backups. This is a starting estimate, not a load-test guarantee. Monitor resource use after launch and resize if usage warrants it.

## Direct Dependencies

Versions below are the direct versions/ranges in `package.json`; `package-lock.json` records the resolved versions.

### Runtime

| Package | Declared version | Use |
| --- | --- | --- |
| `react` | `19.2.6` | UI components and application state. |
| `react-dom` | `19.2.6` | Browser rendering. |
| `express` | `^5.2.1` | API routes and production static-file server. |
| `cors` | `^2.8.6` | Configured cross-origin API access. |
| `react-markdown` | `^10.1.0` | Safely render Markdown-formatted parish articles and previews. |
| `clsx` | `2.1.1` | Conditional CSS class construction. |
| `tailwind-merge` | `3.4.0` | Resolve conflicting Tailwind utility classes. |

SQLite, sessions, password hashing, and cryptographic tokens use Node built-ins (`node:sqlite` and `node:crypto`); they have no separate runtime package dependency.

### Build and development

| Package | Declared version | Use |
| --- | --- | --- |
| `vite` | `7.3.2` | Development server and production bundler. |
| `@vitejs/plugin-react` | `5.1.1` | React integration for Vite. |
| `@tailwindcss/vite` | `4.1.17` | Tailwind CSS Vite integration. |
| `tailwindcss` | `4.1.17` | Utility CSS framework. |
| `vite-plugin-singlefile` | `2.3.0` | Inline the built JavaScript and CSS into a single HTML entry. |
| `typescript` | `5.9.3` | TypeScript compiler and type checker. |
| `@types/node` | `22.19.17` | Node.js type definitions. |
| `@types/react` | `^19.2.7` | React type definitions. |
| `@types/react-dom` | `^19.2.3` | React DOM type definitions. |

## Package Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite local frontend server. |
| `npm run server` | Start the Express API server. |
| `npm start` | Production alias for starting the Express server. |
| `npm run build` | Build the frontend into `dist/`. |
| `npm run preview` | Preview the frontend build with Vite; use the Express server to test the full production API/site combination. |
| `npm run test:server` | Run the server integration suite with Node's test runner and a temporary SQLite database. |
| `npm run sync:universalis` | Pull Universalis data and publish the local liturgical calendar. |
| `npm run sync:universalis:monthly` | Refresh the local monthly-source cache. |
| `npm run sync:universalis:weekly` | Publish the local calendar cache without pulling. |
| `npm run sync:universalis:watch` | Run the calendar publisher continuously, scheduled for Sunday midnight in the process's local timezone. |

## Build and Verify

From the project root:

```powershell
npm ci --include=dev
npm run test:server
npm run build
```

`npm run build` runs Vite using `vite.config.ts`. The `vite-plugin-singlefile` plugin emits `dist/index.html` with the JavaScript and CSS bundled inline. Files from `public/`, including images, are copied to the build output as public assets. The production Express app serves `dist/` and the `/api` routes from the same origin.

After configuring `.env`, use `npm start` to run the built site and API together. For local frontend development, run `npm run server` and `npm run dev` in separate terminals.

## Source Package and Deployment Artifact

Keep these files in source control and include them in a source deployment:

- `package.json` and `package-lock.json`
- `index.html`, `vite.config.ts`, `tsconfig.json`
- `src/`, `public/`, `scripts/`, and `server/`
- `.env.example`, `README.md`, `BUILD_NOTES.md`, and `DEPLOYMENT.md`

Do not commit or distribute `.env`, `node_modules/`, or the live SQLite database. The database belongs on the host's persistent disk and must be backed up using SQLite's online backup mechanism while the server is in WAL mode. Keep `server/data/announcements.json` as the announcement migration source and `server/data/articles.json` as the one-time first-article seed.

For a source-based deployment, the host runs `npm ci --include=dev`, `npm run build`, then `npm start`. The generated `dist/` directory is a build artifact, not a replacement for the API source: deploying only `dist/` would omit Dominus, article publishing, and announcements.

## Build Limitations

- The production build is a single HTML entry, but public images remain separate files under `dist/images/`.
- Feast days and announcements are stored in SQLite and managed in Dominus; publishing them does not require a frontend rebuild.
- The Universalis calendar sync script is deprecated and is not required for the public calendar.
- SQLite is designed here for one server instance with persistent local storage. It is not shared storage for multiple app instances.
- Article bodies support Markdown headings, bold, and italics through `react-markdown`; article image uploads are not included.
