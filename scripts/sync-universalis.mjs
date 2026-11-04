#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const monthlySourcePath = path.join(projectRoot, 'src/data/universalisMonthly.json');
const calendarPath = path.join(projectRoot, 'src/data/ordoCalendar.json');
const shouldPull = process.argv.includes('--pull');
const shouldPublish = process.argv.includes('--weekly');
const watchMode = process.argv.includes('--watch');

const liturgicalColorMap = {
  Solemnity: '#8b1e3f',
  Memorial: '#7c3aed',
  Feast: '#d97706',
  Optional: '#2563eb',
  default: '#1a2744',
};

const nextSundayMidnight = (now = new Date()) => {
  const nextRun = new Date(now);
  nextRun.setHours(0, 0, 0, 0);
  const daysUntilSunday = (7 - nextRun.getDay()) % 7;
  nextRun.setDate(nextRun.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return nextRun;
};

const readJson = async (filePath, fallback = []) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const normalizeDate = (value) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
};

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'liturgical-entry';

const isOrdinaryWeekLabel = (value = '') => /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+of\s+week\s+\d+\s+in\s+Ordinary\s+Time/i.test(value);

const chooseLiturgicalTitle = (value = '') => {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned || /^click here$/i.test(cleaned)) {
    return null;
  }

  if (isOrdinaryWeekLabel(cleaned)) {
    const options = cleaned.split(/\s+or\s+/i);
    const preferred = [...options].reverse().find((option) => !isOrdinaryWeekLabel(option) && /Saint|Memorial|Solemnity|Feast|Martyr|Bishop|Pope|Doctor|Virgin|Celebration/i.test(option));
    return preferred ? preferred.trim() : null;
  }

  if (cleaned.includes(' or ')) {
    const options = cleaned.split(/\s+or\s+/i);
    const preferred = [...options].reverse().find((option) => !isOrdinaryWeekLabel(option) && /Saint|Memorial|Solemnity|Feast|Martyr|Bishop|Pope|Doctor|Virgin|Celebration/i.test(option));
    return preferred ? preferred.trim() : cleaned;
  }

  if (/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(cleaned)) {
    return null;
  }

  return cleaned;
};

const sanitizeEntry = (entry, index) => {
  const rawTitle = entry.title || entry.name || '';
  const cleanTitle = chooseLiturgicalTitle(rawTitle);

  if (!cleanTitle) {
    return null;
  }

  const category = entry.category || entry.rank || entry.type || 'Memorial';

  const rawDescription = entry.description || entry.summary || '';
  const description = /^Universalis entry for /i.test(rawDescription) ? '' : rawDescription;

  return {
    ...entry,
    id: entry.id || `${entry.date || new Date().toISOString().slice(0, 10)}-${slugify(cleanTitle)}`,
    title: cleanTitle,
    description,
    category: /Solemnity|Memorial|Feast|Saint/i.test(cleanTitle) ? (cleanTitle.match(/Solemnity|Memorial|Feast|Saint/i)?.[0] || category) : category,
  };
};

const normalizeRemoteEntry = (entry, index) => {
  const category = entry.category || entry.rank || entry.type || 'Memorial';
  const title = entry.title || entry.name || `Liturgical entry ${index + 1}`;
  const date = normalizeDate(entry.date || entry.day || entry.eventDate);
  const rawDescription = entry.description || entry.summary || '';
  const description = /^Universalis entry for /i.test(rawDescription) ? '' : rawDescription || '';

  return {
    id: entry.id || `${date}-${slugify(title)}`,
    date,
    title,
    description,
    group: 'Feast & Saint Days',
    category,
    liturgicalColor: entry.liturgicalColor || entry.color || liturgicalColorMap[category] || liturgicalColorMap.default,
    featured: Boolean(entry.featured),
    rank: entry.rank || category.toLowerCase(),
    sourceId: entry.sourceId || 'universalis-monthly',
    sourceLabel: entry.sourceLabel || 'Universalis',
  };
};

const flattenPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.entries)) {
    return payload.entries;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

const stripHtml = (value = '') => value
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

const extractStructuredEntriesFromHtml = (html) => {
  const scriptBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scriptBlocks) {
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        const text = JSON.stringify(candidate).toLowerCase();
        if (text.includes('solemnity') || text.includes('memorial') || text.includes('feast') || text.includes('saint')) {
          return flattenPayload(candidate);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks and continue to the next candidate.
    }
  }

  const weeklyMatches = [...html.matchAll(/<div id="d(\d{8})"[^>]*>\s*<h4>(.*?)<\/h4>\s*<a[^>]*>([\s\S]*?)<\/a>/gi)];
  if (weeklyMatches.length) {
    return weeklyMatches
      .map((match) => {
        const [, dateString, headingText, bodyText] = match;
        const title = stripHtml(bodyText);
        const displayText = chooseLiturgicalTitle(title || stripHtml(headingText));
        const date = `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;

        if (!displayText) {
          return null;
        }

        return {
          id: date,
          date,
          title: displayText,
          description: `Universalis entry for ${displayText}.`,
          category: /Solemnity|Memorial|Feast|Saint/i.test(displayText) ? (displayText.match(/Solemnity|Memorial|Feast|Saint/i)?.[0] || 'Memorial') : 'Memorial',
          group: 'Feast & Saint Days',
          sourceId: 'universalis-live',
          sourceLabel: 'Universalis',
        };
      })
      .filter(Boolean);
  }

  const textualMatches = [...html.matchAll(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s*(?:-\s*)?(?:Solemnity|Memorial|Feast|Saint|Celebration)/g)];
  return textualMatches
    .map((match) => ({
      title: match[0].trim(),
      category: /Solemnity|Memorial|Feast|Saint/i.test(match[0]) ? match[0].match(/Solemnity|Memorial|Feast|Saint/i)?.[0] || 'Memorial' : 'Memorial',
      description: 'Extracted from the public Universalis calendar page.',
      date: new Date().toISOString().slice(0, 10),
    }))
    .filter((entry) => entry.title && entry.title.length > 2);
};

const fetchMonthlyEntries = async () => {
  const sourceUrl = process.env.UNIVERSALIS_API_URL || process.env.UNIVERSALIS_SCRAPE_URL || process.env.UNIVERSALIS_URL || 'https://universalis.com/today.htm';

  if (!sourceUrl) {
    const cached = await readJson(monthlySourcePath, []);
    if (cached.length) {
      console.log(`Using the cached Universalis monthly source with ${cached.length} entries.`);
      return cached.map((entry, index) => normalizeRemoteEntry(entry, index));
    }

    console.log('No Universalis source configured. Keeping the current local monthly cache intact.');
    return [];
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: 'text/html,application/json,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; parish-sync/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Universalis request failed with status ${response.status}`);
    }

    const body = await response.text();
    let payload = [];

    try {
      const parsed = JSON.parse(body);
      payload = flattenPayload(parsed);
    } catch {
      payload = extractStructuredEntriesFromHtml(body);
    }

    if (!payload.length) {
      throw new Error('Universalis page did not expose any parseable liturgical entries.');
    }

    const normalized = payload
      .map((entry, index) => sanitizeEntry(entry, index) || normalizeRemoteEntry(entry, index))
      .filter((entry) => entry && !!chooseLiturgicalTitle(entry.title));

    await fs.writeFile(monthlySourcePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    console.log(`Pulled ${normalized.length} entries from the public Universalis page and saved the monthly source.`);
    return normalized;
  } catch (error) {
    console.warn(`Monthly Universalis pull failed: ${error.message}`);
    return (await readJson(monthlySourcePath, [])).map((entry, index) => normalizeRemoteEntry(entry, index)).filter((entry) => entry && !!chooseLiturgicalTitle(entry.title));
  }
};

const publishWeeklyCalendar = async () => {
  const monthlyEntries = await readJson(monthlySourcePath, []);
  const existingEntries = await readJson(calendarPath, []);
  const parishAnnouncements = existingEntries.filter((entry) => entry.group === 'Parish Announcements');
  const officialEntries = monthlyEntries
    .filter((entry) => entry.group === 'Feast & Saint Days')
    .filter((entry) => {
      const title = entry.title || '';
      return !isOrdinaryWeekLabel(title) && ['Solemnity', 'Memorial', 'Saint', 'Feast'].includes(entry.category);
    });

  const nextCalendar = [...officialEntries, ...parishAnnouncements].sort((a, b) => a.date.localeCompare(b.date));
  await fs.writeFile(calendarPath, `${JSON.stringify(nextCalendar, null, 2)}\n`, 'utf8');
  console.log(`Weekly publish complete. ${nextCalendar.length} entries are now active on the public site.`);
};

const runWeeklyScheduler = async () => {
  for (;;) {
    const now = new Date();
    const nextRun = nextSundayMidnight(now);
    const waitMs = Math.max(60_000, nextRun.getTime() - now.getTime());

    console.log(`Next weekly local publish is scheduled for ${nextRun.toISOString()}`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    await publishWeeklyCalendar();
  }
};

const runOnce = async () => {
  try {
    if (shouldPull) {
      await fetchMonthlyEntries();
    }

    if (shouldPublish || (!shouldPull && !watchMode)) {
      await publishWeeklyCalendar();
    }
  } catch (error) {
    console.error('Failed to sync the church calendar.', error);
    process.exitCode = 1;
  }
};

if (watchMode) {
  await runWeeklyScheduler();
} else {
  await runOnce();
}
