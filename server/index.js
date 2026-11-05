import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = Number(process.env.PORT || 3001);
const production = process.env.NODE_ENV === 'production';

const isAzureAppService = Boolean(process.env.WEBSITE_INSTANCE_ID);
const defaultDatabasePath = isAzureAppService
  ? path.join(process.env.HOME || '/home', 'data', 'dominus.sqlite')
  : path.join(__dirname, 'data', 'dominus.sqlite');

const databasePath = path.resolve(process.env.DATABASE_PATH || defaultDatabasePath);
const legacyDataPath = path.join(__dirname, 'data', 'announcements.json');
const articleSeedPath = path.join(__dirname, 'data', 'articles.json');
const distPath = path.join(__dirname, '..', 'dist');
const sessionDurationMs = 12 * 60 * 60 * 1000;
const cookieName = 'dominus.sid';
const sessionSecret = process.env.SESSION_SECRET || randomBytes(48).toString('base64url');

const azureHostname = process.env.WEBSITE_HOSTNAME ? `https://${process.env.WEBSITE_HOSTNAME}` : null;
const rawOrigins = process.env.APP_ORIGIN || (production ? '' : 'http://localhost:5173,http://127.0.0.1:5173');
const allowedOrigins = new Set(
  rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean),
);
if (azureHostname) allowedOrigins.add(azureHostname);

const feastColorValues = new Set(['#16a34a', '#ffffff', '#b91c1c', '#6b21a8']);

if (production) {
  const missing = [];
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!process.env.DOMINUS_USERNAME) missing.push('DOMINUS_USERNAME');
  if (!process.env.DOMINUS_PASSWORD) missing.push('DOMINUS_PASSWORD');
  if (allowedOrigins.size === 0) missing.push('APP_ORIGIN');
  if (missing.length > 0) {
    throw new Error(`Production requires: ${missing.join(', ')}. Set them in Azure > Configuration > Application settings.`);
  }
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Published'))
  );
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author_name TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    body TEXT NOT NULL,
    publish_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Published')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS feast_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Memorial',
    color TEXT NOT NULL DEFAULT '#16a34a',
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Published'))
  );
  CREATE TABLE IF NOT EXISTS gallery_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    caption TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Published')),
    thumbnail_data TEXT NOT NULL DEFAULT '',
    viewer_url TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT NOT NULL DEFAULT '',
    is_featured INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    username TEXT PRIMARY KEY,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    username TEXT NOT NULL REFERENCES admin_users(username) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS content_migrations (
    name TEXT PRIMARY KEY,
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const galleryColumns = database.prepare('PRAGMA table_info(gallery_images)').all();
if (!galleryColumns.some((column) => column.name === 'thumbnail_data')) {
  database.exec("ALTER TABLE gallery_images ADD COLUMN thumbnail_data TEXT NOT NULL DEFAULT ''");
}
if (!galleryColumns.some((column) => column.name === 'viewer_url')) {
  database.exec("ALTER TABLE gallery_images ADD COLUMN viewer_url TEXT NOT NULL DEFAULT ''");
}
if (!galleryColumns.some((column) => column.name === 'thumbnail_url')) {
  database.exec("ALTER TABLE gallery_images ADD COLUMN thumbnail_url TEXT NOT NULL DEFAULT ''");
}
if (!galleryColumns.some((column) => column.name === 'is_featured')) {
  database.exec('ALTER TABLE gallery_images ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0');
}

const articleColumns = database.prepare('PRAGMA table_info(articles)').all();
if (!articleColumns.some((column) => column.name === 'author_name')) {
  database.exec("ALTER TABLE articles ADD COLUMN author_name TEXT NOT NULL DEFAULT 'Holy Rosary Catholic Church'");
}

const articleSeedMigration = 'initial-parish-articles-v1';
const articleSeedApplied = database.prepare('SELECT name FROM content_migrations WHERE name = ?').get(articleSeedMigration);
if (!articleSeedApplied && fs.existsSync(articleSeedPath)) {
  const seededArticles = JSON.parse(fs.readFileSync(articleSeedPath, 'utf8'));
  const insertArticle = database.prepare(`
    INSERT OR IGNORE INTO articles (slug, title, author_name, excerpt, body, publish_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const markMigration = database.prepare('INSERT INTO content_migrations (name) VALUES (?)');
  database.exec('BEGIN IMMEDIATE');
  try {
    for (const article of seededArticles) {
      const title = String(article.title || '').trim();
      const authorName = String(article.authorName || '').trim();
      const excerpt = String(article.excerpt || '').trim();
      const body = String(article.body || '').trim();
      const publishDate = String(article.publishDate || '');
      const parsedDate = new Date(`${publishDate}T00:00:00.000Z`);
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(publishDate)
        && !Number.isNaN(parsedDate.valueOf())
        && parsedDate.toISOString().slice(0, 10) === publishDate;
      if (!title || !authorName || !excerpt || !body || !validDate) continue;
      const slug = String(article.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      insertArticle.run(slug, title, authorName, excerpt, body, publishDate, article.status === 'Published' ? 'Published' : 'Draft');
    }
    markMigration.run(articleSeedMigration);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

const announcementCount = database.prepare('SELECT COUNT(*) AS count FROM announcements').get().count;
if (announcementCount === 0 && fs.existsSync(legacyDataPath)) {
  const legacyAnnouncements = JSON.parse(fs.readFileSync(legacyDataPath, 'utf8'));
  const importAnnouncement = database.prepare(`
    INSERT OR IGNORE INTO announcements (id, title, description, date, status) VALUES (?, ?, ?, ?, ?)
  `);
  database.exec('BEGIN IMMEDIATE');
  try {
    for (const entry of legacyAnnouncements.filter((item) => item.title && item.description)) {
      importAnnouncement.run(
        Number(entry.id) || null,
        String(entry.title || '').trim(),
        String(entry.description || '').trim(),
        /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : new Date().toISOString().slice(0, 10),
        entry.status === 'Published' ? 'Published' : 'Draft',
      );
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

const feastDaySeedPath = path.join(__dirname, '..', 'src', 'data', 'ordoCalendar.json');
const feastDaySeedMigration = 'initial-feast-days-v1';
const feastDaySeedApplied = database.prepare('SELECT name FROM content_migrations WHERE name = ?').get(feastDaySeedMigration);
if (!feastDaySeedApplied && fs.existsSync(feastDaySeedPath)) {
  const seedFeastDays = JSON.parse(fs.readFileSync(feastDaySeedPath, 'utf8'))
    .filter((entry) => entry.group === 'Feast & Saint Days' && entry.title && entry.date);
  const insertFeastDay = database.prepare(`
    INSERT INTO feast_days (date, title, description, category, color, status)
    VALUES (?, ?, ?, ?, ?, 'Published')
  `);
  const markFeastMigration = database.prepare('INSERT INTO content_migrations (name) VALUES (?)');
  database.exec('BEGIN IMMEDIATE');
  try {
    for (const entry of seedFeastDays) {
      const title = String(entry.title).trim();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : new Date().toISOString().slice(0, 10);
      const description = String(entry.description || '').trim();
      const category = String(entry.category || 'Memorial').trim();
      const color = feastColorValues.has(entry.liturgicalColor || entry.color)
        ? (entry.liturgicalColor || entry.color)
        : (/martyr/i.test(title) ? '#b91c1c' : '#ffffff');
      insertFeastDay.run(date, title, description, category, color);
    }
    markFeastMigration.run(feastDaySeedMigration);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

if (process.env.DOMINUS_USERNAME && process.env.DOMINUS_PASSWORD) {
  const salt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(process.env.DOMINUS_PASSWORD, salt, 64).toString('hex');
  database.prepare(`
    INSERT INTO admin_users (username, password_salt, password_hash) VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET password_salt = excluded.password_salt, password_hash = excluded.password_hash
  `).run(process.env.DOMINUS_USERNAME, salt, passwordHash);
} else {
  console.warn('Dominus login is disabled until DOMINUS_USERNAME and DOMINUS_PASSWORD are configured.');
}

const makeTokenHash = (token) => createHash('sha256').update(token).digest('hex');
const signToken = (token) => createHmac('sha256', sessionSecret).update(token).digest('base64url');
const serializeAnnouncement = (row) => ({ id: row.id, title: row.title, description: row.description, date: row.date, status: row.status });
const serializeArticle = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  authorName: row.author_name,
  excerpt: row.excerpt,
  body: row.body,
  publishDate: row.publish_date,
  status: row.status,
});
const serializeFeastDay = (row) => ({
  id: row.id,
  date: row.date,
  title: row.title,
  description: row.description,
  category: row.category,
  color: row.color,
  status: row.status,
});
const serializeGalleryImage = (row) => ({
  id: row.id,
  fileId: row.file_id,
  caption: row.caption,
  status: row.status,
  thumbnailUrl: row.thumbnail_data
    ? `${row.status === 'Published' ? '/api/public/gallery' : '/api/gallery'}/${row.id}/image`
    : row.thumbnail_url,
  viewerUrl: row.viewer_url,
  isFeatured: Boolean(row.is_featured),
});
const galleryImageColumns = 'id, file_id, caption, status, thumbnail_data, viewer_url, thumbnail_url, is_featured';
const parseGalleryImageData = (value) => {
  if (typeof value !== 'string') return null;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;
  const data = Buffer.from(match[2], 'base64');
  if (data.length === 0 || data.length > 5 * 1024 * 1024) return null;
  const validSignature = match[1] === 'jpeg'
    ? data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
    : match[1] === 'png'
      ? data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  return validSignature ? { data, dataUrl: value, contentType: `image/${match[1]}` } : null;
};
const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const getParishDate = () => {
  const dateParts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => dateParts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const getParishWeek = () => {
  const date = new Date(`${getParishDate()}T00:00:00.000Z`);
  const daysSinceSunday = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - daysSinceSunday);
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 7);
  return { start, end: date.toISOString().slice(0, 10) };
};

const getSessionToken = (req) => {
  const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  let tokenValue;
  try {
    tokenValue = decodeURIComponent(cookie.slice(cookieName.length + 1));
  } catch {
    return null;
  }
  const [token, signature] = tokenValue.split('.');
  if (!token || !signature) return null;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(signToken(token));
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? token : null;
};

const setSessionCookie = (res, token) => {
  const attributes = [
    `${cookieName}=${encodeURIComponent(`${token}.${signToken(token)}`)}`,
    'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${Math.floor(sessionDurationMs / 1000)}`,
  ];
  if (production) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
};

const clearSessionCookie = (res) => {
  const attributes = [`${cookieName}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (production) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
};

const requireSameOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ ok: false, error: 'Request origin is not allowed.' });
  return next();
};

const requireSession = (req, res, next) => {
  const token = getSessionToken(req);
  if (!token) return res.status(401).json({ ok: false, error: 'Authentication required.' });
  const session = database.prepare('SELECT username FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(makeTokenHash(token), Date.now());
  if (!session) return res.status(401).json({ ok: false, error: 'Session expired. Please sign in again.' });
  req.dominusUsername = session.username;
  return next();
};

const loginAttempts = new Map();
const checkLoginRateLimit = (req, res, next) => {
  const now = Date.now();
  const address = req.ip || req.socket.remoteAddress || 'unknown';
  const attempts = (loginAttempts.get(address) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (attempts.length >= 10) return res.status(429).json({ ok: false, error: 'Too many login attempts. Try again later.' });
  loginAttempts.set(address, attempts);
  req.recordFailedLogin = () => loginAttempts.set(address, [...attempts, Date.now()]);
  req.clearLoginAttempts = () => loginAttempts.delete(address);
  return next();
};

app.disable('x-powered-by');
if (production) app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return requireSameOrigin(req, res, next);
  return next();
});

app.get('/api/health', (req, res) => {
  try {
    database.prepare('SELECT 1').get();
    res.json({ ok: true, service: 'Dominus API', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, service: 'Dominus API', database: 'unavailable' });
  }
});

app.post('/api/login', checkLoginRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  const admin = typeof username === 'string'
    ? database.prepare('SELECT username, password_salt, password_hash FROM admin_users WHERE username = ?').get(username)
    : null;
  const salt = admin?.password_salt || 'dominus-invalid-user-salt';
  const expectedHash = admin?.password_hash || scryptSync('invalid-user-password', salt, 64).toString('hex');
  const passwordHash = scryptSync(typeof password === 'string' ? password : '', salt, 64).toString('hex');
  const valid = timingSafeEqual(Buffer.from(passwordHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  if (!admin || !valid) {
    req.recordFailedLogin();
    return res.status(401).json({ ok: false, error: 'Invalid username or password.' });
  }

  req.clearLoginAttempts();
  database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  const token = randomBytes(32).toString('base64url');
  database.prepare('INSERT INTO sessions (token_hash, username, expires_at) VALUES (?, ?, ?)')
    .run(makeTokenHash(token), admin.username, Date.now() + sessionDurationMs);
  setSessionCookie(res, token);
  return res.json({ ok: true, authenticated: true });
});

app.get('/api/session', requireSession, (req, res) => {
  res.json({ ok: true, authenticated: true, username: req.dominusUsername });
});

app.post('/api/logout', (req, res) => {
  const token = getSessionToken(req);
  if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(makeTokenHash(token));
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/public/announcements', (req, res) => {
  const { start, end } = getParishWeek();
  const announcements = database.prepare(`
    SELECT id, title, description, date, status FROM announcements
    WHERE status = 'Published' AND date >= ? AND date < ? ORDER BY date, id
  `).all(start, end).map(serializeAnnouncement);
  res.json({ ok: true, data: announcements });
});

app.get('/api/public/articles', (req, res) => {
  const articles = database.prepare(`
    SELECT id, slug, title, author_name, excerpt, body, publish_date, status FROM articles
    WHERE status = 'Published' AND publish_date <= ? ORDER BY publish_date DESC, id DESC
  `).all(getParishDate()).map(serializeArticle);
  res.json({ ok: true, data: articles });
});

app.get('/api/public/gallery', (req, res) => {
  const images = database.prepare(`
    SELECT ${galleryImageColumns} FROM gallery_images
    WHERE status = 'Published' AND (thumbnail_data <> '' OR (thumbnail_url <> '' AND viewer_url <> ''))
    ORDER BY is_featured DESC, id DESC
  `).all().map(serializeGalleryImage);
  return res.json({ ok: true, data: images });
});

app.get('/api/public/gallery/:id/image', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
  const image = database.prepare(`
    SELECT thumbnail_data FROM gallery_images WHERE id = ? AND status = 'Published'
  `).get(id);
  const parsedImage = parseGalleryImageData(image?.thumbnail_data);
  if (!parsedImage) return res.status(404).end();
  res.setHeader('Content-Type', parsedImage.contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(parsedImage.data);
});

app.get('/api/gallery', requireSession, (req, res) => {
  const images = database.prepare(`
    SELECT ${galleryImageColumns} FROM gallery_images
    WHERE thumbnail_data <> '' OR (thumbnail_url <> '' AND viewer_url <> '')
    ORDER BY id DESC
  `).all().map(serializeGalleryImage);
  return res.json({ ok: true, data: images });
});

app.get('/api/gallery/:id/image', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
  const image = database.prepare('SELECT thumbnail_data FROM gallery_images WHERE id = ?')
    .get(id);
  const parsedImage = parseGalleryImageData(image?.thumbnail_data);
  if (!parsedImage) return res.status(404).end();
  res.setHeader('Content-Type', parsedImage.contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.send(parsedImage.data);
});

app.post('/api/gallery', requireSession, (req, res) => {
  const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';
  const thumbnail = parseGalleryImageData(req.body?.imageData);
  if (!caption || caption.length > 120 || !thumbnail || thumbnail.contentType !== 'image/jpeg' || thumbnail.data.length > 1024 * 1024) {
    return res.status(400).json({
      ok: false,
      error: 'Enter an image name and a valid compressed JPEG image no larger than 1 MB.',
    });
  }
  const result = database.prepare(`
    INSERT INTO gallery_images (file_id, caption, status, thumbnail_data, viewer_url, thumbnail_url)
    VALUES ('', ?, 'Draft', ?, '', '')
  `).run(caption, thumbnail.dataUrl);
  const image = database.prepare(`SELECT ${galleryImageColumns} FROM gallery_images WHERE id = ?`)
    .get(Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: serializeGalleryImage(image) });
});

app.put('/api/gallery/:id/publish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery image.' });
  const result = database.prepare(`
    UPDATE gallery_images SET status = 'Published'
    WHERE id = ? AND thumbnail_data <> ''
  `).run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Gallery image not found.' });
  return res.json({ ok: true });
});

app.put('/api/gallery/:id/unpublish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery image.' });
  const result = database.prepare("UPDATE gallery_images SET status = 'Draft', is_featured = 0 WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Gallery image not found.' });
  return res.json({ ok: true });
});

app.put('/api/gallery/:id/feature', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery image.' });
  const image = database.prepare(`
    SELECT id FROM gallery_images WHERE id = ? AND status = 'Published' AND thumbnail_data <> ''
  `).get(id);
  if (!image) return res.status(404).json({ ok: false, error: 'Publish this gallery image before featuring it.' });
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('UPDATE gallery_images SET is_featured = 0').run();
    database.prepare('UPDATE gallery_images SET is_featured = 1 WHERE id = ?').run(id);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return res.json({ ok: true });
});

app.delete('/api/gallery/:id', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery image.' });
  const result = database.prepare('DELETE FROM gallery_images WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Gallery image not found.' });
  return res.json({ ok: true });
});

app.get('/api/articles', requireSession, (req, res) => {
  const articles = database.prepare('SELECT * FROM articles ORDER BY publish_date DESC, id DESC')
    .all().map(serializeArticle);
  res.json({ ok: true, data: articles });
});

app.post('/api/articles', requireSession, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const authorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
  const excerpt = typeof req.body?.excerpt === 'string' ? req.body.excerpt.trim() : '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  const publishDate = typeof req.body?.publishDate === 'string' ? req.body.publishDate : getParishDate();
  if (!title || title.length > 200 || !authorName || authorName.length > 100 || !excerpt || excerpt.length > 400 || !body || body.length > 30000 || !isValidDate(publishDate)) {
    return res.status(400).json({ ok: false, error: 'Enter a title, writer name, excerpt, article text, and valid publication date.' });
  }

  const baseSlug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'article';
  const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
  const result = database.prepare(`
    INSERT INTO articles (slug, title, author_name, excerpt, body, publish_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Draft')
  `).run(slug, title, authorName, excerpt, body, publishDate);
  const article = database.prepare('SELECT * FROM articles WHERE id = ?').get(Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: serializeArticle(article) });
});

app.put('/api/articles/:id', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const existing = database.prepare('SELECT status FROM articles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Article not found.' });
  if (existing.status !== 'Draft') return res.status(409).json({ ok: false, error: 'Only draft articles can be edited.' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const authorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
  const excerpt = typeof req.body?.excerpt === 'string' ? req.body.excerpt.trim() : '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  const publishDate = typeof req.body?.publishDate === 'string' ? req.body.publishDate : '';
  if (!title || title.length > 200 || !authorName || authorName.length > 100 || !excerpt || excerpt.length > 400 || !body || body.length > 30000 || !isValidDate(publishDate)) {
    return res.status(400).json({ ok: false, error: 'Enter a title, writer name, excerpt, article text, and valid publication date.' });
  }

  database.prepare(`
    UPDATE articles SET title = ?, author_name = ?, excerpt = ?, body = ?, publish_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(title, authorName, excerpt, body, publishDate, id);
  const article = database.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  return res.json({ ok: true, data: serializeArticle(article) });
});

app.put('/api/articles/:id/publish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const result = database.prepare("UPDATE articles SET status = 'Published', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Article not found.' });
  const article = database.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  return res.json({ ok: true, data: serializeArticle(article) });
});

app.delete('/api/articles/:id', requireSession, (req, res) => {
  const result = database.prepare('DELETE FROM articles WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Article not found.' });
  return res.json({ ok: true });
});

app.get('/api/announcements', requireSession, (req, res) => {
  const announcements = database.prepare('SELECT * FROM announcements ORDER BY date DESC, id DESC')
    .all().map(serializeAnnouncement);
  res.json({ ok: true, data: announcements });
});

app.post('/api/announcements', requireSession, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const date = typeof req.body?.date === 'string' ? req.body.date : new Date().toISOString().slice(0, 10);
  if (!title || !description || title.length > 200 || description.length > 5000 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ ok: false, error: 'Enter a valid title, description, and date.' });
  }
  const result = database.prepare("INSERT INTO announcements (title, description, date, status) VALUES (?, ?, ?, 'Draft')")
    .run(title, description, date);
  const announcement = database.prepare('SELECT * FROM announcements WHERE id = ?').get(Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: serializeAnnouncement(announcement) });
});

app.put('/api/announcements/:id/publish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const result = database.prepare("UPDATE announcements SET status = 'Published' WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Announcement not found.' });
  const announcement = database.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  return res.json({ ok: true, data: serializeAnnouncement(announcement) });
});

app.put('/api/announcements/publish-all', requireSession, (req, res) => {
  const result = database.prepare("UPDATE announcements SET status = 'Published' WHERE status = 'Draft'").run();
  return res.json({ ok: true, published: result.changes });
});

app.delete('/api/announcements/:id', requireSession, (req, res) => {
  const result = database.prepare('DELETE FROM announcements WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Announcement not found.' });
  return res.json({ ok: true });
});

app.get('/api/public/feast-days', (req, res) => {
  const { start, end } = getParishWeek();
  const feastDays = database.prepare(`
    SELECT id, date, title, description, category, color, status FROM feast_days
    WHERE status = 'Published' AND date >= ? AND date < ? ORDER BY date, id
  `).all(start, end).map(serializeFeastDay);
  res.json({ ok: true, data: feastDays });
});

app.get('/api/feast-days', requireSession, (req, res) => {
  const feastDays = database.prepare('SELECT * FROM feast_days ORDER BY date, id').all().map(serializeFeastDay);
  res.json({ ok: true, data: feastDays });
});

app.post('/api/feast-days', requireSession, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : 'Memorial';
  const date = typeof req.body?.date === 'string' ? req.body.date : '';
  const color = req.body?.color;
  if (!title || title.length > 200 || !category || category.length > 50 || description.length > 2000 || !isValidDate(date)) {
    return res.status(400).json({ ok: false, error: 'Enter a title, category, valid date, and a description up to 2000 characters.' });
  }
  if (color !== undefined && (typeof color !== 'string' || !feastColorValues.has(color))) {
    return res.status(400).json({ ok: false, error: 'Choose a valid liturgical color.' });
  }
  const storedColor = typeof color === 'string' ? color : '#16a34a';
  const result = database.prepare("INSERT INTO feast_days (date, title, description, category, color, status) VALUES (?, ?, ?, ?, ?, 'Draft')")
    .run(date, title, description, category, storedColor);
  const feastDay = database.prepare('SELECT * FROM feast_days WHERE id = ?').get(Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: serializeFeastDay(feastDay) });
});

app.put('/api/feast-days/:id/publish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const result = database.prepare("UPDATE feast_days SET status = 'Published' WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Feast day not found.' });
  const feastDay = database.prepare('SELECT * FROM feast_days WHERE id = ?').get(id);
  return res.json({ ok: true, data: serializeFeastDay(feastDay) });
});

app.put('/api/feast-days/publish-all', requireSession, (req, res) => {
  const result = database.prepare("UPDATE feast_days SET status = 'Published' WHERE status = 'Draft'").run();
  return res.json({ ok: true, published: result.changes });
});

app.delete('/api/feast-days/:id', requireSession, (req, res) => {
  const result = database.prepare('DELETE FROM feast_days WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Feast day not found.' });
  return res.json({ ok: true });
});

database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

const frontendPath = path.join(distPath, 'index.html');
const frontendAvailable = fs.existsSync(frontendPath);
if (production && !frontendAvailable) {
  throw new Error(`Production frontend build not found at ${distPath}. Run npm run build before starting the server.`);
}
if (frontendAvailable) app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'Route not found.' });
  if (frontendAvailable) return res.sendFile(frontendPath);
  return res.status(404).json({ ok: false, error: 'Frontend build is missing. Run npm run build to serve the website.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Dominus API listening on port ${port}; SQLite: ${databasePath}; Production: ${production}`);
});
