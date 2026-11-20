import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderNewsletter } from './newsletter-core.js';

const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]).toString('base64')}`;

test('The Rosarian email design is branded, escaped and email-safe', () => {
  const { html, text, subject } = renderNewsletter(
    { label: 'December 2026', subject: '', intro: 'Peace be with you.\n\nSecond paragraph.' },
    [
      { headline: 'Christmas <script>alert(1)</script> Masses', body: 'Join us.\nAll welcome.', image_token: 'abc', image_data: '', link_url: 'https://example.org/a?b=1&c=2', link_label: 'See times', updated_at: '2026-01-01 00:00:00' },
      { headline: 'Choir news', body: 'Rehearsals on Fridays.', image_token: '', image_data: '', link_url: '', link_label: '', updated_at: '' },
    ],
    { baseUrl: 'https://parish.example/', unsubscribeUrl: 'https://parish.example/u?token=t', imageUrl: () => 'https://parish.example/img.jpg' },
  );
  assert.equal(subject, 'The Rosarian - December 2026');
  assert.match(html, /The Rosarian/i);
  assert.match(html, /Parish News and Highlights/);
  assert.match(html, /December 2026/);
  assert(!html.includes('<script>alert(1)</script>'), 'headlines must be HTML-escaped');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /https:\/\/parish\.example\/img\.jpg/);
  assert.match(html, /href="https:\/\/example\.org\/a\?b=1&amp;c=2"/);
  assert.match(html, /https:\/\/parish\.example\/u\?token=t/);
  assert.match(html, /In this issue/);
  assert.match(text, /THE ROSARIAN - Parish News and Highlights/);
  assert.match(text, /Unsubscribe: https:\/\/parish\.example\/u\?token=t/);
});

test('The Rosarian: subscribe, compose, preview, test-send, monthly send and unsubscribe', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'rosarian-test-'));
  const outbox = path.join(tempDir, 'outbox.jsonl');
  await writeFile(outbox, '');
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const origin = 'http://localhost:5173';
  const base = `http://127.0.0.1:${port}`;
  let output = '';
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DATABASE_PATH: path.join(tempDir, 'db.sqlite'),
      APP_ORIGIN: origin,
      SESSION_SECRET: 'test-session-secret',
      DOMINUS_USERNAME: 'dominus01',
      DOMINUS_PASSWORD: 'test-password-that-is-not-production',
      NEWSLETTER_MAIL_TRANSPORT: 'json',
      NEWSLETTER_OUTBOX_PATH: outbox,
      NEWSLETTER_SEND_DELAY_MS: '0',
      PUBLIC_SITE_URL: 'https://parish.example',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => { output += chunk; if (output.includes(`listening on port ${port}`)) resolve(); });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('exit', (code) => reject(new Error(`server exited ${code}: ${output}`)));
  });
  const json = (cookie, method, url, body) => fetch(`${base}${url}`, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const outboxMessages = async () => (await readFile(outbox, 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line));

  try {
    // admin endpoints are private
    for (const url of ['/api/newsletter/overview', '/api/newsletter/issues', '/api/newsletter/subscribers', '/api/newsletter/subscribers.csv']) {
      assert.equal((await fetch(`${base}${url}`)).status, 401, `${url} must require sign-in`);
    }
    const login = await json('', 'POST', '/api/login', { username: 'dominus01', password: 'test-password-that-is-not-production' });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];

    // public subscribe validation
    const goodForm = { name: 'Mary Okafor', email: 'Mary@Example.com', whatsapp: '+234 801 234 5678', phone: '0801 234 5678', consent: true };
    assert.equal((await json('', 'POST', '/api/public/newsletter/subscribe', { ...goodForm, consent: false })).status, 400, 'consent is required');
    assert.equal((await json('', 'POST', '/api/public/newsletter/subscribe', { ...goodForm, email: 'not-an-email' })).status, 400);
    assert.equal((await json('', 'POST', '/api/public/newsletter/subscribe', { ...goodForm, name: '' })).status, 400);
    assert.equal((await json('', 'POST', '/api/public/newsletter/subscribe', { ...goodForm, phone: 'call me' })).status, 400);
    assert.equal((await json('', 'POST', '/api/public/newsletter/subscribe', goodForm)).status, 201);
    assert.equal((await json('', 'POST', '/api/public/newsletter/subscribe', { ...goodForm, name: 'Mary O.' })).status, 201, 'resubscribing is idempotent');
    assert.equal((await json('', 'POST', '/api/public/newsletter/subscribe', { name: 'Bot', email: 'bot@example.com', consent: true, website: 'spam' })).status, 201);
    await json('', 'POST', '/api/public/newsletter/subscribe', { name: '=HYPERLINK("x")', email: 'john@example.com', consent: true });

    let subscribers = (await (await json(cookie, 'GET', '/api/newsletter/subscribers')).json()).data;
    assert.equal(subscribers.total, 2, 'duplicates and honeypot sign-ups must not create extra rows');
    const mary = subscribers.items.find((item) => item.email === 'mary@example.com');
    assert.equal(mary.name, 'Mary O.');
    assert.equal(mary.whatsapp, '+234 801 234 5678');
    assert.equal(mary.phone, '0801 234 5678');
    const welcome = await outboxMessages();
    assert.equal(welcome.filter((message) => /Welcome/.test(message.subject)).length, 2, 'new subscribers get a welcome email once');

    // csv export neutralises spreadsheet formulas
    const csv = await (await fetch(`${base}/api/newsletter/subscribers.csv`, { headers: { Cookie: cookie } })).text();
    assert.match(csv, /"Name","Email","WhatsApp","Phone"/);
    assert.match(csv, /"'=HYPERLINK/);

    // compose an issue
    const created = (await (await json(cookie, 'POST', '/api/newsletter/issues', { label: 'December 2026' })).json()).data;
    assert.equal(created.status, 'Draft');
    assert.equal((await json(cookie, 'PUT', `/api/newsletter/issues/${created.id}/status`, { status: 'Ready' })).status, 400, 'an empty issue cannot be Ready');
    await json(cookie, 'PUT', `/api/newsletter/issues/${created.id}`, { label: 'December 2026', subject: '', intro: 'Peace be with you all.' });
    const item1 = (await (await json(cookie, 'POST', `/api/newsletter/issues/${created.id}/items`, {})).json()).data;
    const item2 = (await (await json(cookie, 'POST', `/api/newsletter/issues/${created.id}/items`, {})).json()).data;
    assert.equal((await json(cookie, 'PUT', `/api/newsletter/items/${item1.id}`, { headline: 'Christmas <b>Masses</b>', body: 'Join us for Mass.', linkUrl: 'javascript:alert(1)', linkLabel: '' })).status, 400, 'only http(s) links are allowed');
    const savedItem1 = (await (await json(cookie, 'PUT', `/api/newsletter/items/${item1.id}`, { headline: 'Christmas <b>Masses</b>', body: 'Join us for Mass.', linkUrl: 'https://parish.example/masses', linkLabel: 'Mass times' })).json()).data;
    assert.equal(savedItem1.linkUrl, 'https://parish.example/masses');
    await json(cookie, 'PUT', `/api/newsletter/items/${item2.id}`, { headline: 'Choir news', body: 'Rehearsals every Friday.', linkUrl: '', linkLabel: '' });
    assert.equal((await json(cookie, 'PUT', `/api/newsletter/items/${item1.id}/image`, { imageData: 'data:text/html;base64,PHA+' })).status, 400, 'non-images are rejected');
    const withImage = (await (await json(cookie, 'PUT', `/api/newsletter/items/${item1.id}/image`, { imageData: jpeg })).json()).data;
    assert(withImage.hasImage && withImage.imageUrl.startsWith('/api/public/newsletter/images/'));
    const servedImage = await fetch(`${base}${withImage.imageUrl}`);
    assert.equal(servedImage.status, 200);
    assert.equal(servedImage.headers.get('content-type'), 'image/jpeg');
    assert.equal((await fetch(`${base}/api/public/newsletter/images/not-a-token`)).status, 404);

    // reorder
    await json(cookie, 'POST', `/api/newsletter/items/${item2.id}/move`, { direction: 'up' });
    let detail = (await (await json(cookie, 'GET', `/api/newsletter/issues/${created.id}`)).json()).data;
    assert.deepEqual(detail.items.map((item) => item.id), [item2.id, item1.id], 'headlines can be reordered');
    await json(cookie, 'POST', `/api/newsletter/items/${item2.id}/move`, { direction: 'down' });

    // preview
    const preview = (await (await json(cookie, 'GET', `/api/newsletter/issues/${created.id}/preview`)).json()).data;
    assert.match(preview.html, /The Rosarian/i);
    assert.match(preview.html, /Parish News and Highlights/);
    assert(!preview.html.includes('<b>Masses</b>'), 'preview must escape user text');
    assert(preview.html.includes('data:image/jpeg;base64'), 'preview inlines the picture');
    assert(preview.html.includes('<img src="https://parish.example/images/holy_rosary_seal_cutout.png"'), 'preview shows the parish seal');
    const seal = await fetch(`${base}/images/holy_rosary_seal_cutout.png`);
    assert.equal(seal.status, 200, 'the seal asset is served by the site');
    assert.equal(seal.headers.get('content-type'), 'image/png');

    // test send goes only to the requested address
    const before = (await outboxMessages()).length;
    const testSend = await json(cookie, 'POST', `/api/newsletter/issues/${created.id}/test`, { email: 'editor@example.com' });
    assert.equal(testSend.status, 200);
    const afterTest = await outboxMessages();
    assert.equal(afterTest.length, before + 1);
    assert.match(afterTest.at(-1).subject, /^\[TEST\] The Rosarian - December 2026$/);
    assert.equal((await json(cookie, 'POST', `/api/newsletter/issues/${created.id}/send`, {})).status, 409, 'a Draft cannot be sent');

    // mark ready and send
    assert.equal((await json(cookie, 'PUT', `/api/newsletter/issues/${created.id}/status`, { status: 'Ready' })).status, 200);
    const overview = (await (await json(cookie, 'GET', '/api/newsletter/overview')).json()).data;
    assert.equal(overview.mailConfigured, true);
    assert.equal(overview.activeSubscribers, 2);
    assert.equal(overview.readyIssue.id, created.id);
    const send = await json(cookie, 'POST', `/api/newsletter/issues/${created.id}/send`, {});
    assert.equal(send.status, 202);
    let issue;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      issue = (await (await json(cookie, 'GET', `/api/newsletter/issues/${created.id}`)).json()).data;
      if (issue.status === 'Sent') break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(issue.status, 'Sent');
    assert.equal(issue.sentCount, 2);
    const issueMails = (await outboxMessages()).filter((message) => message.subject === 'The Rosarian - December 2026');
    assert.equal(issueMails.length, 2, 'each subscriber receives exactly one copy');
    assert.deepEqual(issueMails.map((message) => message.to.address).sort(), ['john@example.com', 'mary@example.com']);
    const maryMail = issueMails.find((message) => message.to.address === 'mary@example.com');
    const unsubscribeUrl = maryMail.headers['List-Unsubscribe'].match(/<(https?:[^>]+)>/)[1];
    assert.match(unsubscribeUrl, /^https:\/\/parish\.example\/api\/public\/newsletter\/unsubscribe\?token=/);
    assert.equal(maryMail.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert(maryMail.html.includes(unsubscribeUrl.replace(/&/g, '&amp;')), 'body carries the personal unsubscribe link');
    assert.match(maryMail.html, /https:\/\/parish\.example\/api\/public\/newsletter\/images\//, 'pictures are absolute public URLs');
    assert.notEqual(issueMails[0].headers['List-Unsubscribe'], issueMails[1].headers['List-Unsubscribe']);
    assert.equal((await json(cookie, 'PUT', `/api/newsletter/issues/${created.id}`, { label: 'Changed', subject: '', intro: '' })).status, 409, 'sent issues are locked');
    assert.equal((await json(cookie, 'POST', `/api/newsletter/issues/${created.id}/send`, {})).status, 409, 'a sent issue cannot be sent twice');

    // unsubscribe: GET is a confirmation page, POST performs it (also supports mail-client one-click)
    const token = new URL(unsubscribeUrl).searchParams.get('token');
    const page = await fetch(`${base}/api/public/newsletter/unsubscribe?token=${token}`);
    assert.match(await page.text(), /Unsubscribe me/);
    assert.equal((await json(cookie, 'GET', '/api/newsletter/subscribers?status=Active')).status, 200);
    let active = (await (await json(cookie, 'GET', '/api/newsletter/subscribers?status=Active')).json()).data;
    assert.equal(active.total, 2, 'merely opening the link must not unsubscribe anyone');
    const oneClick = await fetch(`${base}/api/public/newsletter/unsubscribe?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    assert.equal(oneClick.status, 200);
    const done = await fetch(`${base}/api/public/newsletter/unsubscribe`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${encodeURIComponent(token)}`,
    });
    assert.match(await done.text(), /unsubscribed/i);
    active = (await (await json(cookie, 'GET', '/api/newsletter/subscribers?status=Active')).json()).data;
    assert.equal(active.total, 1);
    assert.equal(active.items[0].email, 'john@example.com');

    // manual add and delete
    const added = await json(cookie, 'POST', '/api/newsletter/subscribers', { name: 'Fr. Francis', email: 'priest@example.com', phone: '0812 219 2192' });
    assert.equal(added.status, 201);
    assert.equal((await json(cookie, 'POST', '/api/newsletter/subscribers', { name: 'Dup', email: 'PRIEST@example.com' })).status, 409);
    assert.equal((await json(cookie, 'DELETE', `/api/newsletter/subscribers/${(await added.json()).data.id}`)).status, 200);
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit').catch(() => {});
    await rm(tempDir, { recursive: true, force: true });
  }
});
