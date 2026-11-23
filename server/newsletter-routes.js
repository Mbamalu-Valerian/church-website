import express from 'express';
import {
  MONTH_NAMES, NEWSLETTER_SUBTITLE, NEWSLETTER_TITLE, PARISH_NAME, buildMessage, escapeHtml, imageUrlFor,
  isSending, lagosNow, newToken, renderNewsletter, sendIssue, unsubscribeUrlFor, issueSubject,
} from './newsletter-core.js';

const EMAIL_PATTERN = /^[^\s@<>"',;:()[\]\\]+@[^\s@<>"',;:()[\]\\]+\.[^\s@<>"',;:()[\]\\]{2,}$/;
const PHONE_PATTERN = /^[+0-9()\-\s]{6,30}$/;
const cleanText = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const cleanBlock = (value, max) => (typeof value === 'string' ? value.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '');
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

function readSubscriberFields(body, { requireConsent }) {
  const name = cleanText(body?.name, 120);
  const email = normalizeEmail(body?.email);
  const whatsapp = cleanText(body?.whatsapp, 30);
  const phone = cleanText(body?.phone, 30);
  if (!name) return { error: 'Please enter your name.' };
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return { error: 'Please enter a valid email address.' };
  if ((whatsapp && !PHONE_PATTERN.test(whatsapp)) || (phone && !PHONE_PATTERN.test(phone))) return { error: 'Phone numbers may only contain digits, spaces, +, - and brackets.' };
  if (requireConsent && body?.consent !== true) return { error: 'Please tick the box to agree to receive The Rosarian by email.' };
  return { name, email, whatsapp, phone };
}

const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // stop spreadsheet formula injection
  return `"${text.replace(/"/g, '""')}"`;
};

const pageShell = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#efe9dc;font-family:Georgia,serif;color:#1a2744;"><div style="max-width:520px;margin:48px auto;padding:36px 30px;background:#fffdf8;border-top:5px solid #c9a84c;border-radius:6px;text-align:center;box-shadow:0 8px 30px rgba(26,39,68,.12);">
<p style="margin:0;font:11px Arial,sans-serif;letter-spacing:4px;text-transform:uppercase;color:#a07830;">${PARISH_NAME}</p><h1 style="margin:10px 0 4px;font-size:34px;letter-spacing:4px;text-transform:uppercase;">${NEWSLETTER_TITLE}</h1>
<p style="margin:0 0 24px;font:12px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#a07830;">${NEWSLETTER_SUBTITLE}</p>${body}</div></body></html>`;

export function registerNewsletterRoutes(app, { database, requireSession, parseImage, getBaseUrl, getMailer, dailyLimit, delayMs, log = console }) {
  const subscribeAttempts = new Map();
  const get = (sql, ...params) => database.prepare(sql).get(...params);
  const all = (sql, ...params) => database.prepare(sql).all(...params);
  const run = (sql, ...params) => database.prepare(sql).run(...params);
  const idParam = (value) => { const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : null; };
  const activeCount = () => get("SELECT COUNT(*) AS count FROM newsletter_subscribers WHERE status = 'Active'").count;

  // ------------------------------- public -------------------------------

  app.post('/api/public/newsletter/subscribe', (req, res) => {
    const address = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (subscribeAttempts.get(address) || []).filter((time) => now - time < 60 * 60 * 1000);
    if (recent.length >= 10) return res.status(429).json({ ok: false, error: 'Too many sign-up attempts. Please try again later.' });
    subscribeAttempts.set(address, [...recent, now]);
    if (typeof req.body?.website === 'string' && req.body.website.trim()) return res.status(201).json({ ok: true, data: { subscribed: true } }); // honeypot: pretend success
    const fields = readSubscriberFields(req.body, { requireConsent: true });
    if (fields.error) return res.status(400).json({ ok: false, error: fields.error });
    const existing = get('SELECT id, status, unsubscribe_token FROM newsletter_subscribers WHERE email = ?', fields.email);
    let token;
    if (existing) {
      run("UPDATE newsletter_subscribers SET name = ?, whatsapp = ?, phone = ?, status = 'Active', consent_at = CURRENT_TIMESTAMP, unsubscribed_at = NULL WHERE id = ?", fields.name, fields.whatsapp, fields.phone, existing.id);
      token = existing.unsubscribe_token;
    } else {
      token = newToken();
      run("INSERT INTO newsletter_subscribers (name, email, whatsapp, phone, status, source, unsubscribe_token, consent_at) VALUES (?, ?, ?, ?, 'Active', 'website', ?, CURRENT_TIMESTAMP)", fields.name, fields.email, fields.whatsapp, fields.phone, token);
    }
    const mailer = getMailer();
    if (mailer && (!existing || existing.status === 'Unsubscribed')) {
      const siteUrl = getBaseUrl().replace(/\/+$/, '');
      const unsubscribeUrl = unsubscribeUrlFor(siteUrl, token);
      const instagramUrl = (process.env.PARISH_INSTAGRAM_URL || 'https://instagram.com').trim();
      const platformUrl = (process.env.PARISHIONERS_PLATFORM_URL || `${siteUrl}/#community`).trim();
      mailer.send({
        to: { name: fields.name, address: fields.email },
        subject: `Welcome to ${NEWSLETTER_TITLE} — Thank You for Subscribing!`,
        text: [
          `Dear ${fields.name},`,
          '',
          `Thank you for subscribing to ${NEWSLETTER_TITLE}, the monthly parish newsletter of ${PARISH_NAME}, Wuse Zone 2, Abuja!`,
          '',
          'HOLY MASS SCHEDULE',
          '- Monday – Friday: 6:00 AM, 12:00 Noon, 6:00 PM',
          '- Saturday: 7:00 AM',
          '- Sunday: 6:00 AM, 8:00 AM, 8:15 AM (Children), 10:00 AM, 6:00 PM',
          '',
          'CONFESSION TIMES',
          '- Thursday: 6:30 AM & 6:30 PM',
          '- Saturday: 7:30 AM',
          '',
          'CONTACT & COMMUNITY',
          '- Address: Mambolo Street, Wuse Zone 2, Abuja 904101, Nigeria',
          '- Phone: +234 907 076 1824',
          '- Email: holyrosaryabuja@catholic.ng',
          `- Instagram: ${instagramUrl}`,
          `- Parishioners Platform: ${platformUrl}`,
          `- Website: ${siteUrl}`,
          '',
          'God bless you and welcome to our parish family!',
          '',
          `If you did not sign up or no longer wish to receive ${NEWSLETTER_TITLE}, unsubscribe here: ${unsubscribeUrl}`,
        ].join('\n'),
        html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#efe9dc;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#efe9dc"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fffdf8;border-radius:8px;overflow:hidden;box-shadow:0 8px 30px rgba(26,39,68,0.12);">
    <tr><td bgcolor="#1a2744" align="center" style="background:#1a2744;border-top:5px solid #c9a84c;padding:30px 24px 24px;">
      <img src="${escapeHtml(siteUrl)}/images/holy_rosary_seal_cutout.png" alt="${PARISH_NAME}" width="68" height="68" style="display:block;width:68px;height:68px;border:0;margin:0 auto 12px;" />
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d8c78f;">${PARISH_NAME}</p>
      <h1 style="margin:8px 0 0;font-family:Georgia,serif;font-size:28px;color:#f6e7b8;font-weight:normal;">Thank You for Subscribing!</h1>
    </td></tr>
    <tr><td style="padding:30px 32px;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1a2744;">
      <p style="margin:0 0 14px;">Dear <strong>${escapeHtml(fields.name)}</strong>,</p>
      <p style="margin:0 0 22px;">Thank you for subscribing to <strong>${NEWSLETTER_TITLE}</strong>, the official parish newsletter of ${PARISH_NAME}, Wuse Zone 2, Abuja. You will receive parish news, reflections, and highlights straight to your inbox every month.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f4e8;border-left:4px solid #c9a84c;border-radius:6px;margin-bottom:20px;">
        <tr><td style="padding:18px 20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a2744;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#a07830;">Holy Mass Schedule</p>
          <p style="margin:0 0 4px;"><strong>Mon – Fri:</strong> 6:00 AM, 12:00 Noon, 6:00 PM</p>
          <p style="margin:0 0 4px;"><strong>Saturday:</strong> 7:00 AM</p>
          <p style="margin:0 0 14px;"><strong>Sunday:</strong> 6:00 AM, 8:00 AM, 8:15 AM (Children), 10:00 AM, 6:00 PM</p>
          <p style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#a07830;">Confession Times</p>
          <p style="margin:0;"><strong>Thursday:</strong> 6:30 AM &amp; 6:30 PM &nbsp;|&nbsp; <strong>Saturday:</strong> 7:30 AM</p>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;border-radius:6px;margin-bottom:22px;">
        <tr><td style="padding:18px 20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#1a2744;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#a07830;">Contact &amp; Stay Connected</p>
          <p style="margin:0 0 4px;"><strong>Address:</strong> Mambolo Street, Wuse Zone 2, Abuja 904101, Nigeria</p>
          <p style="margin:0 0 4px;"><strong>Phone:</strong> <a href="tel:+2349070761824" style="color:#1a2744;">+234 907 076 1824</a></p>
          <p style="margin:0 0 14px;"><strong>Email:</strong> <a href="mailto:holyrosaryabuja@catholic.ng" style="color:#1a2744;">holyrosaryabuja@catholic.ng</a></p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="#1a2744" style="border-radius:6px;padding-right:0;">
              <a href="${escapeHtml(platformUrl)}" style="display:inline-block;padding:10px 18px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#f6e7b8;text-decoration:none;">Parishioners Platform</a>
            </td>
            <td width="10">&nbsp;</td>
            <td bgcolor="#c9a84c" style="border-radius:6px;">
              <a href="${escapeHtml(instagramUrl)}" style="display:inline-block;padding:10px 18px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#1a2744;text-decoration:none;">Follow on Instagram</a>
            </td>
          </tr></table>
        </td></tr>
      </table>

      <p style="margin:0;">Peace and blessings to you and your family,<br /><strong>${PARISH_NAME}</strong></p>
    </td></tr>
    <tr><td bgcolor="#1a2744" align="center" style="background:#1a2744;padding:20px 24px;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:#97a1ba;">
      <p style="margin:0 0 6px;color:#c9d0e0;"><a href="${escapeHtml(siteUrl)}" style="color:#f3e3b0;text-decoration:underline;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a></p>
      <p style="margin:0;">If you did not sign up or no longer wish to receive ${NEWSLETTER_TITLE}, <a href="${escapeHtml(unsubscribeUrl)}" style="color:#f3e3b0;text-decoration:underline;">unsubscribe here</a>.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      }).catch((error) => log.error?.(`Welcome email failed: ${error?.message || error}`));
    }
    return res.status(201).json({ ok: true, data: { subscribed: true } });
  });

  app.get('/api/public/newsletter/images/:token', (req, res) => {
    const item = get("SELECT image_data FROM newsletter_items WHERE image_token = ? AND image_token <> ''", req.params.token);
    const parsed = item ? parseImage(item.image_data) : null;
    if (!parsed) return res.status(404).end();
    res.setHeader('Content-Type', parsed.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(parsed.data);
  });

  const unsubscribePage = (token, state) => {
    const subscriber = typeof token === 'string' && token ? get('SELECT name, status FROM newsletter_subscribers WHERE unsubscribe_token = ?', token) : null;
    if (!subscriber) return pageShell('Link not recognised', '<p style="font-size:17px;line-height:1.6;">This unsubscribe link is not valid. If you still receive The Rosarian, reply to the email and we will remove you.</p>');
    if (state === 'done' || subscriber.status === 'Unsubscribed') {
      return pageShell('You are unsubscribed', '<p style="font-size:18px;line-height:1.6;">You have been unsubscribed and will no longer receive The Rosarian by email.</p><p style="font-size:14px;color:#64748b;">Changed your mind? You can subscribe again any time on our website.</p>');
    }
    return pageShell('Unsubscribe', `<p style="font-size:18px;line-height:1.6;">Dear ${escapeHtml(subscriber.name)}, do you want to stop receiving ${NEWSLETTER_TITLE} by email?</p>
      <form method="post" action="/api/public/newsletter/unsubscribe"><input type="hidden" name="token" value="${escapeHtml(token)}" />
      <button type="submit" style="margin-top:8px;background:#1a2744;color:#f6e7b8;border:0;border-radius:6px;padding:13px 28px;font:bold 13px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;cursor:pointer;">Unsubscribe me</button></form>`);
  };

  app.get('/api/public/newsletter/unsubscribe', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.type('html').send(unsubscribePage(req.query.token));
  });
  app.post('/api/public/newsletter/unsubscribe', express.urlencoded({ extended: false, limit: '4kb' }), (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : typeof req.query.token === 'string' ? req.query.token : '';
    if (token) run("UPDATE newsletter_subscribers SET status = 'Unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP WHERE unsubscribe_token = ? AND status <> 'Unsubscribed'", token);
    res.setHeader('Cache-Control', 'no-store');
    return res.type('html').send(unsubscribePage(token, 'done'));
  });

  // ------------------------------- dashboard -------------------------------

  const serializeItem = (item) => ({
    id: item.id,
    position: item.position,
    headline: item.headline,
    body: item.body,
    linkUrl: item.link_url,
    linkLabel: item.link_label,
    hasImage: Boolean(item.image_token),
    imageUrl: item.image_token ? `/api/public/newsletter/images/${item.image_token}?v=${encodeURIComponent(String(item.updated_at || '').replace(/\D/g, ''))}` : '',
  });
  const serializeIssue = (issue) => {
    const counts = get(`SELECT
      SUM(CASE WHEN status = 'Sent' THEN 1 ELSE 0 END) AS sent,
      SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) AS failed FROM newsletter_deliveries WHERE issue_id = ?`, issue.id);
    return {
      id: issue.id, label: issue.label, subject: issue.subject, intro: issue.intro, status: issue.status,
      recipientsTotal: issue.recipients_total, sentCount: counts.sent || 0, failedCount: counts.failed || 0,
      sentAt: issue.sent_at, createdAt: issue.created_at, updatedAt: issue.updated_at,
      itemCount: get('SELECT COUNT(*) AS count FROM newsletter_items WHERE issue_id = ?', issue.id).count,
    };
  };
  const editableIssue = (id, res) => {
    const issue = get('SELECT * FROM newsletter_issues WHERE id = ?', id);
    if (!issue) { res.status(404).json({ ok: false, error: 'Issue not found.' }); return null; }
    if (issue.status === 'Sending' || issue.status === 'Sent') { res.status(409).json({ ok: false, error: 'This issue has been sent (or is sending) and can no longer be edited.' }); return null; }
    return issue;
  };
  const touch = (issueId) => run('UPDATE newsletter_issues SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', issueId);

  app.get('/api/newsletter/overview', requireSession, (req, res) => {
    const now = lagosNow();
    const marker = get("SELECT setting_value FROM app_settings WHERE setting_key = 'newsletter:last-auto-month'");
    const monthDone = marker?.setting_value === now.monthKey;
    const targetMonth = monthDone || now.day > 3 ? (now.month % 12) + 1 : now.month;
    const targetYear = targetMonth < now.month ? now.year + 1 : now.year;
    const mailer = getMailer();
    return res.json({ ok: true, data: {
      mailConfigured: Boolean(mailer),
      fromAddress: mailer?.address || '',
      dailyLimit,
      activeSubscribers: activeCount(),
      totalSubscribers: get('SELECT COUNT(*) AS count FROM newsletter_subscribers').count,
      nextAutomaticSend: `1 ${MONTH_NAMES[targetMonth - 1]} ${targetYear}, 08:00 (Lagos time)`,
      readyIssue: get("SELECT id, label FROM newsletter_issues WHERE status = 'Ready' ORDER BY id LIMIT 1") || null,
      sending: isSending() || Boolean(get("SELECT 1 AS yes FROM newsletter_issues WHERE status = 'Sending'")),
    } });
  });

  app.get('/api/newsletter/issues', requireSession, (req, res) => res.json({ ok: true, data: all('SELECT * FROM newsletter_issues ORDER BY id DESC').map(serializeIssue) }));

  app.post('/api/newsletter/issues', requireSession, (req, res) => {
    const now = lagosNow();
    const label = cleanText(req.body?.label, 80) || `${MONTH_NAMES[now.month - 1]} ${now.year}`;
    const result = run('INSERT INTO newsletter_issues (label) VALUES (?)', label);
    return res.status(201).json({ ok: true, data: serializeIssue(get('SELECT * FROM newsletter_issues WHERE id = ?', Number(result.lastInsertRowid))) });
  });

  app.get('/api/newsletter/issues/:id', requireSession, (req, res) => {
    const id = idParam(req.params.id);
    const issue = id && get('SELECT * FROM newsletter_issues WHERE id = ?', id);
    if (!issue) return res.status(404).json({ ok: false, error: 'Issue not found.' });
    return res.json({ ok: true, data: { ...serializeIssue(issue), items: all('SELECT * FROM newsletter_items WHERE issue_id = ? ORDER BY position, id', id).map(serializeItem) } });
  });

  app.put('/api/newsletter/issues/:id', requireSession, (req, res) => {
    const id = idParam(req.params.id);
    const issue = id && editableIssue(id, res);
    if (!issue) return undefined;
    const label = cleanText(req.body?.label, 80);
    if (!label) return res.status(400).json({ ok: false, error: 'Give the issue a label such as "December 2026".' });
    run('UPDATE newsletter_issues SET label = ?, subject = ?, intro = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', label, cleanText(req.body?.subject, 150), cleanBlock(req.body?.intro, 3000), id);
    return res.json({ ok: true, data: serializeIssue(get('SELECT * FROM newsletter_issues WHERE id = ?', id)) });
  });

  app.put('/api/newsletter/issues/:id/status', requireSession, (req, res) => {
    const id = idParam(req.params.id);
    const issue = id && editableIssue(id, res);
    if (!issue) return undefined;
    const status = req.body?.status;
    if (status !== 'Draft' && status !== 'Ready') return res.status(400).json({ ok: false, error: 'Status must be Draft or Ready.' });
    if (status === 'Ready') {
      const usable = get("SELECT COUNT(*) AS count FROM newsletter_items WHERE issue_id = ? AND TRIM(headline) <> '' AND TRIM(body) <> ''", id).count;
      if (usable < 1) return res.status(400).json({ ok: false, error: 'Add at least one headline with a story before marking the issue Ready.' });
    }
    run('UPDATE newsletter_issues SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', status, id);
    return res.json({ ok: true, data: serializeIssue(get('SELECT * FROM newsletter_issues WHERE id = ?', id)) });
  });

  app.delete('/api/newsletter/issues/:id', requireSession, (req, res) => {
    const id = idParam(req.params.id);
    const issue = id && get('SELECT status FROM newsletter_issues WHERE id = ?', id);
    if (!issue) return res.status(404).json({ ok: false, error: 'Issue not found.' });
    if (issue.status === 'Sending') return res.status(409).json({ ok: false, error: 'This issue is sending right now.' });
    run('DELETE FROM newsletter_issues WHERE id = ?', id);
    return res.json({ ok: true });
  });

  app.post('/api/newsletter/issues/:id/items', requireSession, (req, res) => {
    const id = idParam(req.params.id);
    const issue = id && editableIssue(id, res);
    if (!issue) return undefined;
    const position = (get('SELECT COALESCE(MAX(position), 0) AS position FROM newsletter_items WHERE issue_id = ?', id).position) + 1;
    const result = run("INSERT INTO newsletter_items (issue_id, position, headline) VALUES (?, ?, '')", id, position);
    touch(id);
    return res.status(201).json({ ok: true, data: serializeItem(get('SELECT * FROM newsletter_items WHERE id = ?', Number(result.lastInsertRowid))) });
  });

  const withItem = (req, res) => {
    const id = idParam(req.params.id);
    const item = id && get('SELECT * FROM newsletter_items WHERE id = ?', id);
    if (!item) { res.status(404).json({ ok: false, error: 'Headline not found.' }); return null; }
    return editableIssue(item.issue_id, res) ? item : null;
  };

  app.put('/api/newsletter/items/:id', requireSession, (req, res) => {
    const item = withItem(req, res);
    if (!item) return undefined;
    const linkUrl = cleanText(req.body?.linkUrl, 500);
    if (linkUrl && !/^https?:\/\/[^\s]+$/i.test(linkUrl)) return res.status(400).json({ ok: false, error: 'The link must start with http:// or https://.' });
    run('UPDATE newsletter_items SET headline = ?, body = ?, link_url = ?, link_label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      cleanText(req.body?.headline, 160), cleanBlock(req.body?.body, 6000), linkUrl, cleanText(req.body?.linkLabel, 40), item.id);
    touch(item.issue_id);
    return res.json({ ok: true, data: serializeItem(get('SELECT * FROM newsletter_items WHERE id = ?', item.id)) });
  });

  app.put('/api/newsletter/items/:id/image', requireSession, (req, res) => {
    const item = withItem(req, res);
    if (!item) return undefined;
    const image = parseImage(req.body?.imageData);
    if (!image || image.contentType !== 'image/jpeg' || image.data.length > 1024 * 1024) return res.status(400).json({ ok: false, error: 'Choose a JPG, PNG or WebP photo (it is resized automatically).' });
    run('UPDATE newsletter_items SET image_data = ?, image_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', image.dataUrl, newToken(), item.id);
    touch(item.issue_id);
    return res.json({ ok: true, data: serializeItem(get('SELECT * FROM newsletter_items WHERE id = ?', item.id)) });
  });

  app.delete('/api/newsletter/items/:id/image', requireSession, (req, res) => {
    const item = withItem(req, res);
    if (!item) return undefined;
    run("UPDATE newsletter_items SET image_data = '', image_token = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?", item.id);
    touch(item.issue_id);
    return res.json({ ok: true, data: serializeItem(get('SELECT * FROM newsletter_items WHERE id = ?', item.id)) });
  });

  app.post('/api/newsletter/items/:id/move', requireSession, (req, res) => {
    const item = withItem(req, res);
    if (!item) return undefined;
    const up = req.body?.direction === 'up';
    if (!up && req.body?.direction !== 'down') return res.status(400).json({ ok: false, error: 'Direction must be up or down.' });
    const siblings = all('SELECT id FROM newsletter_items WHERE issue_id = ? ORDER BY position, id', item.issue_id).map((row) => row.id);
    const index = siblings.indexOf(item.id);
    const target = up ? index - 1 : index + 1;
    if (target >= 0 && target < siblings.length) {
      [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
      siblings.forEach((siblingId, position) => run('UPDATE newsletter_items SET position = ? WHERE id = ?', position + 1, siblingId));
      touch(item.issue_id);
    }
    return res.json({ ok: true, data: all('SELECT * FROM newsletter_items WHERE issue_id = ? ORDER BY position, id', item.issue_id).map(serializeItem) });
  });

  app.delete('/api/newsletter/items/:id', requireSession, (req, res) => {
    const item = withItem(req, res);
    if (!item) return undefined;
    run('DELETE FROM newsletter_items WHERE id = ?', item.id);
    touch(item.issue_id);
    return res.json({ ok: true });
  });

  const loadIssue = (req, res) => {
    const id = idParam(req.params.id);
    const issue = id && get('SELECT * FROM newsletter_issues WHERE id = ?', id);
    if (!issue) { res.status(404).json({ ok: false, error: 'Issue not found.' }); return null; }
    return { issue, items: all('SELECT * FROM newsletter_items WHERE issue_id = ? ORDER BY position, id', id) };
  };

  app.get('/api/newsletter/issues/:id/preview', requireSession, (req, res) => {
    const loaded = loadIssue(req, res);
    if (!loaded) return undefined;
    const rendered = renderNewsletter(loaded.issue, loaded.items, {
      baseUrl: getBaseUrl(),
      preview: true,
      imageUrl: (item) => item.image_data || '',
    });
    return res.json({ ok: true, data: { subject: rendered.subject, html: rendered.html } });
  });

  app.post('/api/newsletter/issues/:id/test', requireSession, async (req, res, next) => {
    const loaded = loadIssue(req, res);
    if (!loaded) return undefined;
    const mailer = getMailer();
    if (!mailer) return res.status(503).json({ ok: false, error: 'Gmail is not connected yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in the hosting settings.' });
    const email = normalizeEmail(req.body?.email) || mailer.address;
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email address for the test.' });
    try {
      const message = buildMessage({ issue: loaded.issue, items: loaded.items, subscriber: { name: 'Test reader', email, unsubscribe_token: 'test-preview' }, baseUrl: getBaseUrl(), mailAddress: mailer.address });
      message.subject = `[TEST] ${message.subject}`;
      await mailer.send(message);
      return res.json({ ok: true, data: { sentTo: email } });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/newsletter/issues/:id/send', requireSession, (req, res) => {
    const loaded = loadIssue(req, res);
    if (!loaded) return undefined;
    const mailer = getMailer();
    if (!mailer) return res.status(503).json({ ok: false, error: 'Gmail is not connected yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in the hosting settings.' });
    if (loaded.issue.status !== 'Ready' && loaded.issue.status !== 'Sending') return res.status(409).json({ ok: false, error: 'Mark the issue Ready before sending it.' });
    const recipients = activeCount();
    if (recipients < 1) return res.status(400).json({ ok: false, error: 'There are no active subscribers to send to yet.' });
    sendIssue({ database, mailer, issueId: loaded.issue.id, baseUrl: getBaseUrl(), dailyLimit, delayMs, log })
      .catch((error) => log.error?.(`Newsletter send failed: ${error?.message || error}`));
    return res.status(202).json({ ok: true, data: { recipients } });
  });

  // ------------------------------- subscribers -------------------------------

  const serializeSubscriber = (row) => ({
    id: row.id, name: row.name, email: row.email, whatsapp: row.whatsapp, phone: row.phone,
    status: row.status, source: row.source, createdAt: row.created_at, unsubscribedAt: row.unsubscribed_at,
  });

  app.get('/api/newsletter/subscribers', requireSession, (req, res) => {
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const search = `%${cleanText(String(req.query.q || ''), 80).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const status = ['Active', 'Unsubscribed'].includes(req.query.status) ? req.query.status : '';
    const where = `(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR whatsapp LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\')${status ? ' AND status = ?' : ''}`;
    const params = [search, search, search, search, ...(status ? [status] : [])];
    const total = get(`SELECT COUNT(*) AS count FROM newsletter_subscribers WHERE ${where}`, ...params).count;
    const items = all(`SELECT * FROM newsletter_subscribers WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, ...params, limit, offset).map(serializeSubscriber);
    return res.json({ ok: true, data: { items, total, limit, offset } });
  });

  app.post('/api/newsletter/subscribers', requireSession, (req, res) => {
    const fields = readSubscriberFields(req.body, { requireConsent: false });
    if (fields.error) return res.status(400).json({ ok: false, error: fields.error });
    if (get('SELECT id FROM newsletter_subscribers WHERE email = ?', fields.email)) return res.status(409).json({ ok: false, error: 'That email address is already on the list.' });
    const result = run("INSERT INTO newsletter_subscribers (name, email, whatsapp, phone, status, source, unsubscribe_token, consent_at) VALUES (?, ?, ?, ?, 'Active', 'dominus', ?, CURRENT_TIMESTAMP)", fields.name, fields.email, fields.whatsapp, fields.phone, newToken());
    return res.status(201).json({ ok: true, data: serializeSubscriber(get('SELECT * FROM newsletter_subscribers WHERE id = ?', Number(result.lastInsertRowid))) });
  });

  app.put('/api/newsletter/subscribers/:id', requireSession, (req, res) => {
    const id = idParam(req.params.id);
    const row = id && get('SELECT * FROM newsletter_subscribers WHERE id = ?', id);
    if (!row) return res.status(404).json({ ok: false, error: 'Subscriber not found.' });
    const fields = readSubscriberFields({ ...req.body, email: req.body?.email ?? row.email }, { requireConsent: false });
    if (fields.error) return res.status(400).json({ ok: false, error: fields.error });
    const clash = get('SELECT id FROM newsletter_subscribers WHERE email = ? AND id <> ?', fields.email, id);
    if (clash) return res.status(409).json({ ok: false, error: 'Another subscriber already uses that email address.' });
    const status = req.body?.status === 'Unsubscribed' ? 'Unsubscribed' : req.body?.status === 'Active' ? 'Active' : row.status;
    run('UPDATE newsletter_subscribers SET name = ?, email = ?, whatsapp = ?, phone = ?, status = ?, unsubscribed_at = CASE WHEN ? = \'Unsubscribed\' THEN COALESCE(unsubscribed_at, CURRENT_TIMESTAMP) ELSE NULL END WHERE id = ?',
      fields.name, fields.email, fields.whatsapp, fields.phone, status, status, id);
    return res.json({ ok: true, data: serializeSubscriber(get('SELECT * FROM newsletter_subscribers WHERE id = ?', id)) });
  });

  app.delete('/api/newsletter/subscribers/:id', requireSession, (req, res) => {
    const id = idParam(req.params.id);
    const result = id ? run('DELETE FROM newsletter_subscribers WHERE id = ?', id) : { changes: 0 };
    if (result.changes === 0) return res.status(404).json({ ok: false, error: 'Subscriber not found.' });
    return res.json({ ok: true });
  });

  app.get('/api/newsletter/subscribers.csv', requireSession, (req, res) => {
    const rows = all('SELECT * FROM newsletter_subscribers ORDER BY id');
    const lines = [['Name', 'Email', 'WhatsApp', 'Phone', 'Status', 'Source', 'Joined'].map(csvCell).join(',')]
      .concat(rows.map((row) => [row.name, row.email, row.whatsapp, row.phone, row.status, row.source, row.created_at].map(csvCell).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rosarian-subscribers.csv"');
    return res.send(`\ufeff${lines.join('\r\n')}\r\n`);
  });

  return { issueSubject, imageUrlFor };
}
