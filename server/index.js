import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import compression from 'compression';
import { createStorageFromEnv, storageNotConfiguredMessage } from './storage.js';
import { createMailer, initNewsletterSchema, startNewsletterScheduler } from './newsletter-core.js';
import { registerNewsletterRoutes } from './newsletter-routes.js';
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
const storageUploadsDir = process.env.STORAGE_DISK_PATH
  ? path.resolve(process.env.STORAGE_DISK_PATH)
  : path.join(path.dirname(databasePath), 'uploads');
const storage = createStorageFromEnv(process.env, {
  baseDir: storageUploadsDir,
  baseUrl: '',
  secret: sessionSecret,
});

const azureHostname = process.env.WEBSITE_HOSTNAME ? `https://${process.env.WEBSITE_HOSTNAME}` : null;
const rawOrigins = process.env.APP_ORIGIN || (production ? '' : 'http://localhost:5173,http://127.0.0.1:5173');
const allowedOrigins = new Set(
  rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean),
);
if (azureHostname) allowedOrigins.add(azureHostname);

const feastColorValues = new Set(['#16a34a', '#ffffff', '#b91c1c', '#6b21a8']);
const defaultPastoralImagePaths = {
  archbishop: '/images/archbishop.jpg',
  auxiliaryBishop: '/images/aux-bishop.jpg',
  cardinal: '/images/cardinal.jpg',
  parishPriest: '/images/priest1.jpg',
  associatePriest1: '/images/priest2.jpg',
  associatePriest2: '/images/priest3.jpg',
};
const defaultPastoralTeam = {
  hierarchy: [
    { id: 'archbishop', name: 'Most Rev. Dr. Ignatius Ayau Kaigama', title: 'Archbishop of Abuja', specialization: 'Archbishop' },
    { id: 'auxiliaryBishop', name: 'Most Rev. Dr. Anselm Umoren', title: 'Auxiliary Bishop of Abuja', specialization: 'Auxiliary Bishop' },
    { id: 'cardinal', name: 'His Eminence, John Cardinal Onaiyekan', title: 'Archbishop Emeritus of Abuja', specialization: 'Cardinal' },
  ],
  parishClergy: [
    { id: 'parishPriest', name: 'Rev. Fr. Francis Kale', title: 'Parish Priest', contact: '0812 219 2192' },
    { id: 'associatePriest1', name: 'Rev. Fr. Pascal Okpanachi Yahaya', title: 'Associate Priest', contact: 'Contact via Parish Office' },
    { id: 'associatePriest2', name: 'Rev. Fr. Chijioke Majela', title: 'Associate Priest', contact: 'Contact via Parish Office' },
  ],
  catechists: [
    { id: 'catechist1', name: 'Catechist 1', title: 'Catechist' },
    { id: 'catechist2', name: 'Catechist 2', title: 'Catechist' },
  ],
};
const communityGroupKeys = ['organizations', 'societies', 'knighthood', 'states'];
const committeeCategories = new Set(['liturgical', 'non-liturgical']);
const communityDetailFields = [
  'formalName', 'audience', 'members', 'leadership', 'meetingPlace',
  'patronSaintDay', 'slogan', 'mantra', 'mission', 'whatWeDo',
];

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
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Published')),
    archived_at TEXT,
    popup_kind TEXT NOT NULL DEFAULT 'announcement',
    popup_enabled INTEGER NOT NULL DEFAULT 0,
    popup_image_data TEXT NOT NULL DEFAULT '',
    popup_link TEXT NOT NULL DEFAULT '',
    popup_start_at TEXT NOT NULL DEFAULT '',
    popup_end_at TEXT NOT NULL DEFAULT ''
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
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT
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
  CREATE TABLE IF NOT EXISTS gallery_albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    event_date TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    cover_image_id INTEGER,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS gallery_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    caption TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Published')),
    thumbnail_data TEXT NOT NULL DEFAULT '',
    viewer_url TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT NOT NULL DEFAULT '',
    is_featured INTEGER NOT NULL DEFAULT 0,
    album_id INTEGER REFERENCES gallery_albums(id) ON DELETE SET NULL,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    folder_path TEXT NOT NULL DEFAULT '',
    media_type TEXT NOT NULL DEFAULT 'image',
    object_key TEXT NOT NULL DEFAULT '',
    mime_type TEXT NOT NULL DEFAULT '',
    file_size INTEGER NOT NULL DEFAULT 0,
    original_filename TEXT NOT NULL DEFAULT '',
    upload_complete INTEGER NOT NULL DEFAULT 1
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
  CREATE TABLE IF NOT EXISTS vault_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    folder_path TEXT NOT NULL DEFAULT '',
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    upload_complete INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
if (!galleryColumns.some((column) => column.name === 'album_id')) {
  database.exec('ALTER TABLE gallery_images ADD COLUMN album_id INTEGER REFERENCES gallery_albums(id) ON DELETE SET NULL');
}
if (!galleryColumns.some((column) => column.name === 'uploaded_at')) {
  database.exec("ALTER TABLE gallery_images ADD COLUMN uploaded_at TEXT NOT NULL DEFAULT ''");
}
if (!galleryColumns.some((column) => column.name === 'archived_at')) database.exec('ALTER TABLE gallery_images ADD COLUMN archived_at TEXT');
if (!galleryColumns.some((column) => column.name === 'folder_path')) database.exec("ALTER TABLE gallery_images ADD COLUMN folder_path TEXT NOT NULL DEFAULT ''");
if (!galleryColumns.some((column) => column.name === 'media_type')) database.exec("ALTER TABLE gallery_images ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image'");
if (!galleryColumns.some((column) => column.name === 'object_key')) database.exec("ALTER TABLE gallery_images ADD COLUMN object_key TEXT NOT NULL DEFAULT ''");
if (!galleryColumns.some((column) => column.name === 'mime_type')) database.exec("ALTER TABLE gallery_images ADD COLUMN mime_type TEXT NOT NULL DEFAULT ''");
if (!galleryColumns.some((column) => column.name === 'file_size')) database.exec('ALTER TABLE gallery_images ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0');
if (!galleryColumns.some((column) => column.name === 'original_filename')) database.exec("ALTER TABLE gallery_images ADD COLUMN original_filename TEXT NOT NULL DEFAULT ''");
if (!galleryColumns.some((column) => column.name === 'upload_complete')) database.exec('ALTER TABLE gallery_images ADD COLUMN upload_complete INTEGER NOT NULL DEFAULT 1');
const announcementColumns = database.prepare('PRAGMA table_info(announcements)').all();
if (!announcementColumns.some((column) => column.name === 'archived_at')) database.exec('ALTER TABLE announcements ADD COLUMN archived_at TEXT');
if (!announcementColumns.some((column) => column.name === 'popup_kind')) database.exec("ALTER TABLE announcements ADD COLUMN popup_kind TEXT NOT NULL DEFAULT 'announcement'");
if (!announcementColumns.some((column) => column.name === 'popup_enabled')) database.exec('ALTER TABLE announcements ADD COLUMN popup_enabled INTEGER NOT NULL DEFAULT 0');
if (!announcementColumns.some((column) => column.name === 'popup_image_data')) database.exec("ALTER TABLE announcements ADD COLUMN popup_image_data TEXT NOT NULL DEFAULT ''");
if (!announcementColumns.some((column) => column.name === 'popup_link')) database.exec("ALTER TABLE announcements ADD COLUMN popup_link TEXT NOT NULL DEFAULT ''");
if (!announcementColumns.some((column) => column.name === 'popup_start_at')) database.exec("ALTER TABLE announcements ADD COLUMN popup_start_at TEXT NOT NULL DEFAULT ''");
if (!announcementColumns.some((column) => column.name === 'popup_end_at')) database.exec("ALTER TABLE announcements ADD COLUMN popup_end_at TEXT NOT NULL DEFAULT ''");
const articleColumnsForArchive = database.prepare('PRAGMA table_info(articles)').all();
if (!articleColumnsForArchive.some((column) => column.name === 'archived_at')) database.exec('ALTER TABLE articles ADD COLUMN archived_at TEXT');
const initialVaultMigration = 'vault-gallery-archive-v1';
if (!database.prepare('SELECT name FROM content_migrations WHERE name = ?').get(initialVaultMigration)) {
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare(`
      UPDATE gallery_images SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', is_featured = 0
      WHERE archived_at IS NULL
    `).run();
    database.prepare('UPDATE gallery_albums SET cover_image_id = NULL, is_featured = 0').run();
    database.prepare('INSERT INTO content_migrations (name) VALUES (?)').run(initialVaultMigration);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
database.exec("UPDATE gallery_images SET uploaded_at = CURRENT_TIMESTAMP WHERE uploaded_at = ''");

database.prepare(`
  INSERT OR IGNORE INTO gallery_albums (title, slug, description)
  VALUES ('Uncategorized', 'uncategorized', 'Photos not assigned to an event album.')
`).run();
const galleryAlbumMigration = 'gallery-albums-v1';
const galleryAlbumMigrationApplied = database.prepare('SELECT name FROM content_migrations WHERE name = ?').get(galleryAlbumMigration);
if (!galleryAlbumMigrationApplied) {
  const unassignedPhotos = database.prepare('SELECT COUNT(*) AS count FROM gallery_images WHERE album_id IS NULL').get().count;
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare(`
      INSERT OR IGNORE INTO gallery_albums (title, slug, description)
      VALUES ('General Gallery', 'general-gallery', 'Existing gallery photos and uploads without a selected event album.')
    `).run();
    const generalAlbum = database.prepare("SELECT id FROM gallery_albums WHERE slug = 'general-gallery'").get();
    if (unassignedPhotos > 0) {
      database.prepare('UPDATE gallery_images SET album_id = ? WHERE album_id IS NULL').run(generalAlbum.id);
    }
    database.prepare(`
      UPDATE gallery_albums SET cover_image_id = (
        SELECT id FROM gallery_images WHERE album_id = ? ORDER BY id ASC LIMIT 1
      ) WHERE id = ? AND cover_image_id IS NULL
    `).run(generalAlbum.id, generalAlbum.id);
    database.prepare('INSERT INTO content_migrations (name) VALUES (?)').run(galleryAlbumMigration);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

const articleColumns = database.prepare('PRAGMA table_info(articles)').all();
if (!articleColumns.some((column) => column.name === 'author_name')) {
  database.exec("ALTER TABLE articles ADD COLUMN author_name TEXT NOT NULL DEFAULT 'Holy Rosary Catholic Church'");
}
if (!articleColumns.some((column) => column.name === 'image_data')) {
  database.exec("ALTER TABLE articles ADD COLUMN image_data TEXT NOT NULL DEFAULT ''");
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
  database.prepare('DELETE FROM admin_users WHERE username != ?').run(process.env.DOMINUS_USERNAME);
  database.prepare(`
    INSERT INTO admin_users (username, password_salt, password_hash) VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET password_salt = excluded.password_salt, password_hash = excluded.password_hash
  `).run(process.env.DOMINUS_USERNAME, salt, passwordHash);
} else {
  console.warn('Dominus login is disabled until DOMINUS_USERNAME and DOMINUS_PASSWORD are configured.');
}

const makeTokenHash = (token) => createHash('sha256').update(token).digest('hex');
const signToken = (token) => createHmac('sha256', sessionSecret).update(token).digest('base64url');
const serializeAnnouncement = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  date: row.date,
  status: row.status,
  archivedAt: row.archived_at || null,
  popupKind: row.popup_kind || 'announcement',
  popupEnabled: Boolean(row.popup_enabled),
  popupImageData: row.popup_image_data || '',
  popupLink: row.popup_link || '',
  popupStartAt: row.popup_start_at || '',
  popupEndAt: row.popup_end_at || '',
});
const serializeArticle = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  authorName: row.author_name,
  excerpt: row.excerpt,
  body: row.body,
  imageData: row.image_data || '',
  publishDate: row.publish_date,
  status: row.status,
  archivedAt: row.archived_at || null,
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
  albumId: row.album_id ?? null,
  fileId: row.file_id,
  caption: row.caption,
  status: row.status,
  mediaType: row.media_type || 'image',
  folderPath: row.folder_path || '',
  originalFilename: row.original_filename || '',
  fileSize: Number(row.file_size || 0),
  archivedAt: row.archived_at || null,
  thumbnailUrl: row.object_key
    ? `${row.status === 'Published' ? '/api/public/gallery' : '/api/gallery'}/${row.id}/media`
    : row.thumbnail_data
    ? `${row.status === 'Published' ? '/api/public/gallery' : '/api/gallery'}/${row.id}/image`
    : row.thumbnail_url,
  viewerUrl: row.object_key
    ? `${row.status === 'Published' ? '/api/public/gallery' : '/api/gallery'}/${row.id}/media`
    : row.viewer_url,
  isFeatured: Boolean(row.is_featured),
  uploadedAt: row.uploaded_at,
});
const galleryImageColumns = 'id, file_id, caption, status, thumbnail_data, viewer_url, thumbnail_url, is_featured, album_id, uploaded_at, archived_at, folder_path, media_type, object_key, mime_type, file_size, original_filename, upload_complete';
const serializeGalleryAlbum = (row, coverImage = null) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  date: row.event_date || '',
  description: row.description,
  coverImage,
  isFeatured: Boolean(row.is_featured),
  createdAt: row.created_at,
  photoCount: Number(row.photo_count || 0),
});
const galleryAlbumSlug = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 80) || 'album';
const createUniqueAlbumSlug = (title, excludedAlbumId = null) => {
  const baseSlug = galleryAlbumSlug(title);
  let slug = baseSlug;
  let suffix = 2;
  while (database.prepare('SELECT id FROM gallery_albums WHERE slug = ? AND id != COALESCE(?, -1)').get(slug, excludedAlbumId)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
};
const findOrCreateGalleryAlbum = (title, slug, description = '') => {
  database.prepare(`
    INSERT OR IGNORE INTO gallery_albums (title, slug, description) VALUES (?, ?, ?)
  `).run(title, slug, description);
  return database.prepare('SELECT id FROM gallery_albums WHERE slug = ?').get(slug);
};
const galleryAlbumCoverImage = (album) => {
  const cover = album.cover_image_id === null
    ? null
    : database.prepare(`    SELECT ${galleryImageColumns} FROM gallery_images WHERE id = ? AND album_id = ? AND archived_at IS NULL AND upload_complete = 1`)
      .get(album.cover_image_id, album.id);
  if (cover) return serializeGalleryImage(cover);
  const firstImage = database.prepare(`
    SELECT ${galleryImageColumns} FROM gallery_images
    WHERE album_id = ? AND archived_at IS NULL AND upload_complete = 1 ORDER BY id ASC LIMIT 1
  `).get(album.id);
  return firstImage ? serializeGalleryImage(firstImage) : null;
};
const listGalleryAlbums = ({ publicOnly = false } = {}) => {
  const albums = database.prepare(`
    SELECT a.*, COUNT(${publicOnly ? "CASE WHEN i.status = 'Published' AND (i.thumbnail_data <> '' OR (i.thumbnail_url <> '' AND i.viewer_url <> '') OR i.object_key <> '') THEN i.id END" : 'i.id'}) AS photo_count
    FROM gallery_albums a
    LEFT JOIN gallery_images i ON i.album_id = a.id AND i.archived_at IS NULL AND i.upload_complete = 1
    ${publicOnly ? "WHERE a.id IN (SELECT album_id FROM gallery_images WHERE archived_at IS NULL AND upload_complete = 1 AND status = 'Published' AND (thumbnail_data <> '' OR (thumbnail_url <> '' AND viewer_url <> '') OR object_key <> ''))" : ''}
    GROUP BY a.id
    ORDER BY a.is_featured DESC, CASE WHEN a.event_date = '' THEN a.created_at ELSE a.event_date END DESC, a.id DESC
  `).all();
  return albums.map((album) => {
    let coverImage = galleryAlbumCoverImage(album);
    if (publicOnly && (!coverImage || coverImage.status !== 'Published')) {
      const publishedCover = database.prepare(`
        SELECT ${galleryImageColumns} FROM gallery_images
        WHERE album_id = ? AND archived_at IS NULL AND upload_complete = 1 AND status = 'Published' AND (thumbnail_data <> '' OR (thumbnail_url <> '' AND viewer_url <> '') OR object_key <> '')
        ORDER BY id ASC LIMIT 1
      `).get(album.id);
      coverImage = publishedCover ? serializeGalleryImage(publishedCover) : null;
    }
    return serializeGalleryAlbum(album, coverImage);
  });
};
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
app.use(compression());
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
    SELECT * FROM announcements
    WHERE status = 'Published' AND archived_at IS NULL AND date >= ? AND date < ? ORDER BY date, id
  `).all(start, end).map(serializeAnnouncement);
  res.json({ ok: true, data: announcements });
});

app.get('/api/public/popup', (req, res) => {
  const now = new Date().toISOString();
  const popup = database.prepare(`
    SELECT * FROM announcements
    WHERE status = 'Published' AND archived_at IS NULL AND popup_enabled = 1
      AND (popup_start_at = '' OR popup_start_at <= ?)
      AND (popup_end_at = '' OR popup_end_at >= ?)
    ORDER BY date DESC, id DESC LIMIT 1
  `).get(now, now);
  return res.json({ ok: true, data: popup ? serializeAnnouncement(popup) : null });
});

app.get('/api/public/articles', (req, res) => {
  const articles = database.prepare(`
    SELECT id, slug, title, author_name, excerpt, body, image_data, publish_date, status FROM articles
    WHERE status = 'Published' AND archived_at IS NULL AND publish_date <= ? ORDER BY publish_date DESC, id DESC
  `).all(getParishDate()).map(serializeArticle);
  res.json({ ok: true, data: articles });
});

const listPastoralImages = () => Object.fromEntries(
  database.prepare("SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE 'pastoral-image:%' AND setting_key NOT LIKE 'pastoral-image:archived:%'")
    .all()
    .map((row) => [row.setting_key.slice('pastoral-image:'.length), row.setting_value]),
);
const readPastoralTeamConfig = () => {
  const saved = database.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'pastoral-team'").get();
  if (!saved) return defaultPastoralTeam;
  const parsed = JSON.parse(saved.setting_value);
  return { ...defaultPastoralTeam, ...parsed, catechists: parsed.catechists || defaultPastoralTeam.catechists };
};
const serializePastoralTeam = () => {
  const team = readPastoralTeamConfig();
  const images = listPastoralImages();
  const serializeMember = (member) => {
    const contact = member.contact || '';
    let phoneNumber = /^\+?[\d ()-]+$/.test(contact) && /\d/.test(contact)
      ? contact.replace(/[^\d+]/g, '')
      : '';
    if (/^0\d{10}$/.test(phoneNumber)) phoneNumber = `+234${phoneNumber.slice(1)}`;
    return {
      ...member,
      image: images[member.id] || defaultPastoralImagePaths[member.id] || '',
      ...(phoneNumber ? { phoneHref: `tel:${phoneNumber}` } : {}),
    };
  };
  return {
    hierarchy: team.hierarchy.map(serializeMember),
    parishClergy: team.parishClergy.map(serializeMember),
    catechists: team.catechists.map(serializeMember),
  };
};
const validatePastoralTeam = (value) => {
  const catechistMembers = value?.catechists === undefined ? defaultPastoralTeam.catechists : value.catechists;
  if (!value || !Array.isArray(value.hierarchy) || !Array.isArray(value.parishClergy)
    || !Array.isArray(catechistMembers) || value.hierarchy.length > 20
    || value.parishClergy.length > 20 || catechistMembers.length > 20
    || value.hierarchy.length + value.parishClergy.length + catechistMembers.length === 0
    || (value.catechists === undefined && value.hierarchy.length + value.parishClergy.length === 0)) return null;
  const ids = new Set();
  const validateMembers = (members, group) => {
    const output = [];
    for (const member of members) {
      if (!member || typeof member !== 'object'
        || typeof member.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(member.id)
        || ids.has(member.id)
        || typeof member.name !== 'string' || !member.name.trim() || member.name.trim().length > 120
        || typeof member.title !== 'string' || !member.title.trim() || member.title.trim().length > 120) return null;
      const specialization = member.specialization === undefined ? '' : member.specialization;
      const contact = member.contact === undefined ? '' : member.contact;
      if (typeof specialization !== 'string' || specialization.length > 120
        || typeof contact !== 'string' || contact.length > 120) return null;
      ids.add(member.id);
      output.push({
        id: member.id,
        name: member.name.trim(),
        title: member.title.trim(),
        ...(group === 'hierarchy' && specialization.trim() ? { specialization: specialization.trim() } : {}),
        ...(group === 'parishClergy' && contact.trim() ? { contact: contact.trim() } : {}),
      });
    }
    return output;
  };
  const hierarchy = validateMembers(value.hierarchy, 'hierarchy');
  const parishClergy = validateMembers(value.parishClergy, 'parishClergy');
  const catechists = validateMembers(catechistMembers, 'catechists');
  return hierarchy && parishClergy && catechists ? { hierarchy, parishClergy, catechists } : null;
};
const readSettingJson = (key) => {
  const saved = database.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get(key);
  return saved ? JSON.parse(saved.setting_value) : null;
};
const saveSettingJson = (key, value) => database.prepare(`
  INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
  ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
`).run(key, JSON.stringify(value));
const validText = (value, max = 2000) => typeof value === 'string' && value.length <= max;
const validateCommittees = (value) => {
  if (!Array.isArray(value) || value.length > 100) return null;
  const ids = new Set();
  const committees = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string'
      || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id)
      || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 120
      || !committeeCategories.has(item.category)
      || !validText(item.meeting, 500) || !validText(item.description, 2000)) return null;
    let choirList;
    if (item.choirList !== undefined) {
      if (!Array.isArray(item.choirList) || item.choirList.length > 30
        || !item.choirList.every((entry) => validText(entry, 500))) return null;
      choirList = item.choirList;
    }
    ids.add(item.id);
    committees.push({
      id: item.id,
      name: item.name.trim(),
      category: item.category,
      meeting: item.meeting,
      description: item.description,
      ...(choirList ? { choirList } : {}),
    });
  }
  return committees;
};
const validateCommunities = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const ids = new Set();
  const result = {};
  for (const group of communityGroupKeys) {
    if (!Array.isArray(value[group]) || value[group].length > 100) return null;
    result[group] = [];
    for (const item of value[group]) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string'
        || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id)
        || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 120) return null;
      for (const field of ['meeting', 'time', 'states', 'subtitle', 'thanksgiving']) {
        if (item[field] !== undefined && !validText(item[field], 500)) return null;
      }
      let details;
      if (item.details !== undefined) {
        if (!item.details || typeof item.details !== 'object' || Array.isArray(item.details)) return null;
        details = {};
        for (const field of communityDetailFields) {
          if (item.details[field] !== undefined) {
            if (!validText(item.details[field], 2000)) return null;
            if (item.details[field]) details[field] = item.details[field];
          }
        }
      }
      ids.add(item.id);
      result[group].push({
        id: item.id,
        name: item.name.trim(),
        ...Object.fromEntries(['meeting', 'time', 'states', 'subtitle', 'thanksgiving']
          .filter((field) => item[field])
          .map((field) => [field, item[field]])),
        ...(details && Object.keys(details).length ? { details } : {}),
      });
    }
  }
  return result;
};

app.get('/api/public/pastoral-team', (req, res) => {
  return res.json({ ok: true, data: serializePastoralTeam() });
});

app.get('/api/pastoral-images', requireSession, (req, res) => {
  return res.json({ ok: true, data: listPastoralImages() });
});

app.get('/api/pastoral-team', requireSession, (req, res) => {
  return res.json({ ok: true, data: serializePastoralTeam() });
});

app.put('/api/pastoral-team', requireSession, (req, res) => {
  const team = validatePastoralTeam(req.body);
  if (!team) {
    return res.status(400).json({ ok: false, error: 'Provide valid pastoral team members with names and titles (maximum 20 members per group).' });
  }
  const previousIds = new Set([
    ...readPastoralTeamConfig().hierarchy,
    ...readPastoralTeamConfig().parishClergy,
    ...readPastoralTeamConfig().catechists,
  ].map((member) => member.id));
  const nextIds = new Set([...team.hierarchy, ...team.parishClergy, ...team.catechists].map((member) => member.id));
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare(`
      INSERT INTO app_settings (setting_key, setting_value) VALUES ('pastoral-team', ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `).run(JSON.stringify(team));
    for (const id of previousIds) {
      if (!nextIds.has(id)) database.prepare('DELETE FROM app_settings WHERE setting_key = ?').run(`pastoral-image:${id}`);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return res.json({ ok: true, data: serializePastoralTeam() });
});

app.put('/api/pastoral-images/:key', requireSession, (req, res) => {
  const { key } = req.params;
  const team = readPastoralTeamConfig();
  if (![...team.hierarchy, ...team.parishClergy, ...team.catechists].some((member) => member.id === key)) {
    return res.status(404).json({ ok: false, error: 'Pastoral team member not found.' });
  }
  if (req.body?.imageData === null) {
    database.prepare('DELETE FROM app_settings WHERE setting_key = ?').run(`pastoral-image:${key}`);
    return res.json({ ok: true, data: listPastoralImages() });
  }
  const image = parseGalleryImageData(req.body?.imageData);
  if (!image || image.contentType !== 'image/jpeg' || image.data.length > 1024 * 1024) {
    return res.status(400).json({ ok: false, error: 'Choose a valid compressed JPEG image no larger than 1 MB.' });
  }
  database.prepare(`
    INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
  `).run(`pastoral-image:${key}`, image.dataUrl);
  return res.json({ ok: true, data: listPastoralImages() });
});

app.get('/api/public/committees', (req, res) => {
  return res.json({ ok: true, data: readSettingJson('parish-committees') });
});

app.get('/api/committees', requireSession, (req, res) => {
  return res.json({ ok: true, data: readSettingJson('parish-committees') });
});

app.put('/api/committees', requireSession, (req, res) => {
  const committees = validateCommittees(req.body);
  if (!committees) return res.status(400).json({ ok: false, error: 'Provide up to 100 committees with a name, category, meeting information, and description.' });
  saveSettingJson('parish-committees', committees);
  return res.json({ ok: true, data: committees });
});

app.get('/api/public/communities', (req, res) => {
  return res.json({ ok: true, data: readSettingJson('parish-communities') });
});

app.get('/api/communities', requireSession, (req, res) => {
  return res.json({ ok: true, data: readSettingJson('parish-communities') });
});

app.put('/api/communities', requireSession, (req, res) => {
  const communities = validateCommunities(req.body);
  if (!communities) return res.status(400).json({ ok: false, error: 'Provide valid community subsections with names and valid text fields.' });
  saveSettingJson('parish-communities', communities);
  return res.json({ ok: true, data: communities });
});

app.get('/api/public/gallery/albums', (req, res) => {
  return res.json({ ok: true, data: listGalleryAlbums({ publicOnly: true }) });
});

app.get('/api/public/gallery/albums/:slug', (req, res) => {
  const album = database.prepare(`
    SELECT a.*, COUNT(i.id) AS photo_count
    FROM gallery_albums a
    LEFT JOIN gallery_images i
      ON i.album_id = a.id AND i.status = 'Published' AND i.archived_at IS NULL AND i.upload_complete = 1
      AND (i.thumbnail_data <> '' OR (i.thumbnail_url <> '' AND i.viewer_url <> '') OR i.object_key <> '')
    WHERE a.slug = ?
    GROUP BY a.id
  `).get(req.params.slug);
  if (!album || album.photo_count === 0) return res.status(404).json({ ok: false, error: 'Gallery album not found.' });
  const photos = database.prepare(`
    SELECT ${galleryImageColumns} FROM gallery_images
    WHERE album_id = ? AND status = 'Published' AND archived_at IS NULL AND upload_complete = 1
      AND (thumbnail_data <> '' OR (thumbnail_url <> '' AND viewer_url <> '') OR object_key <> '')
    ORDER BY is_featured DESC, id DESC
  `).all(album.id).map(serializeGalleryImage);
  const publicAlbum = listGalleryAlbums({ publicOnly: true }).find((item) => item.slug === album.slug);
  return res.json({ ok: true, data: { ...publicAlbum, photos } });
});

app.get('/api/public/gallery', (req, res) => {
  const images = database.prepare(`
    SELECT ${galleryImageColumns} FROM gallery_images
    WHERE status = 'Published' AND archived_at IS NULL AND upload_complete = 1
      AND (thumbnail_data <> '' OR (thumbnail_url <> '' AND viewer_url <> '') OR object_key <> '')
    ORDER BY is_featured DESC, id DESC
  `).all().map(serializeGalleryImage);
  return res.json({ ok: true, data: images });
});

app.get('/api/public/gallery/:id/image', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
  const image = database.prepare(`
    SELECT thumbnail_data, object_key FROM gallery_images WHERE id = ? AND status = 'Published' AND archived_at IS NULL
  `).get(id);
  if (image?.object_key) return res.redirect(307, `/api/public/gallery/${id}/media`);
  const parsedImage = parseGalleryImageData(image?.thumbnail_data);
  if (!parsedImage) return res.status(404).end();
  res.setHeader('Content-Type', parsedImage.contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(parsedImage.data);
});

// Local host storage upload endpoint (streaming binary data directly to persistent disk)
app.put('/api/storage/local-upload', (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const expires = typeof req.query.expires === 'string' ? req.query.expires : '';
  const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
  if (!storage || storage.provider !== 'local') return res.status(400).json({ ok: false, error: 'Local storage not active.' });
  if (!storage.verify(key, expires, sig)) return res.status(403).json({ ok: false, error: 'Upload link expired or invalid.' });

  try {
    const targetPath = storage.resolvePath(key);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const out = fs.createWriteStream(targetPath);
    req.pipe(out);
    out.on('finish', () => res.status(200).json({ ok: true }));
    out.on('error', (err) => res.status(500).json({ ok: false, error: err.message }));
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid storage path.' });
  }
});

// Local host storage media streaming endpoint (with Range header support for video streaming)
app.get('/api/public/storage/local-media', (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const expires = typeof req.query.expires === 'string' ? req.query.expires : '';
  const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
  if (!storage || storage.provider !== 'local') return res.status(404).end();
  if (!storage.verify(key, expires, sig)) return res.status(403).end();

  try {
    const targetPath = storage.resolvePath(key);
    if (!fs.existsSync(targetPath)) return res.status(404).end();
    return res.sendFile(targetPath, {
      acceptRanges: true,
      cacheControl: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } catch {
    return res.status(404).end();
  }
});

app.get('/api/public/gallery/:id/media', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
  const media = database.prepare(`
    SELECT object_key, mime_type FROM gallery_images
    WHERE id = ? AND status = 'Published' AND archived_at IS NULL AND upload_complete = 1 AND object_key <> ''
  `).get(id);
  if (!media || !storage) return res.status(404).end();
  try {
    const url = await storage.downloadUrl(media.object_key, 3600);
    return res.redirect(302, url);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/gallery', requireSession, (req, res) => {
  const images = database.prepare(`
    SELECT ${galleryImageColumns} FROM gallery_images
    WHERE archived_at IS NULL AND upload_complete = 1
      AND (thumbnail_data <> '' OR (thumbnail_url <> '' AND viewer_url <> '') OR object_key <> '')
    ORDER BY id DESC
  `).all().map(serializeGalleryImage);
  return res.json({ ok: true, data: images });
});

app.post('/api/gallery/archive-all', requireSession, (req, res) => {
  let photosArchived = 0;
  database.exec('BEGIN IMMEDIATE');
  try {
    photosArchived = database.prepare(`
      SELECT COUNT(*) AS count FROM gallery_images WHERE archived_at IS NULL AND upload_complete = 1
    `).get().count;
    database.prepare(`
      UPDATE gallery_images SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', is_featured = 0
      WHERE archived_at IS NULL AND upload_complete = 1
    `).run();
    database.prepare('UPDATE gallery_albums SET cover_image_id = NULL, is_featured = 0').run();
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return res.json({ ok: true, data: { photosArchived } });
});

app.get('/api/gallery/albums', requireSession, (req, res) => {
  return res.json({ ok: true, data: listGalleryAlbums() });
});

app.post('/api/vault/upload-url', requireSession, async (req, res, next) => {
  if (!storage) return res.status(503).json({ ok: false, error: storageNotConfiguredMessage });
  const filename = typeof req.body?.filename === 'string' ? path.basename(req.body.filename.trim()) : '';
  const fileSize = Number(req.body?.fileSize);
  const folderPath = typeof req.body?.folderPath === 'string' ? req.body.folderPath.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') : '';
  if (!filename || filename.length > 255 || !/\.pdf$/i.test(filename) || req.body?.contentType !== 'application/pdf'
    || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 100 * 1024 * 1024
    || folderPath.split('/').some((part) => part === '.' || part === '..' || part.length > 120)) {
    return res.status(400).json({ ok: false, error: 'Choose a PDF publication up to 100 MB and a valid Vault folder.' });
  }
  const objectKey = `publications/${randomUUID()}.pdf`;
  const result = database.prepare(`
    INSERT INTO vault_files (title, folder_path, mime_type, file_size, object_key)
    VALUES (?, ?, 'application/pdf', ?, ?)
  `).run(filename, folderPath, fileSize, objectKey);
  try {
    const { uploadUrl, uploadHeaders } = await storage.uploadUrl(objectKey, 'application/pdf', 900);
    return res.status(201).json({ ok: true, data: { id: Number(result.lastInsertRowid), uploadUrl, uploadHeaders } });
  } catch (error) {
    database.prepare('DELETE FROM vault_files WHERE id = ? AND upload_complete = 0').run(Number(result.lastInsertRowid));
    return next(error);
  }
});

app.put('/api/vault/files/:id/complete-upload', requireSession, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid Vault file.' });
  const item = database.prepare('SELECT object_key, file_size, upload_complete FROM vault_files WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ ok: false, error: 'Pending publication upload not found.' });
  if (item.upload_complete) return res.status(409).json({ ok: false, error: 'This publication upload was already completed.' });
  if (!storage) return res.status(503).json({ ok: false, error: storageNotConfiguredMessage });
  try {
    const storedSize = await storage.size(item.object_key);
    if (storedSize !== Number(item.file_size)) {
      return res.status(400).json({ ok: false, error: 'The uploaded file size did not match the selected file.' });
    }
    database.prepare('UPDATE vault_files SET upload_complete = 1 WHERE id = ?').run(id);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/vault/files/:id/download', requireSession, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
  const file = database.prepare('SELECT object_key FROM vault_files WHERE id = ? AND upload_complete = 1').get(id);
  if (!file || !storage) return res.status(404).end();
  try {
    const url = await storage.downloadUrl(file.object_key, 900);
    return res.redirect(302, url);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/vault', requireSession, (req, res) => {
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
  const items = database.prepare(`
    SELECT * FROM (
      SELECT 'article' AS kind, id, title, status, archived_at AS archivedAt,
        publish_date AS date, '' AS folder, CASE WHEN image_data <> '' THEN 1 ELSE 0 END AS hasImage,
        image_data AS imageUrl
      FROM articles
      UNION ALL
      SELECT 'announcement' AS kind, id, title, status, archived_at AS archivedAt,
        date, '' AS folder, CASE WHEN popup_image_data <> '' THEN 1 ELSE 0 END AS hasImage,
        popup_image_data AS imageUrl
      FROM announcements
      UNION ALL
      SELECT media_type AS kind, i.id, i.caption AS title, i.status, i.archived_at AS archivedAt,
        i.uploaded_at AS date, CASE WHEN i.folder_path = '' THEN a.title ELSE a.title || '/' || i.folder_path END AS folder,
        1 AS hasImage,
        CASE WHEN i.object_key <> '' THEN '/api/gallery/' || i.id || '/media'
          WHEN i.thumbnail_data <> '' THEN '/api/gallery/' || i.id || '/image' ELSE i.thumbnail_url END AS imageUrl
      FROM gallery_images i LEFT JOIN gallery_albums a ON a.id = i.album_id
      WHERE i.upload_complete = 1
      UNION ALL
      SELECT 'publication' AS kind, id, title, 'Draft' AS status, archived_at AS archivedAt,
        uploaded_at AS date, folder_path AS folder, 0 AS hasImage,
        '/api/vault/files/' || id || '/download' AS imageUrl
      FROM vault_files WHERE upload_complete = 1
      UNION ALL
      SELECT 'pastoral' AS kind,
        CASE WHEN instr(setting_key, 'pastoral-image:archived:') = 1
          THEN substr(setting_key, 25) ELSE substr(setting_key, 16) END AS id,
        CASE WHEN instr(setting_key, 'pastoral-image:archived:') = 1
          THEN substr(setting_key, 25) ELSE substr(setting_key, 16) END AS title,
        'Published' AS status,
        CASE WHEN instr(setting_key, 'pastoral-image:archived:') = 1 THEN 'archived' ELSE NULL END AS archivedAt,
        '' AS date, 'Pastoral Team' AS folder, 1 AS hasImage, setting_value AS imageUrl
      FROM app_settings WHERE setting_key LIKE 'pastoral-image:%'
    ) ORDER BY (archivedAt IS NOT NULL) DESC, date DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset).map((item) => ({ ...item, hasImage: Boolean(item.hasImage) }));
  const total = database.prepare(`
    SELECT (SELECT COUNT(*) FROM articles)
      + (SELECT COUNT(*) FROM announcements)
      + (SELECT COUNT(*) FROM gallery_images WHERE upload_complete = 1)
      + (SELECT COUNT(*) FROM vault_files WHERE upload_complete = 1)
      + (SELECT COUNT(*) FROM app_settings WHERE setting_key LIKE 'pastoral-image:%') AS count
  `).get().count;
  return res.json({ ok: true, data: { items, total, limit, offset } });
});

app.post('/api/vault/:kind/:id/restore', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const key = req.params.id;
  if (!['pastoral'].includes(req.params.kind) && (!Number.isSafeInteger(id) || id < 1)) return res.status(400).json({ ok: false, error: 'Invalid vault item.' });
  const queries = {
    article: "UPDATE articles SET archived_at = NULL, status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND archived_at IS NOT NULL",
    announcement: "UPDATE announcements SET archived_at = NULL, status = 'Draft', popup_enabled = 0 WHERE id = ? AND archived_at IS NOT NULL",
    image: "UPDATE gallery_images SET archived_at = NULL, status = 'Draft' WHERE id = ? AND archived_at IS NOT NULL",
    video: "UPDATE gallery_images SET archived_at = NULL, status = 'Draft' WHERE id = ? AND archived_at IS NOT NULL",
    publication: "UPDATE vault_files SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL",
  };
  if (req.params.kind === 'pastoral') {
    const archivedKey = `pastoral-image:archived:${key}`;
    const archived = database.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get(archivedKey);
    if (!archived) return res.status(404).json({ ok: false, error: 'Archived pastoral photo not found.' });
    database.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)').run(`pastoral-image:${key}`, archived.setting_value);
    database.prepare('DELETE FROM app_settings WHERE setting_key = ?').run(archivedKey);
    return res.json({ ok: true });
  }
  const query = queries[req.params.kind];
  if (!query) return res.status(400).json({ ok: false, error: 'Unsupported vault item type.' });
  const result = database.prepare(query).run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Archived vault item not found.' });
  return res.json({ ok: true });
});

app.delete('/api/vault/:kind/:id', requireSession, async (req, res, next) => {
  const id = Number(req.params.id);
  const key = req.params.id;
  if (!['pastoral'].includes(req.params.kind) && (!Number.isSafeInteger(id) || id < 1)) return res.status(400).json({ ok: false, error: 'Invalid vault item.' });
  const queries = {
    article: 'DELETE FROM articles WHERE id = ? AND archived_at IS NOT NULL',
    announcement: 'DELETE FROM announcements WHERE id = ? AND archived_at IS NOT NULL',
    image: 'DELETE FROM gallery_images WHERE id = ? AND archived_at IS NOT NULL',
    video: 'DELETE FROM gallery_images WHERE id = ? AND archived_at IS NOT NULL',
    publication: 'DELETE FROM vault_files WHERE id = ? AND archived_at IS NOT NULL',
  };
  if (req.params.kind === 'pastoral') {
    const result = database.prepare('DELETE FROM app_settings WHERE setting_key = ?').run(`pastoral-image:archived:${key}`);
    if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Archived pastoral photo not found.' });
    return res.json({ ok: true });
  }
  const query = queries[req.params.kind];
  if (!query) return res.status(400).json({ ok: false, error: 'Unsupported vault item type.' });
  if (req.params.kind === 'image' || req.params.kind === 'video' || req.params.kind === 'publication') {
    const stored = req.params.kind === 'image' || req.params.kind === 'video'
      ? database.prepare('SELECT object_key FROM gallery_images WHERE id = ? AND archived_at IS NOT NULL').get(id)
      : null;
    const publication = req.params.kind === 'publication'
      ? database.prepare('SELECT object_key FROM vault_files WHERE id = ? AND archived_at IS NOT NULL').get(id)
      : null;
    const objectKey = stored?.object_key || publication?.object_key;
    if (objectKey) {
      if (!storage) return res.status(503).json({ ok: false, error: storageNotConfiguredMessage });
      try {
        await storage.remove(objectKey);
      } catch (error) {
        return next(error);
      }
    }
  }
  const result = database.prepare(query).run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Archived vault item not found.' });
  return res.json({ ok: true });
});

app.post('/api/vault/:kind/:id/archive', requireSession, (req, res) => {
  const { kind } = req.params;
  const rawId = req.params.id;
  const id = Number(rawId);
  if (kind === 'pastoral') {
    const activeKey = `pastoral-image:${rawId}`;
    const archivedKey = `pastoral-image:archived:${rawId}`;
    const image = database.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get(activeKey);
    if (!image) return res.status(404).json({ ok: false, error: 'Uploaded pastoral photo not found.' });
    database.prepare('INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)').run(archivedKey, image.setting_value);
    database.prepare('DELETE FROM app_settings WHERE setting_key = ?').run(activeKey);
    return res.json({ ok: true });
  }
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid Vault item.' });
  const queries = {
    article: "UPDATE articles SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND archived_at IS NULL",
    announcement: "UPDATE announcements SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', popup_enabled = 0 WHERE id = ? AND archived_at IS NULL",
    image: "UPDATE gallery_images SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', is_featured = 0 WHERE id = ? AND archived_at IS NULL",
    video: "UPDATE gallery_images SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', is_featured = 0 WHERE id = ? AND archived_at IS NULL",
    publication: 'UPDATE vault_files SET archived_at = CURRENT_TIMESTAMP WHERE id = ? AND archived_at IS NULL',
  };
  const query = queries[kind];
  if (!query) return res.status(400).json({ ok: false, error: 'Unsupported Vault item type.' });
  const result = database.prepare(query).run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Vault item not found.' });
  return res.json({ ok: true });
});

app.post('/api/gallery/albums', requireSession, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const eventDate = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (!title || title.length > 120 || (eventDate && !isValidDate(eventDate)) || description.length > 1000) {
    return res.status(400).json({ ok: false, error: 'Enter an album name (up to 120 characters), a valid event date, and a description no longer than 1000 characters.' });
  }
  const slug = createUniqueAlbumSlug(title);
  const result = database.prepare(`
    INSERT INTO gallery_albums (title, slug, event_date, description) VALUES (?, ?, ?, ?)
  `).run(title, slug, eventDate, description);
  const album = listGalleryAlbums().find((item) => item.id === Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: album });
});

app.post('/api/gallery/upload-url', requireSession, async (req, res, next) => {
  if (!storage) return res.status(503).json({ ok: false, error: storageNotConfiguredMessage });
  const filename = typeof req.body?.filename === 'string' ? path.basename(req.body.filename.trim()) : '';
  const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.toLowerCase() : '';
  const fileSize = Number(req.body?.fileSize);
  const mediaType = contentType.startsWith('video/') ? 'video' : 'image';
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']);
  const maxBytes = mediaType === 'video' ? 500 * 1024 * 1024 : 25 * 1024 * 1024;
  const rawFolderPath = typeof req.body?.folderPath === 'string' ? req.body.folderPath : '';
  const folderParts = rawFolderPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (!filename || filename.length > 255 || !allowedTypes.has(contentType)
    || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > maxBytes
    || folderParts.length > 12 || folderParts.some((part) => part === '.' || part === '..' || part.length > 120)) {
    return res.status(400).json({ ok: false, error: 'Choose a supported photo or video with a valid size and folder path.' });
  }
  const albumTitle = typeof req.body?.albumTitle === 'string' ? req.body.albumTitle.trim().slice(0, 120) : '';
  if (!albumTitle) return res.status(400).json({ ok: false, error: 'A named folder is required for media uploads.' });
  let album = database.prepare('SELECT id FROM gallery_albums WHERE title = ? COLLATE NOCASE').get(albumTitle);
  if (!album) {
    const slug = createUniqueAlbumSlug(albumTitle);
    const result = database.prepare('INSERT INTO gallery_albums (title, slug) VALUES (?, ?)').run(albumTitle, slug);
    album = { id: Number(result.lastInsertRowid) };
  }
  const id = randomUUID();
  const extension = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
  const objectKey = `gallery/${new Date().toISOString().slice(0, 10)}/${id}${extension}`;
  const caption = filename.replace(/\.[^.]+$/, '').slice(0, 120) || 'Parish media';
  const relativeFolder = folderParts.join('/');
  const result = database.prepare(`
    INSERT INTO gallery_images (
      file_id, caption, status, album_id, folder_path, media_type, object_key, mime_type,
      file_size, original_filename, upload_complete, thumbnail_data, viewer_url, thumbnail_url
    ) VALUES (?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, 0, '', '', '')
  `).run(id, caption, album.id, relativeFolder, mediaType, objectKey, contentType, fileSize, filename);
  try {
    const { uploadUrl, uploadHeaders } = await storage.uploadUrl(objectKey, contentType, 900);
    return res.status(201).json({ ok: true, data: { id: Number(result.lastInsertRowid), uploadUrl, uploadHeaders, albumId: album.id } });
  } catch (error) {
    database.prepare('DELETE FROM gallery_images WHERE id = ? AND upload_complete = 0').run(Number(result.lastInsertRowid));
    return next(error);
  }
});

app.put('/api/gallery/:id/complete-upload', requireSession, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery item.' });
  const item = database.prepare('SELECT object_key, file_size, upload_complete FROM gallery_images WHERE id = ?').get(id);
  if (!item || !item.object_key) return res.status(404).json({ ok: false, error: 'Pending upload not found.' });
  if (item.upload_complete) return res.status(409).json({ ok: false, error: 'This media upload was already completed.' });
  if (!storage) return res.status(503).json({ ok: false, error: storageNotConfiguredMessage });
  try {
    const storedSize = await storage.size(item.object_key);
    if (storedSize !== Number(item.file_size)) {
      return res.status(400).json({ ok: false, error: 'The uploaded file size did not match the selected file.' });
    }
    database.prepare('UPDATE gallery_images SET upload_complete = 1 WHERE id = ?').run(id);
    const updated = database.prepare(`SELECT ${galleryImageColumns} FROM gallery_images WHERE id = ?`).get(id);
    return res.json({ ok: true, data: serializeGalleryImage(updated) });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/gallery/albums/:id', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery album.' });
  const existing = database.prepare('SELECT * FROM gallery_albums WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Gallery album not found.' });
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
  const eventDate = typeof req.body?.date === 'string' ? req.body.date.trim() : existing.event_date;
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : existing.description;
  const coverImageId = req.body?.coverImageId === undefined
    ? existing.cover_image_id
    : req.body.coverImageId === null ? null : Number(req.body.coverImageId);
  if (!title || title.length > 120 || (eventDate && !isValidDate(eventDate)) || description.length > 1000) {
    return res.status(400).json({ ok: false, error: 'Enter an album name (up to 120 characters), a valid event date, and a description no longer than 1000 characters.' });
  }
  if (coverImageId !== null) {
    if (!Number.isSafeInteger(coverImageId) || coverImageId < 1) return res.status(400).json({ ok: false, error: 'Invalid cover photo.' });
    const cover = database.prepare('SELECT id FROM gallery_images WHERE id = ? AND album_id = ?').get(coverImageId, id);
    if (!cover) return res.status(400).json({ ok: false, error: 'The cover photo must belong to this album.' });
  }
  const slug = title === existing.title ? existing.slug : createUniqueAlbumSlug(title, id);
  database.prepare(`
    UPDATE gallery_albums SET title = ?, slug = ?, event_date = ?, description = ?, cover_image_id = ? WHERE id = ?
  `).run(title, slug, eventDate, description, coverImageId, id);
  const album = listGalleryAlbums().find((item) => item.id === id);
  return res.json({ ok: true, data: album });
});

app.put('/api/gallery/albums/:id/feature', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery album.' });
  const album = database.prepare(`
    SELECT a.id FROM gallery_albums a
    WHERE a.id = ? AND EXISTS (
      SELECT 1 FROM gallery_images i WHERE i.album_id = a.id AND i.status = 'Published'
        AND (i.thumbnail_data <> '' OR (i.thumbnail_url <> '' AND i.viewer_url <> ''))
    )
  `).get(id);
  if (!album) return res.status(404).json({ ok: false, error: 'Publish a photo in this album before featuring it.' });
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('UPDATE gallery_albums SET is_featured = 0').run();
    database.prepare('UPDATE gallery_albums SET is_featured = 1 WHERE id = ?').run(id);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return res.json({ ok: true });
});

app.put('/api/gallery/albums/:id/unfeature', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery album.' });
  const result = database.prepare('UPDATE gallery_albums SET is_featured = 0 WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Gallery album not found.' });
  return res.json({ ok: true });
});

app.delete('/api/gallery/albums/:id', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery album.' });
  const album = database.prepare('SELECT id, slug FROM gallery_albums WHERE id = ?').get(id);
  if (!album) return res.status(404).json({ ok: false, error: 'Gallery album not found.' });
  if (album.slug === 'uncategorized') return res.status(400).json({ ok: false, error: 'The Uncategorized album cannot be deleted.' });
  const uncategorized = findOrCreateGalleryAlbum('Uncategorized', 'uncategorized', 'Photos not assigned to an event album.');
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('UPDATE gallery_images SET album_id = ? WHERE album_id = ? AND archived_at IS NULL').run(uncategorized.id, id);
    database.prepare('UPDATE gallery_albums SET cover_image_id = NULL, is_featured = 0 WHERE id = ?').run(id);
    database.prepare('DELETE FROM gallery_albums WHERE id = ?').run(id);
    const firstUncategorizedPhoto = database.prepare('SELECT id FROM gallery_images WHERE album_id = ? ORDER BY id ASC LIMIT 1').get(uncategorized.id);
    database.prepare('UPDATE gallery_albums SET cover_image_id = ? WHERE id = ? AND cover_image_id IS NULL')
      .run(firstUncategorizedPhoto?.id ?? null, uncategorized.id);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return res.json({ ok: true, movedToAlbumId: uncategorized.id });
});

app.get('/api/gallery/:id/image', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
  const image = database.prepare('SELECT thumbnail_data, object_key FROM gallery_images WHERE id = ?')
    .get(id);
  if (image?.object_key) return res.redirect(307, `/api/gallery/${id}/media`);
  const parsedImage = parseGalleryImageData(image?.thumbnail_data);
  if (!parsedImage) return res.status(404).end();
  res.setHeader('Content-Type', parsedImage.contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.send(parsedImage.data);
});

app.get('/api/gallery/:id/media', requireSession, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).end();
  const media = database.prepare(`
    SELECT object_key FROM gallery_images
    WHERE id = ? AND upload_complete = 1 AND object_key <> ''
  `).get(id);
  if (!media || !storage) return res.status(404).end();
  try {
    const url = await storage.downloadUrl(media.object_key, 3600);
    return res.redirect(302, url);
  } catch (error) {
    return next(error);
  }
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
  const requestedAlbumId = req.body?.albumId === undefined ? null : Number(req.body.albumId);
  let album;
  if (requestedAlbumId === null || req.body?.albumId === '') {
    album = findOrCreateGalleryAlbum(
      'General Gallery',
      'general-gallery',
      'Existing gallery photos and uploads without a selected event album.',
    );
  } else {
    if (!Number.isSafeInteger(requestedAlbumId) || requestedAlbumId < 1) {
      return res.status(400).json({ ok: false, error: 'Select a valid gallery album.' });
    }
    album = database.prepare('SELECT id FROM gallery_albums WHERE id = ?').get(requestedAlbumId);
    if (!album) return res.status(404).json({ ok: false, error: 'Gallery album not found.' });
  }
  const result = database.prepare(`
    INSERT INTO gallery_images (file_id, caption, status, thumbnail_data, viewer_url, thumbnail_url, album_id)
    VALUES ('', ?, 'Draft', ?, '', '', ?)
  `).run(caption, thumbnail.dataUrl, album.id);
  database.prepare('UPDATE gallery_albums SET cover_image_id = ? WHERE id = ? AND cover_image_id IS NULL')
    .run(Number(result.lastInsertRowid), album.id);
  const image = database.prepare(`SELECT ${galleryImageColumns} FROM gallery_images WHERE id = ?`)
    .get(Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: serializeGalleryImage(image) });
});

app.put('/api/gallery/:id/album', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const albumId = Number(req.body?.albumId);
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(albumId) || albumId < 1) {
    return res.status(400).json({ ok: false, error: 'Select a valid photo and album.' });
  }
  const image = database.prepare('SELECT id, album_id FROM gallery_images WHERE id = ?').get(id);
  if (!image) return res.status(404).json({ ok: false, error: 'Gallery image not found.' });
  const destination = database.prepare('SELECT id FROM gallery_albums WHERE id = ?').get(albumId);
  if (!destination) return res.status(404).json({ ok: false, error: 'Gallery album not found.' });
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('UPDATE gallery_images SET album_id = ? WHERE id = ?').run(albumId, id);
    if (image.album_id !== null) {
      database.prepare('UPDATE gallery_albums SET cover_image_id = NULL WHERE id = ? AND cover_image_id = ?')
        .run(image.album_id, id);
    }
    database.prepare('UPDATE gallery_albums SET cover_image_id = ? WHERE id = ? AND cover_image_id IS NULL')
      .run(id, albumId);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  const updated = database.prepare(`SELECT ${galleryImageColumns} FROM gallery_images WHERE id = ?`).get(id);
  return res.json({ ok: true, data: serializeGalleryImage(updated) });
});

app.put('/api/gallery/:id/publish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery image.' });
  const result = database.prepare(`
    UPDATE gallery_images SET status = 'Published'
    WHERE id = ? AND archived_at IS NULL AND upload_complete = 1
      AND (thumbnail_data <> '' OR object_key <> '')
  `).run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Gallery image not found.' });
  return res.json({ ok: true });
});

app.put('/api/gallery/:id/unpublish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery image.' });
  const result = database.prepare("UPDATE gallery_images SET status = 'Draft', is_featured = 0 WHERE id = ? AND archived_at IS NULL").run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Gallery image not found.' });
  return res.json({ ok: true });
});

app.put('/api/gallery/:id/feature', requireSession, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ ok: false, error: 'Invalid gallery image.' });
  const image = database.prepare(`
    SELECT id FROM gallery_images WHERE id = ? AND status = 'Published' AND media_type = 'image' AND archived_at IS NULL
      AND upload_complete = 1 AND (thumbnail_data <> '' OR object_key <> '')
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
  const result = database.prepare(`
    UPDATE gallery_images SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', is_featured = 0
    WHERE id = ? AND archived_at IS NULL
  `).run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Gallery image not found.' });
  return res.json({ ok: true });
});

app.get('/api/articles', requireSession, (req, res) => {
  const articles = database.prepare('SELECT * FROM articles WHERE archived_at IS NULL ORDER BY publish_date DESC, id DESC')
    .all().map(serializeArticle);
  res.json({ ok: true, data: articles });
});

app.post('/api/articles', requireSession, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const authorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
  const excerpt = typeof req.body?.excerpt === 'string' ? req.body.excerpt.trim() : '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  const imageData = req.body?.imageData ?? '';
  const image = imageData ? parseGalleryImageData(imageData) : null;
  const publishDate = typeof req.body?.publishDate === 'string' ? req.body.publishDate : getParishDate();
  if (!title || title.length > 200 || !authorName || authorName.length > 100 || !excerpt || excerpt.length > 400
    || !body || body.length > 30000 || !isValidDate(publishDate)
    || typeof imageData !== 'string' || (imageData && (!image || image.contentType !== 'image/jpeg' || image.data.length > 1024 * 1024))) {
    return res.status(400).json({ ok: false, error: 'Enter a title, writer name, excerpt, article text, valid publication date, and an optional JPEG image no larger than 1 MB.' });
  }

  const baseSlug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'article';
  const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
  const result = database.prepare(`
    INSERT INTO articles (slug, title, author_name, excerpt, body, image_data, publish_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft')
  `).run(slug, title, authorName, excerpt, body, imageData, publishDate);
  const article = database.prepare('SELECT * FROM articles WHERE id = ?').get(Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: serializeArticle(article) });
});

app.put('/api/articles/:id', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const existing = database.prepare('SELECT status, image_data, archived_at FROM articles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Article not found.' });
  if (existing.archived_at) return res.status(409).json({ ok: false, error: 'Restore this article from the Vault before editing it.' });
  if (existing.status !== 'Draft') return res.status(409).json({ ok: false, error: 'Only draft articles can be edited.' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const authorName = typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '';
  const excerpt = typeof req.body?.excerpt === 'string' ? req.body.excerpt.trim() : '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  const imageData = req.body?.imageData === undefined ? existing.image_data : req.body.imageData;
  const image = imageData ? parseGalleryImageData(imageData) : null;
  const publishDate = typeof req.body?.publishDate === 'string' ? req.body.publishDate : '';
  if (!title || title.length > 200 || !authorName || authorName.length > 100 || !excerpt || excerpt.length > 400
    || !body || body.length > 30000 || !isValidDate(publishDate)
    || typeof imageData !== 'string' || (imageData && (!image || image.contentType !== 'image/jpeg' || image.data.length > 1024 * 1024))) {
    return res.status(400).json({ ok: false, error: 'Enter a title, writer name, excerpt, article text, valid publication date, and an optional JPEG image no larger than 1 MB.' });
  }

  database.prepare(`
    UPDATE articles SET title = ?, author_name = ?, excerpt = ?, body = ?, image_data = ?, publish_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(title, authorName, excerpt, body, imageData, publishDate, id);
  const article = database.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  return res.json({ ok: true, data: serializeArticle(article) });
});

app.put('/api/articles/:id/publish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const result = database.prepare("UPDATE articles SET status = 'Published', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND archived_at IS NULL")
    .run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Article not found.' });
  const article = database.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  return res.json({ ok: true, data: serializeArticle(article) });
});

app.delete('/api/articles/:id', requireSession, (req, res) => {
  const result = database.prepare(`
    UPDATE articles SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND archived_at IS NULL
  `).run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Article not found.' });
  return res.json({ ok: true });
});

app.get('/api/announcements', requireSession, (req, res) => {
  const announcements = database.prepare('SELECT * FROM announcements WHERE archived_at IS NULL ORDER BY date DESC, id DESC')
    .all().map(serializeAnnouncement);
  res.json({ ok: true, data: announcements });
});

app.post('/api/announcements', requireSession, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const date = typeof req.body?.date === 'string' ? req.body.date : new Date().toISOString().slice(0, 10);
  const popupKind = req.body?.popupKind === undefined ? 'announcement' : req.body.popupKind;
  const popupEnabled = req.body?.popupEnabled === true;
  const popupImageData = typeof req.body?.popupImageData === 'string' ? req.body.popupImageData : '';
  const popupImage = popupImageData ? parseGalleryImageData(popupImageData) : null;
  const popupLink = typeof req.body?.popupLink === 'string' ? req.body.popupLink.trim() : '';
  const popupStartAt = typeof req.body?.popupStartAt === 'string' ? req.body.popupStartAt.trim() : '';
  const popupEndAt = typeof req.body?.popupEndAt === 'string' ? req.body.popupEndAt.trim() : '';
  const validPopupDate = (value) => !value || !Number.isNaN(Date.parse(value));
  let validPopupLink = true;
  if (popupLink) {
    try {
      validPopupLink = ['http:', 'https:'].includes(new URL(popupLink).protocol);
    } catch {
      validPopupLink = false;
    }
  }
  if (!title || !description || title.length > 200 || description.length > 5000 || !isValidDate(date)
    || !['announcement', 'advert', 'reflection'].includes(popupKind)
    || (popupImageData && (!popupImage || popupImage.contentType !== 'image/jpeg' || popupImage.data.length > 1024 * 1024))
    || popupLink.length > 500 || !validPopupLink || !validPopupDate(popupStartAt) || !validPopupDate(popupEndAt)
    || (popupStartAt && popupEndAt && Date.parse(popupStartAt) > Date.parse(popupEndAt))) {
    return res.status(400).json({ ok: false, error: 'Enter a valid title, description, and date.' });
  }
  const result = database.prepare(`
    INSERT INTO announcements (title, description, date, status, popup_kind, popup_enabled, popup_image_data, popup_link, popup_start_at, popup_end_at)
    VALUES (?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?)
  `).run(title, description, date, popupKind, popupEnabled ? 1 : 0, popupImageData, popupLink, popupStartAt, popupEndAt);
  const announcement = database.prepare('SELECT * FROM announcements WHERE id = ?').get(Number(result.lastInsertRowid));
  return res.status(201).json({ ok: true, data: serializeAnnouncement(announcement) });
});

app.put('/api/announcements/:id/publish', requireSession, (req, res) => {
  const id = Number(req.params.id);
  const result = database.prepare("UPDATE announcements SET status = 'Published' WHERE id = ? AND archived_at IS NULL").run(id);
  if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Announcement not found.' });
  const announcement = database.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  return res.json({ ok: true, data: serializeAnnouncement(announcement) });
});

app.put('/api/announcements/publish-all', requireSession, (req, res) => {
  const result = database.prepare("UPDATE announcements SET status = 'Published' WHERE status = 'Draft' AND archived_at IS NULL").run();
  return res.json({ ok: true, published: result.changes });
});

app.delete('/api/announcements/:id', requireSession, (req, res) => {
  const result = database.prepare(`
    UPDATE announcements SET archived_at = CURRENT_TIMESTAMP, status = 'Draft', popup_enabled = 0
    WHERE id = ? AND archived_at IS NULL
  `).run(Number(req.params.id));
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

initNewsletterSchema(database);
const newsletterMailer = createMailer();
const getPublicBaseUrl = () => (process.env.PUBLIC_SITE_URL || '').replace(/\/+$/, '')
  || [...allowedOrigins].find((origin) => !/localhost|127\.0\.0\.1/.test(origin))
  || azureHostname
  || [...allowedOrigins][0]
  || `http://localhost:${port}`;
const newsletterDailyLimit = Math.max(1, Number(process.env.NEWSLETTER_DAILY_LIMIT) || 400);
const newsletterDelayMs = Number(process.env.NEWSLETTER_SEND_DELAY_MS ?? 1200);
registerNewsletterRoutes(app, {
  database,
  requireSession,
  parseImage: parseGalleryImageData,
  getBaseUrl: getPublicBaseUrl,
  getMailer: () => newsletterMailer,
  dailyLimit: newsletterDailyLimit,
  delayMs: newsletterDelayMs,
});
if (process.env.NODE_ENV !== 'test') {
  startNewsletterScheduler({ database, getMailer: () => newsletterMailer, getBaseUrl: getPublicBaseUrl, dailyLimit: newsletterDailyLimit, delayMs: newsletterDelayMs });
}
database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

const frontendPath = path.join(distPath, 'index.html');
const frontendAvailable = fs.existsSync(frontendPath);
if (production && !frontendAvailable) {
  throw new Error(`Production frontend build not found at ${distPath}. Run npm run build before starting the server.`);
}
if (frontendAvailable) {
  app.use(express.static(distPath, {
    index: false,
    setHeaders(res, filePath) {
      const relative = path.relative(distPath, filePath).split(path.sep).join('/');
      if (relative.startsWith('assets/')) {
        // Vite fingerprints these files, so they can be cached for a year.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (relative.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    },
  }));
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'Route not found.' });
  if (frontendAvailable) {
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(frontendPath);
  }
  return res.status(404).json({ ok: false, error: 'Frontend build is missing. Run npm run build to serve the website.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Dominus API listening on port ${port}; SQLite: ${databasePath}; Production: ${production}`);
});
