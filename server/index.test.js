import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import test from 'node:test';

const getParishWeek = () => {
  const dateParts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => dateParts.find((item) => item.type === type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const start = new Date(`${today}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const nextSunday = new Date(start);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  return {
    today,
    start: start.toISOString().slice(0, 10),
    nextSunday: nextSunday.toISOString().slice(0, 10),
  };
};

test('Dominus API protects administration and publishes notices and articles', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'dominus-api-test-'));
  const databasePath = path.join(tempDir, 'dominus.sqlite');
  const legacyDatabase = new DatabaseSync(databasePath);
  legacyDatabase.exec(`
    CREATE TABLE gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL,
      caption TEXT NOT NULL,
      status TEXT NOT NULL
    );
    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      body TEXT NOT NULL,
      publish_date TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE admin_users (
      username TEXT PRIMARY KEY,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);
  const legacyAdminSalt = 'legacy-admin-salt';
  legacyDatabase.prepare(`
    INSERT INTO admin_users (username, password_salt, password_hash) VALUES (?, ?, ?)
  `).run('dominus', legacyAdminSalt, scryptSync('test-password-that-is-not-production', legacyAdminSalt, 64).toString('hex'));
  legacyDatabase.prepare(`
    INSERT INTO gallery_images (file_id, caption, status)
    VALUES ('legacy-gallery-photo', 'Legacy Parish Photo', 'Published')
  `).run();
  legacyDatabase.prepare(`
    INSERT INTO articles (slug, title, excerpt, body, publish_date, status)
    VALUES (?, ?, ?, ?, ?, 'Draft')
  `).run('existing-post', 'Existing Article', 'Original intro', 'Original body', '2999-12-31');
  legacyDatabase.close();
  const portProbe = createServer();
  await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()));

  const origin = 'http://localhost:5173';
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverEnv = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    DATABASE_PATH: databasePath,
    APP_ORIGIN: origin,
    SESSION_SECRET: 'test-session-secret',
    DOMINUS_USERNAME: 'dominus01',
    DOMINUS_PASSWORD: 'test-password-that-is-not-production',
  };
  let child;
  let output = '';

  const startServer = async () => {
    child = spawn(process.execPath, ['server/index.js'], {
      cwd: process.cwd(),
      env: serverEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let started = false;
    await new Promise((resolve, reject) => {
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        if (output.includes(`listening on port ${port}`)) {
          started = true;
          resolve();
        }
      });
      child.stderr.on('data', (chunk) => { output += chunk.toString(); });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (!started) reject(new Error(`API server exited with code ${code}: ${output}`));
      });
    });
  };

  const stopServer = async () => {
    if (!child || child.exitCode !== null) return;
    child.kill('SIGTERM');
    await once(child, 'exit');
  };

  try {
    await startServer();
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).database, 'connected');

    const blockedWrite = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'No auth', description: 'Must be blocked' }),
    });
    assert.equal(blockedWrite.status, 401);

    const blockedOrigin = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test-dominus', password: 'test-password-that-is-not-production' }),
    });
    assert.equal(blockedOrigin.status, 403);

    const oldUsernameLogin = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dominus', password: 'test-password-that-is-not-production' }),
    });
    assert.equal(oldUsernameLogin.status, 401, 'previous admin usernames should be removed when credentials are reconfigured');

    const login = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dominus01', password: 'test-password-that-is-not-production' }),
    });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    const cookie = setCookie.split(';')[0];

    const privateGalleryBeforeLogin = await fetch(`${baseUrl}/api/gallery`);
    assert.equal(privateGalleryBeforeLogin.status, 401, 'gallery administration should require authentication');
    const privatePastoralImagesBeforeLogin = await fetch(`${baseUrl}/api/pastoral-images`);
    assert.equal(privatePastoralImagesBeforeLogin.status, 401, 'pastoral photo administration should require authentication');
    const privatePastoralTeamBeforeLogin = await fetch(`${baseUrl}/api/pastoral-team`);
    assert.equal(privatePastoralTeamBeforeLogin.status, 401, 'pastoral team administration should require authentication');
    assert.equal((await fetch(`${baseUrl}/api/committees`)).status, 401, 'committee administration should require authentication');
    assert.equal((await fetch(`${baseUrl}/api/communities`)).status, 401, 'community administration should require authentication');
    const blockedPastoralImageUpdate = await fetch(`${baseUrl}/api/pastoral-images/parishPriest`, {
      method: 'PUT',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: 'not-authorized' }),
    });
    assert.equal(blockedPastoralImageUpdate.status, 401, 'pastoral photo updates should require authentication');
    const privateAlbumsBeforeLogin = await fetch(`${baseUrl}/api/gallery/albums`);
    assert.equal(privateAlbumsBeforeLogin.status, 401, 'album administration should require authentication');
    let publicGalleryResponse = await fetch(`${baseUrl}/api/public/gallery`);
    assert.equal(publicGalleryResponse.status, 200);
    assert.deepEqual((await publicGalleryResponse.json()).data, [], 'gallery should start empty');
    const legacyMigrationDb = new DatabaseSync(databasePath);
    const migratedLegacyPhoto = legacyMigrationDb.prepare(`
      SELECT i.id, i.album_id, a.title AS album_title
      FROM gallery_images i JOIN gallery_albums a ON a.id = i.album_id
      WHERE i.file_id = 'legacy-gallery-photo'
    `).get();
    assert.equal(migratedLegacyPhoto.album_title, 'General Gallery', 'legacy photos should migrate into General Gallery');
    legacyMigrationDb.close();
    let galleryAlbums = (await (await fetch(`${baseUrl}/api/gallery/albums`, { headers: { Cookie: cookie } })).json()).data;
    const generalAlbum = galleryAlbums.find((album) => album.slug === 'general-gallery');
    const uncategorizedAlbum = galleryAlbums.find((album) => album.slug === 'uncategorized');
    assert(generalAlbum, 'General Gallery should exist even when created by migration');
    assert.equal(generalAlbum.photoCount, 1, 'migration should preserve the existing gallery photo');
    assert(uncategorizedAlbum, 'reserved Uncategorized album should exist');
    const initialPastoralTeam = (await (await fetch(`${baseUrl}/api/public/pastoral-team`)).json()).data;
    assert.equal(initialPastoralTeam.hierarchy.length, 3, 'the public pastoral team should include the default leadership');
    assert.equal(initialPastoralTeam.parishClergy[0].name, 'Rev. Fr. Francis Kale', 'the public pastoral team should include the default clergy');
    assert.equal(initialPastoralTeam.catechists.length, 2, 'the public pastoral team should include two catechist spots');
    assert.equal((await (await fetch(`${baseUrl}/api/public/committees`)).json()).data, null, 'the public committee API should allow the website defaults before edits');
    assert.equal((await (await fetch(`${baseUrl}/api/public/communities`)).json()).data, null, 'the public community API should allow the website defaults before edits');
    const invalidCommittees = await fetch(`${baseUrl}/api/committees`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id: 'bad', name: '', category: 'unknown', meeting: '', description: '' }]),
    });
    assert.equal(invalidCommittees.status, 400, 'invalid committee data should be rejected');
    const savedCommitteesResponse = await fetch(`${baseUrl}/api/committees`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { id: 'test-liturgy', name: 'Updated Liturgy Committee', category: 'liturgical', meeting: 'First Saturday', description: 'Coordinates liturgical events.', choirList: ['Choir practice on Tuesday'] },
        { id: 'test-finance', name: 'New Finance Committee', category: 'non-liturgical', meeting: 'Monthly', description: 'Oversees parish finances.' },
      ]),
    });
    assert.equal(savedCommitteesResponse.status, 200);
    const savedCommittees = (await savedCommitteesResponse.json()).data;
    assert.equal(savedCommittees[0].name, 'Updated Liturgy Committee');
    assert.deepEqual(savedCommittees[0].choirList, ['Choir practice on Tuesday']);
    assert.equal((await (await fetch(`${baseUrl}/api/public/committees`)).json()).data[1].name, 'New Finance Committee', 'public committee content should reflect Dominus edits');
    const invalidCommunities = await fetch(`${baseUrl}/api/communities`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizations: [] }),
    });
    assert.equal(invalidCommunities.status, 400, 'community data must provide every subsection');
    const savedCommunitiesResponse = await fetch(`${baseUrl}/api/communities`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizations: [{ id: 'test-cyon', name: 'Updated CYON', meeting: 'Third Sunday', thanksgiving: 'Sunday Mass' }],
        societies: [{ id: 'test-society', name: 'New Society', meeting: 'Wednesdays' }],
        knighthood: [],
        states: [{ id: 'test-state-community', name: 'New State Community', states: 'Abia', time: 'Monthly', details: { audience: 'Parishioners from Abia.', whatWeDo: 'Serve the parish.' } }],
      }),
    });
    assert.equal(savedCommunitiesResponse.status, 200);
    const savedCommunities = (await savedCommunitiesResponse.json()).data;
    assert.equal(savedCommunities.organizations[0].name, 'Updated CYON');
    assert.equal(savedCommunities.states[0].details.whatWeDo, 'Serve the parish.');
    assert.equal((await (await fetch(`${baseUrl}/api/public/communities`)).json()).data.societies[0].name, 'New Society', 'public community subsections should reflect Dominus edits');
    const invalidGalleryImage = await fetch(`${baseUrl}/api/gallery`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'Invalid',
        imageData: '',
      }),
    });
    assert.equal(invalidGalleryImage.status, 400, 'gallery items should require an uploaded image');
    const jpegData = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(100)]).toString('base64')}`;
    const invalidPastoralTeam = await fetch(`${baseUrl}/api/pastoral-team`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hierarchy: [], parishClergy: [] }),
    });
    assert.equal(invalidPastoralTeam.status, 400, 'invalid pastoral team configurations should be rejected');
    const changedPastoralTeam = {
      hierarchy: initialPastoralTeam.hierarchy.map((member) => ({ ...member })),
      parishClergy: [
        { ...initialPastoralTeam.parishClergy[0], name: 'Rev. Fr. New Parish Priest', title: 'Parish Priest' },
        ...initialPastoralTeam.parishClergy.slice(1).map((member) => ({ ...member })),
        { id: 'new-associate', name: 'Rev. Fr. New Associate', title: 'Associate Priest', contact: 'Contact via Parish Office', image: '' },
      ],
    };
    const savePastoralTeam = await fetch(`${baseUrl}/api/pastoral-team`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(changedPastoralTeam),
    });
    assert.equal(savePastoralTeam.status, 200);
    const savedPastoralTeam = (await savePastoralTeam.json()).data;
    assert.equal(savedPastoralTeam.parishClergy[0].name, 'Rev. Fr. New Parish Priest', 'Dominus should save pastoral team names and roles');
    assert.equal(savedPastoralTeam.parishClergy[3].id, 'new-associate', 'Dominus should support adding new team members');
    const publicChangedPastoralTeam = (await (await fetch(`${baseUrl}/api/public/pastoral-team`)).json()).data;
    assert.equal(publicChangedPastoralTeam.parishClergy[0].title, 'Parish Priest', 'public team details should reflect the saved roster');
    assert.equal(publicChangedPastoralTeam.parishClergy[3].name, 'Rev. Fr. New Associate');
    const savedNewMemberPhoto = await fetch(`${baseUrl}/api/pastoral-images/new-associate`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: jpegData }),
    });
    assert.equal(savedNewMemberPhoto.status, 200, 'new pastoral team members should be able to receive photos');
    const savedCatechistPhoto = await fetch(`${baseUrl}/api/pastoral-images/catechist1`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: jpegData }),
    });
    assert.equal(savedCatechistPhoto.status, 200, 'Dominus should accept photos for the catechist slots');
    assert.equal((await savedCatechistPhoto.json()).data.catechist1, jpegData, 'catechist photo uploads should be returned to the dashboard');
    const publicCatechistsWithPhoto = (await (await fetch(`${baseUrl}/api/public/pastoral-team`)).json()).data.catechists;
    assert.equal(publicCatechistsWithPhoto[0].image, jpegData, 'uploaded catechist photos should be displayed publicly');
    const resetCatechistPhoto = await fetch(`${baseUrl}/api/pastoral-images/catechist1`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: null }),
    });
    assert.equal(resetCatechistPhoto.status, 200);
    const removeNewPastoralMember = await fetch(`${baseUrl}/api/pastoral-team`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hierarchy: changedPastoralTeam.hierarchy,
        parishClergy: changedPastoralTeam.parishClergy.filter((member) => member.id !== 'new-associate'),
      }),
    });
    assert.equal(removeNewPastoralMember.status, 200, 'Dominus should support removing team members');
    assert.equal((await (await fetch(`${baseUrl}/api/pastoral-images`, { headers: { Cookie: cookie } })).json()).data['new-associate'], undefined, 'removing a member should also remove their photo override');
    const invalidPastoralImageKey = await fetch(`${baseUrl}/api/pastoral-images/not-a-team-member`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: jpegData }),
    });
    assert.equal(invalidPastoralImageKey.status, 404, 'unknown pastoral team image slots should be rejected');
    const invalidPastoralImage = await fetch(`${baseUrl}/api/pastoral-images/parishPriest`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: 'not-an-image' }),
    });
    assert.equal(invalidPastoralImage.status, 400, 'invalid pastoral team images should be rejected');
    const savedPastoralImageResponse = await fetch(`${baseUrl}/api/pastoral-images/parishPriest`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: jpegData }),
    });
    assert.equal(savedPastoralImageResponse.status, 200);
    assert.equal((await savedPastoralImageResponse.json()).data.parishPriest, jpegData, 'Dominus should save a pastoral team photo override');
    let publicPastoralTeam = (await (await fetch(`${baseUrl}/api/public/pastoral-team`)).json()).data;
    assert.equal(publicPastoralTeam.parishClergy[0].image, jpegData, 'saved pastoral photos should be available on the public site');
    const resetPastoralImageResponse = await fetch(`${baseUrl}/api/pastoral-images/parishPriest`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: null }),
    });
    assert.equal(resetPastoralImageResponse.status, 200);
    assert.deepEqual((await resetPastoralImageResponse.json()).data, {}, 'Dominus should be able to restore the original pastoral team photo');
    publicPastoralTeam = (await (await fetch(`${baseUrl}/api/public/pastoral-team`)).json()).data;
    assert.equal(publicPastoralTeam.parishClergy[0].image, '/images/priest1.jpg', 'resetting a pastoral photo should restore its default');
    const createdGalleryImageResponse = await fetch(`${baseUrl}/api/gallery`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'Parish Feast Day',
        imageData: jpegData,
      }),
    });
    assert.equal(createdGalleryImageResponse.status, 201);
    const galleryImage = (await createdGalleryImageResponse.json()).data;
    assert.equal(galleryImage.status, 'Draft');
    assert.equal(galleryImage.isFeatured, false);
    assert.equal(galleryImage.thumbnailUrl, `/api/gallery/${galleryImage.id}/image`);
    assert.equal(galleryImage.viewerUrl, '');
    publicGalleryResponse = await fetch(`${baseUrl}/api/public/gallery`);
    assert.deepEqual((await publicGalleryResponse.json()).data, [], 'draft gallery items should remain private');
    const privateDraftImage = await fetch(`${baseUrl}/api/public/gallery/${galleryImage.id}/image`);
    assert.equal(privateDraftImage.status, 404, 'draft gallery images should not be publicly accessible');
    const adminImageResponse = await fetch(`${baseUrl}/api/gallery/${galleryImage.id}/image`, { headers: { Cookie: cookie } });
    assert.equal(adminImageResponse.status, 200);
    assert.equal(adminImageResponse.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await adminImageResponse.arrayBuffer()), Buffer.from(jpegData.split(',')[1], 'base64'));
    const publishGalleryImage = await fetch(`${baseUrl}/api/gallery/${galleryImage.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(publishGalleryImage.status, 200);
    const publishedGalleryImage = {
      ...galleryImage,
      status: 'Published',
      thumbnailUrl: `/api/public/gallery/${galleryImage.id}/image`,
    };
    publicGalleryResponse = await fetch(`${baseUrl}/api/public/gallery`);
    assert.deepEqual((await publicGalleryResponse.json()).data, [publishedGalleryImage]);
    const featureGalleryImage = await fetch(`${baseUrl}/api/gallery/${galleryImage.id}/feature`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(featureGalleryImage.status, 200);
    publicGalleryResponse = await fetch(`${baseUrl}/api/public/gallery`);
    assert.equal((await publicGalleryResponse.json()).data[0].isFeatured, true);
    const publicImageResponse = await fetch(`${baseUrl}/api/public/gallery/${galleryImage.id}/image`);
    assert.equal(publicImageResponse.status, 200, 'published gallery images should be publicly viewable');
    assert.deepEqual(Buffer.from(await publicImageResponse.arrayBuffer()), Buffer.from(jpegData.split(',')[1], 'base64'));

    const createAlbumResponse = await fetch(`${baseUrl}/api/gallery/albums`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Harvest of Amazing Grace 2026', date: '2026-04-15', description: 'Parish harvest celebration.' }),
    });
    assert.equal(createAlbumResponse.status, 201);
    let harvestAlbum = (await createAlbumResponse.json()).data;
    assert.equal(harvestAlbum.slug, 'harvest-of-amazing-grace-2026');
    assert.equal(harvestAlbum.date, '2026-04-15');

    const albumImageResponse = await fetch(`${baseUrl}/api/gallery`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: 'Harvest celebration', imageData: jpegData, albumId: harvestAlbum.id }),
    });
    assert.equal(albumImageResponse.status, 201);
    const albumImage = (await albumImageResponse.json()).data;
    assert.equal(albumImage.albumId, harvestAlbum.id, 'uploaded photos should belong to the selected album');
    const publishAlbumImage = await fetch(`${baseUrl}/api/gallery/${albumImage.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(publishAlbumImage.status, 200);

    const movePhotoToAlbum = await fetch(`${baseUrl}/api/gallery/${galleryImage.id}/album`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumId: harvestAlbum.id }),
    });
    assert.equal(movePhotoToAlbum.status, 200);
    assert.equal((await movePhotoToAlbum.json()).data.albumId, harvestAlbum.id, 'photos should be movable between albums');

    const setAlbumCover = await fetch(`${baseUrl}/api/gallery/albums/${harvestAlbum.id}`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: harvestAlbum.title, date: harvestAlbum.date, description: harvestAlbum.description, coverImageId: albumImage.id }),
    });
    assert.equal(setAlbumCover.status, 200);
    harvestAlbum = (await setAlbumCover.json()).data;
    assert.equal(harvestAlbum.coverImage.id, albumImage.id, 'an album cover should be changeable');

    const featureAlbum = await fetch(`${baseUrl}/api/gallery/albums/${harvestAlbum.id}/feature`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(featureAlbum.status, 200);
    let publicAlbums = (await (await fetch(`${baseUrl}/api/public/gallery/albums`)).json()).data;
    assert.equal(publicAlbums[0].slug, harvestAlbum.slug, 'featured album should sort first in the public gallery');
    assert.equal(publicAlbums[0].isFeatured, true);
    assert.equal(publicAlbums[0].photoCount, 2);
    const publicAlbumDetail = await fetch(`${baseUrl}/api/public/gallery/albums/${harvestAlbum.slug}`);
    assert.equal(publicAlbumDetail.status, 200);
    assert.equal((await publicAlbumDetail.json()).data.photos.length, 2, 'album detail should include only its published photos');

    const deleteAlbum = await fetch(`${baseUrl}/api/gallery/albums/${harvestAlbum.id}`, {
      method: 'DELETE',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(deleteAlbum.status, 200);
    galleryAlbums = (await (await fetch(`${baseUrl}/api/gallery/albums`, { headers: { Cookie: cookie } })).json()).data;
    const refreshedUncategorized = galleryAlbums.find((album) => album.slug === 'uncategorized');
    const remainingImages = (await (await fetch(`${baseUrl}/api/gallery`, { headers: { Cookie: cookie } })).json()).data;
    assert(!galleryAlbums.some((album) => album.id === harvestAlbum.id), 'deleted albums should no longer be listed');
    assert(remainingImages.filter((image) => image.albumId === refreshedUncategorized.id).length >= 2, 'deleting an album should move rather than delete its photos');

    const adminList = await fetch(`${baseUrl}/api/announcements`, { headers: { Cookie: cookie } });
    const existingAnnouncements = (await adminList.json()).data;
    const legacyAnnouncements = JSON.parse(await readFile(path.resolve('server/data/announcements.json'), 'utf8'));
    assert(legacyAnnouncements.filter((item) => item.title && item.description).every((legacy) => (
      existingAnnouncements.some((item) => item.title === legacy.title && item.description === legacy.description)
    )), 'current legacy announcements should migrate to SQLite');
    const existingArticles = (await (await fetch(`${baseUrl}/api/articles`, { headers: { Cookie: cookie } })).json()).data;
    assert.equal(existingArticles.find((article) => article.slug === 'existing-post').authorName, 'Holy Rosary Catholic Church', 'existing database rows should receive a safe default byline');
    const initialPublicArticles = (await (await fetch(`${baseUrl}/api/public/articles`)).json()).data;
    const parishReflection = initialPublicArticles.find((article) => article.slug === 'one-family-united-in-christ-by-different-languages');
    assert.equal(parishReflection?.authorName, 'Mbamalu Valerian', 'the supplied first article should be imported and public');
    assert(parishReflection.body.includes('## The Sanctuary Became a Village Square'), 'article section headings should remain Markdown in storage');

    const parishWeek = getParishWeek();
    const createdResponse = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Smoke Notice', description: 'Created through the authenticated API', date: parishWeek.today }),
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).data;
    let publicAnnouncements = (await (await fetch(`${baseUrl}/api/public/announcements`)).json()).data;
    assert(!publicAnnouncements.some((item) => item.id === created.id), 'drafts should not appear publicly');

    const publish = await fetch(`${baseUrl}/api/announcements/${created.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(publish.status, 200);
    publicAnnouncements = (await (await fetch(`${baseUrl}/api/public/announcements`)).json()).data;
    assert(publicAnnouncements.some((item) => item.id === created.id), 'published announcements should be public');

    const nextWeekNoticeResponse = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Next Week Notice', description: 'Should wait for Sunday', date: parishWeek.nextSunday }),
    });
    const nextWeekNotice = (await nextWeekNoticeResponse.json()).data;
    await fetch(`${baseUrl}/api/announcements/${nextWeekNotice.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    publicAnnouncements = (await (await fetch(`${baseUrl}/api/public/announcements`)).json()).data;
    assert(!publicAnnouncements.some((item) => item.id === nextWeekNotice.id), 'next Sunday announcements should wait until the next parish week');

    const pastCreatedResponse = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Past Notice', description: 'Must remain in the dashboard only', date: '2000-01-01' }),
    });
    assert.equal(pastCreatedResponse.status, 201);
    const pastNotice = (await pastCreatedResponse.json()).data;
    const publishPast = await fetch(`${baseUrl}/api/announcements/${pastNotice.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(publishPast.status, 200);
    const privateAnnouncements = (await (await fetch(`${baseUrl}/api/announcements`, { headers: { Cookie: cookie } })).json()).data;
    assert(privateAnnouncements.some((item) => item.id === pastNotice.id), 'past notices should remain in the dashboard');
    publicAnnouncements = (await (await fetch(`${baseUrl}/api/public/announcements`)).json()).data;
    assert(!publicAnnouncements.some((item) => item.id === pastNotice.id), 'past published activities should be hidden publicly');

    const existingFeastDays = (await (await fetch(`${baseUrl}/api/feast-days`, { headers: { Cookie: cookie } })).json()).data;
    const ordoData = JSON.parse(await readFile(path.resolve('src/data/ordoCalendar.json'), 'utf8'));
    const seedFeastTitles = ordoData.filter((entry) => entry.group === 'Feast & Saint Days' && entry.title).map((entry) => entry.title);
    assert(seedFeastTitles.every((title) => existingFeastDays.some((item) => item.title === title)), 'existing feast days should migrate to SQLite');

    const feastDayCreated = await fetch(`${baseUrl}/api/feast-days`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Solemnity of Christ the King', description: '', category: 'Solemnity', date: parishWeek.today, color: '#ffffff' }),
    });
    assert.equal(feastDayCreated.status, 201);
    const draftFeastDay = (await feastDayCreated.json()).data;
    assert.equal(draftFeastDay.color, '#ffffff', 'feast day color should be saved');
    let publicFeastDays = (await (await fetch(`${baseUrl}/api/public/feast-days`)).json()).data;
    assert(!publicFeastDays.some((item) => item.id === draftFeastDay.id), 'draft feast days should not appear publicly');

    const invalidColorFeast = await fetch(`${baseUrl}/api/feast-days`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Invalid Color Feast', category: 'Memorial', date: '2999-12-31', color: '#ff0000' }),
    });
    assert.equal(invalidColorFeast.status, 400, 'unsupported liturgical colors should be rejected');

    const publishFeast = await fetch(`${baseUrl}/api/feast-days/${draftFeastDay.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(publishFeast.status, 200);
    publicFeastDays = (await (await fetch(`${baseUrl}/api/public/feast-days`)).json()).data;
    assert(publicFeastDays.some((item) => item.id === draftFeastDay.id), 'published feast days should be public');

    const nextWeekFeastResponse = await fetch(`${baseUrl}/api/feast-days`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Next Week Feast', description: '', category: 'Feast', date: parishWeek.nextSunday, color: '#ffffff' }),
    });
    const nextWeekFeast = (await nextWeekFeastResponse.json()).data;
    await fetch(`${baseUrl}/api/feast-days/${nextWeekFeast.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    publicFeastDays = (await (await fetch(`${baseUrl}/api/public/feast-days`)).json()).data;
    assert(!publicFeastDays.some((item) => item.id === nextWeekFeast.id), 'next Sunday feast days should wait until the next parish week');

    const articleCreated = await fetch(`${baseUrl}/api/articles`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'A Weekly Reflection',
        authorName: 'Valerian',
        excerpt: 'A short introduction to this week’s parish reflection.',
        body: 'Full article text,\nwith a new paragraph.',
        imageData: jpegData,
        publishDate: '2999-12-31',
      }),
    });
    assert.equal(articleCreated.status, 201);
    const draftArticle = (await articleCreated.json()).data;
    assert.equal(draftArticle.authorName, 'Valerian', 'writer name should be saved on the article');
    assert.equal(draftArticle.imageData, jpegData, 'article pictures should be saved with the draft');
    let publicArticles = (await (await fetch(`${baseUrl}/api/public/articles`)).json()).data;
    assert(!publicArticles.some((article) => article.id === draftArticle.id), 'draft articles should not be public');

    const updatedArticleResponse = await fetch(`${baseUrl}/api/articles/${draftArticle.id}`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'A Weekly Reflection Updated',
        authorName: 'Valerian Updated',
        excerpt: 'A revised introduction to the parish reflection.',
        body: 'Updated article text.',
        publishDate: '2999-12-31',
      }),
    });
    assert.equal(updatedArticleResponse.status, 200, 'draft articles should be editable');
    const updatedDraftArticle = (await updatedArticleResponse.json()).data;
    assert.equal(updatedDraftArticle.authorName, 'Valerian Updated', 'writer name should be editable on drafts');
    assert.equal(updatedDraftArticle.imageData, jpegData, 'editing other fields should preserve the article picture');

    const scheduledPublish = await fetch(`${baseUrl}/api/articles/${draftArticle.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(scheduledPublish.status, 200);
    publicArticles = (await (await fetch(`${baseUrl}/api/public/articles`)).json()).data;
    assert(!publicArticles.some((article) => article.id === draftArticle.id), 'scheduled articles should wait for their publication date');

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());
    const weeklyArticleResponse = await fetch(`${baseUrl}/api/articles`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'This Week at Holy Rosary',
        authorName: 'Valerian',
        excerpt: 'A reflection for the parish this week.',
        body: 'The published article appears on the public blog.',
        imageData: jpegData,
        publishDate: today,
      }),
    });
    const weeklyArticle = (await weeklyArticleResponse.json()).data;
    await fetch(`${baseUrl}/api/articles/${weeklyArticle.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    publicArticles = (await (await fetch(`${baseUrl}/api/public/articles`)).json()).data;
    assert(publicArticles.some((article) => article.id === weeklyArticle.id), 'published articles dated today should be public');
    assert.equal(publicArticles.find((article) => article.id === weeklyArticle.id).authorName, 'Valerian', 'public articles should show their writer name');
    assert.equal(publicArticles.find((article) => article.id === weeklyArticle.id).imageData, jpegData, 'published article pictures should be public');
    const removableArticleResponse = await fetch(`${baseUrl}/api/articles`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Published Article to Remove',
        authorName: 'Valerian',
        excerpt: 'A temporary published article.',
        body: 'This published article will be deleted.',
        publishDate: today,
      }),
    });
    const removableArticle = (await removableArticleResponse.json()).data;
    await fetch(`${baseUrl}/api/articles/${removableArticle.id}/publish`, {
      method: 'PUT',
      headers: { Origin: origin, Cookie: cookie },
    });
    const deletePublishedArticle = await fetch(`${baseUrl}/api/articles/${removableArticle.id}`, {
      method: 'DELETE',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(deletePublishedArticle.status, 200, 'published articles should be deletable from Dominus');
    publicArticles = (await (await fetch(`${baseUrl}/api/public/articles`)).json()).data;
    assert(!publicArticles.some((article) => article.id === removableArticle.id), 'deleted published articles should no longer appear publicly');

    await stopServer();
    await startServer();
    const restoredSession = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } });
    assert.equal(restoredSession.status, 200, 'session should remain valid after an application restart');
    publicAnnouncements = (await (await fetch(`${baseUrl}/api/public/announcements`)).json()).data;
    assert(publicAnnouncements.some((item) => item.id === created.id), 'published data should persist across restart');
    publicArticles = (await (await fetch(`${baseUrl}/api/public/articles`)).json()).data;
    assert(publicArticles.some((article) => article.id === weeklyArticle.id), 'published articles should persist across restart');
    publicFeastDays = (await (await fetch(`${baseUrl}/api/public/feast-days`)).json()).data;
    assert(publicFeastDays.some((item) => item.id === draftFeastDay.id), 'published feast days should persist across restart');
    const restoredGalleryImages = (await (await fetch(`${baseUrl}/api/gallery`, { headers: { Cookie: cookie } })).json()).data;
    assert(restoredGalleryImages.some((image) => image.id === galleryImage.id && image.thumbnailUrl === `/api/public/gallery/${galleryImage.id}/image` && image.isFeatured), 'uploaded gallery images and featured selection should persist across restart');
    publicGalleryResponse = await fetch(`${baseUrl}/api/public/gallery`);
    assert((await publicGalleryResponse.json()).data.some((image) => image.id === galleryImage.id), 'published gallery items should persist across restart');

    const logout = await fetch(`${baseUrl}/api/logout`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(logout.status, 200);
    const deniedAfterLogout = await fetch(`${baseUrl}/api/announcements`, { headers: { Cookie: cookie } });
    assert.equal(deniedAfterLogout.status, 401);
  } finally {
    await stopServer();
    await rm(tempDir, { recursive: true, force: true });
  }
});