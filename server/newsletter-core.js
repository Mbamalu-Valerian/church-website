import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// The Rosarian - parish newsletter: schema, email design, mailer and sending.
// ---------------------------------------------------------------------------

export const NEWSLETTER_TITLE = 'The Rosarian';
export const NEWSLETTER_SUBTITLE = 'Parish News and Highlights';
export const PARISH_NAME = 'Holy Rosary Catholic Church';
export const PARISH_ADDRESS = 'Mambolo Street, Wuse Zone 2, Abuja';

export const newToken = () => randomBytes(24).toString('base64url');

export function initNewsletterSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      whatsapp TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active',
      source TEXT NOT NULL DEFAULT 'website',
      unsubscribe_token TEXT NOT NULL UNIQUE,
      consent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      unsubscribed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS newsletter_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      intro TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Draft',
      recipients_total INTEGER NOT NULL DEFAULT 0,
      send_started_at TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS newsletter_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      headline TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      image_data TEXT NOT NULL DEFAULT '',
      image_token TEXT NOT NULL DEFAULT '',
      link_url TEXT NOT NULL DEFAULT '',
      link_label TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS newsletter_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
      subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      error TEXT NOT NULL DEFAULT '',
      sent_at TEXT,
      UNIQUE (issue_id, subscriber_id)
    );
    CREATE INDEX IF NOT EXISTS newsletter_items_issue ON newsletter_items (issue_id, position);
    CREATE INDEX IF NOT EXISTS newsletter_deliveries_sent ON newsletter_deliveries (status, sent_at);
  `);
}

// ---------------------------------------------------------------------------
// Dates (parish time, Africa/Lagos)
// ---------------------------------------------------------------------------

export function lagosNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  const year = get('year');
  const month = get('month');
  return { year, month, day: get('day'), hour: get('hour'), monthKey: `${year}-${String(month).padStart(2, '0')}` };
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------------------------------------------------------------------------
// Email design
// ---------------------------------------------------------------------------

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const paragraphs = (text, style) => String(text || '')
  .split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter(Boolean)
  .map((part) => `<p style="${style}">${escapeHtml(part).replace(/\r?\n/g, '<br />')}</p>`).join('');

const GOLD = '#c9a84c';
const NAVY = '#1a2744';
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function issueSubject(issue) {
  return issue.subject?.trim() || `${NEWSLETTER_TITLE} - ${issue.label}`;
}

/**
 * Renders a table-based, email-client-safe newsletter.
 * options.imageUrl(item) returns the absolute image URL (or a data URL for previews).
 */
export function renderNewsletter(issue, items, { baseUrl, unsubscribeUrl, imageUrl, preview = false }) {
  const siteUrl = baseUrl.replace(/\/+$/, '');
  const stories = items.filter((item) => item.headline.trim() || item.body.trim());
  const index = stories.length > 1
    ? `<tr><td style="padding:0 40px 8px;"><p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:bold;">In this issue</p>${
      stories.map((item) => `<p style="margin:0 0 6px;font-family:${SERIF};font-size:15px;color:${NAVY};">&#8226;&nbsp; ${escapeHtml(item.headline || 'Parish news')}</p>`).join('')
    }</td></tr><tr><td style="padding:16px 40px 0;"><div style="border-top:1px solid #e4d9bd;font-size:1px;line-height:1px;">&nbsp;</div></td></tr>`
    : '';

  const storyRows = stories.map((item, position) => {
    const image = item.image_token || item.image_data ? imageUrl(item) : '';
    const link = item.link_url
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;"><tr><td bgcolor="${NAVY}" style="border-radius:4px;"><a href="${escapeHtml(item.link_url)}" style="display:inline-block;padding:11px 24px;font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#f3e3b0;text-decoration:none;">${escapeHtml(item.link_label || 'Read more')}</a></td></tr></table>`
      : '';
    return `
      <tr><td style="padding:${position === 0 && !index ? 8 : 34}px 40px 0;">
        ${position > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:30px;"><tr><td style="border-top:1px solid #e4d9bd;font-size:1px;line-height:1px;" width="42%">&nbsp;</td><td align="center" style="font-family:${SERIF};font-size:18px;color:${GOLD};padding:0 10px;line-height:1;">&#10013;</td><td style="border-top:1px solid #e4d9bd;font-size:1px;line-height:1px;" width="42%">&nbsp;</td></tr></table>` : ''}
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.headline)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:3px;margin:0 0 20px;" />` : ''}
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:bold;">${position === 0 ? 'Lead story' : 'Parish highlight'}</p>
        <h2 style="margin:0 0 12px;font-family:${SERIF};font-size:26px;line-height:1.25;color:${NAVY};font-weight:bold;">${escapeHtml(item.headline || 'Parish news')}</h2>
        <div style="width:48px;height:3px;background:${GOLD};font-size:1px;line-height:3px;margin:0 0 16px;">&nbsp;</div>
        ${paragraphs(item.body, `margin:0 0 14px;font-family:${SERIF};font-size:16px;line-height:1.7;color:#33384a;`)}
        ${link}
      </td></tr>`;
  }).join('');

  const intro = issue.intro?.trim()
    ? `<tr><td style="padding:34px 40px 22px;"><p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:bold;">From the Parish Office</p>${paragraphs(issue.intro, `margin:0 0 12px;font-family:${SERIF};font-size:17px;line-height:1.7;color:${NAVY};font-style:italic;`)}</td></tr>`
    : '<tr><td style="height:26px;font-size:1px;line-height:1px;">&nbsp;</td></tr>';

  const unsubscribe = preview
    ? '<span style="color:#f3e3b0;text-decoration:underline;">Unsubscribe</span> (each subscriber gets a personal link)'
    : `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#f3e3b0;text-decoration:underline;">Unsubscribe</a>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /><title>${escapeHtml(issueSubject(issue))}</title></head>
<body style="margin:0;padding:0;background:#efe9dc;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(stories[0]?.headline || NEWSLETTER_SUBTITLE)} &mdash; ${escapeHtml(issue.label)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#efe9dc"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fffdf8;border-radius:6px;overflow:hidden;box-shadow:0 8px 30px rgba(26,39,68,0.12);">
    <tr><td bgcolor="${NAVY}" align="center" style="background:${NAVY};border-top:5px solid ${GOLD};padding:34px 24px 12px;">
      <img src="${escapeHtml(siteUrl)}/images/holy_rosary_seal_cutout.png" alt="${PARISH_NAME}" width="76" height="76" style="display:block;width:76px;height:76px;border:0;margin:0 auto 14px;" />
      <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d8c78f;">${PARISH_NAME}</p>
    </td></tr>
    <tr><td bgcolor="${NAVY}" align="center" style="background:${NAVY};padding:6px 20px 8px;">
      <h1 style="margin:0;font-family:${SERIF};font-size:46px;line-height:1.1;letter-spacing:7px;text-transform:uppercase;color:#f6e7b8;font-weight:normal;">${NEWSLETTER_TITLE}</h1>
    </td></tr>
    <tr><td bgcolor="${NAVY}" align="center" style="background:${NAVY};padding:6px 24px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${GOLD};border-bottom:1px solid ${GOLD};padding:9px 26px;"><p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:4px;text-transform:uppercase;color:${GOLD};font-weight:bold;">${NEWSLETTER_SUBTITLE}</p></td></tr></table>
    </td></tr>
    <tr><td align="center" bgcolor="#f6efdc" style="padding:12px 20px;border-bottom:1px solid #e4d9bd;"><p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6b5a2a;">${escapeHtml(issue.label)}</p></td></tr>
    ${intro}
    ${index}
    ${storyRows}
    <tr><td style="padding:40px 40px 0;"><div style="border-top:3px solid ${GOLD};font-size:1px;line-height:1px;">&nbsp;</div></td></tr>
    <tr><td bgcolor="${NAVY}" align="center" style="background:${NAVY};padding:26px 30px 30px;">
      <p style="margin:0 0 6px;font-family:${SERIF};font-size:16px;color:#f6e7b8;">${PARISH_NAME}</p>
      <p style="margin:0 0 14px;font-family:${SANS};font-size:12px;line-height:1.6;color:#c9d0e0;">${PARISH_ADDRESS}<br /><a href="${escapeHtml(siteUrl)}" style="color:#f3e3b0;text-decoration:underline;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a></p>
      <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.7;color:#97a1ba;">You are receiving ${NEWSLETTER_TITLE} because you subscribed on our website.<br />${unsubscribe}</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `${NEWSLETTER_TITLE.toUpperCase()} - ${NEWSLETTER_SUBTITLE}`,
    issue.label,
    '',
    issue.intro?.trim() || '',
    ...stories.flatMap((item) => ['', '------------------------------', item.headline.toUpperCase(), '', item.body.trim(), item.link_url ? `${item.link_label || 'Read more'}: ${item.link_url}` : '']),
    '',
    '------------------------------',
    `${PARISH_NAME}, ${PARISH_ADDRESS}`,
    preview ? '' : `Unsubscribe: ${unsubscribeUrl}`,
  ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n');

  return { subject: issueSubject(issue), html, text };
}

// ---------------------------------------------------------------------------
// Mailer (Gmail with an app password)
// ---------------------------------------------------------------------------

export function createMailer(env = process.env) {
  const outbox = env.NEWSLETTER_OUTBOX_PATH || '';
  const fromName = env.NEWSLETTER_FROM_NAME || `${NEWSLETTER_TITLE} - ${PARISH_NAME}`;
  let transport;
  let address;
  if (env.NEWSLETTER_MAIL_TRANSPORT === 'json') {
    transport = nodemailer.createTransport({ jsonTransport: true });
    address = env.GMAIL_USER || 'parish@example.org';
  } else if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    address = env.GMAIL_USER;
    transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
    });
  } else {
    return null;
  }
  return {
    address,
    async send({ to, subject, html, text, headers }) {
      const info = await transport.sendMail({
        from: { name: fromName, address },
        replyTo: address,
        to,
        subject,
        html,
        text,
        headers,
      });
      if (outbox) appendFileSync(outbox, `${JSON.stringify({ to, subject, html, text, headers })}\n`);
      return info;
    },
  };
}

// ---------------------------------------------------------------------------
// Sending engine
// ---------------------------------------------------------------------------

const activeSends = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const imageUrlFor = (baseUrl) => (item) => (item.image_token
  ? `${baseUrl.replace(/\/+$/, '')}/api/public/newsletter/images/${item.image_token}?v=${encodeURIComponent(String(item.updated_at || '').replace(/\D/g, ''))}`
  : '');

export const unsubscribeUrlFor = (baseUrl, token) => `${baseUrl.replace(/\/+$/, '')}/api/public/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

export function buildMessage({ issue, items, subscriber, baseUrl, mailAddress }) {
  const unsubscribeUrl = unsubscribeUrlFor(baseUrl, subscriber.unsubscribe_token);
  const rendered = renderNewsletter(issue, items, { baseUrl, unsubscribeUrl, imageUrl: imageUrlFor(baseUrl) });
  return {
    to: { name: subscriber.name, address: subscriber.email },
    ...rendered,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${mailAddress}?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

export async function sendIssue({ database, mailer, issueId, baseUrl, dailyLimit = 400, delayMs = 1200, log = console }) {
  if (!mailer || activeSends.has(issueId)) return { started: false };
  const claimed = database.prepare("UPDATE newsletter_issues SET status = 'Sending', send_started_at = COALESCE(send_started_at, CURRENT_TIMESTAMP), recipients_total = (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'Active'), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'Ready'").run(issueId);
  const issue = database.prepare('SELECT * FROM newsletter_issues WHERE id = ?').get(issueId);
  if (!issue || (claimed.changes === 0 && issue.status !== 'Sending')) return { started: false };
  activeSends.add(issueId);
  const items = database.prepare('SELECT * FROM newsletter_items WHERE issue_id = ? ORDER BY position, id').all(issueId);
  const skip = new Set();
  let sent = 0;
  let failed = 0;
  let limited = false;
  try {
    for (;;) {
      const sentRecently = database.prepare("SELECT COUNT(*) AS count FROM newsletter_deliveries WHERE status = 'Sent' AND sent_at > datetime('now', '-24 hours')").get().count;
      if (sentRecently >= dailyLimit) { limited = true; break; }
      const pending = database.prepare(`
        SELECT s.* FROM newsletter_subscribers s
        WHERE s.status = 'Active'
          AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.issue_id = ? AND d.subscriber_id = s.id AND (d.status = 'Sent' OR d.attempts >= 3))
        ORDER BY s.id LIMIT 25
      `).all(issueId).filter((subscriber) => !skip.has(subscriber.id));
      if (pending.length === 0) break;
      for (const subscriber of pending) {
        const used = database.prepare("SELECT COUNT(*) AS count FROM newsletter_deliveries WHERE status = 'Sent' AND sent_at > datetime('now', '-24 hours')").get().count;
        if (used >= dailyLimit) { limited = true; break; }
        skip.add(subscriber.id);
        try {
          await mailer.send(buildMessage({ issue, items, subscriber, baseUrl, mailAddress: mailer.address }));
          database.prepare(`INSERT INTO newsletter_deliveries (issue_id, subscriber_id, status, attempts, sent_at) VALUES (?, ?, 'Sent', 1, CURRENT_TIMESTAMP)
            ON CONFLICT (issue_id, subscriber_id) DO UPDATE SET status = 'Sent', attempts = attempts + 1, error = '', sent_at = CURRENT_TIMESTAMP`).run(issueId, subscriber.id);
          sent += 1;
        } catch (error) {
          database.prepare(`INSERT INTO newsletter_deliveries (issue_id, subscriber_id, status, attempts, error) VALUES (?, ?, 'Failed', 1, ?)
            ON CONFLICT (issue_id, subscriber_id) DO UPDATE SET status = 'Failed', attempts = attempts + 1, error = excluded.error`).run(issueId, subscriber.id, String(error?.message || error).slice(0, 300));
          failed += 1;
          log.error?.(`Newsletter delivery to subscriber ${subscriber.id} failed: ${error?.message || error}`);
        }
        await sleep(delayMs);
      }
      if (limited) break;
    }
    if (!limited) {
      database.prepare("UPDATE newsletter_issues SET status = 'Sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'Sending'").run(issueId);
    }
    return { started: true, sent, failed, limited };
  } finally {
    activeSends.delete(issueId);
  }
}

export const isSending = () => activeSends.size > 0;

/** Starts the monthly check. Sends the oldest Ready issue on days 1-3 of each month (Lagos time, from 08:00). */
export function startNewsletterScheduler({ database, getMailer, getBaseUrl, dailyLimit, delayMs, log = console, intervalMs = 15 * 60 * 1000 }) {
  const tick = async () => {
    try {
      const mailer = getMailer();
      if (!mailer) return;
      const now = lagosNow();
      const resuming = database.prepare("SELECT id FROM newsletter_issues WHERE status = 'Sending' ORDER BY id LIMIT 1").get();
      if (resuming) {
        await sendIssue({ database, mailer, issueId: resuming.id, baseUrl: getBaseUrl(), dailyLimit, delayMs, log });
        return;
      }
      if (now.day > 3 || now.hour < 8) return;
      const marker = database.prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'newsletter:last-auto-month'").get();
      if (marker?.setting_value === now.monthKey) return;
      const ready = database.prepare("SELECT id FROM newsletter_issues WHERE status = 'Ready' ORDER BY id LIMIT 1").get();
      if (!ready) return;
      database.prepare("INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES ('newsletter:last-auto-month', ?)").run(now.monthKey);
      log.log?.(`Sending ${NEWSLETTER_TITLE} issue ${ready.id} for ${now.monthKey}.`);
      await sendIssue({ database, mailer, issueId: ready.id, baseUrl: getBaseUrl(), dailyLimit, delayMs, log });
    } catch (error) {
      log.error?.(`Newsletter scheduler error: ${error?.message || error}`);
    }
  };
  const first = setTimeout(tick, 30 * 1000);
  const timer = setInterval(tick, intervalMs);
  first.unref?.();
  timer.unref?.();
  return { tick, stop: () => { clearTimeout(first); clearInterval(timer); } };
}
