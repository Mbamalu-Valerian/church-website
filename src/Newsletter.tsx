import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { newsletterAdminApi as api } from './lib/newsletterApi';
import type { NewsletterIssue, NewsletterIssueSummary, NewsletterItem, NewsletterOverview, NewsletterSubscriberPage } from './lib/newsletterApi';

const gold = '#b9952a';
const navy = '#1a2744';
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#0f172a' };
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 };
const btn = (kind: 'primary' | 'gold' | 'ghost' | 'danger' = 'ghost', disabled = false): React.CSSProperties => ({
  border: 0, borderRadius: 8, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
  background: kind === 'primary' ? navy : kind === 'gold' ? '#c9a84c' : kind === 'danger' ? '#fee2e2' : '#e2e8f0',
  color: kind === 'primary' ? '#fff' : kind === 'gold' ? '#1a2744' : kind === 'danger' ? '#991b1b' : '#334155',
});
const statusColors: Record<string, { bg: string; fg: string }> = {
  Draft: { bg: '#f1f5f9', fg: '#475569' },
  Ready: { bg: '#fef3c7', fg: '#92400e' },
  Sending: { bg: '#dbeafe', fg: '#1e40af' },
  Sent: { bg: '#dcfce7', fg: '#166534' },
  Active: { bg: '#dcfce7', fg: '#166534' },
  Unsubscribed: { bg: '#f1f5f9', fg: '#64748b' },
};
const Chip = ({ value }: { value: string }) => {
  const color = statusColors[value] || statusColors.Draft;
  return <span style={{ background: color.bg, color: color.fg, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{value}</span>;
};
const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

const compressNewsletterImage = async (file: File): Promise<string> => {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare this picture.');
    for (let attempt = 0; attempt < 8; attempt += 1) {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', Math.max(0.5, 0.85 - attempt * 0.07));
      if (Math.floor((data.length - data.indexOf(',') - 1) * 3 / 4) <= 450 * 1024) return data;
      canvas.width = Math.max(1, Math.round(canvas.width * 0.85));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.85));
    }
    throw new Error('This picture could not be made small enough. Try a different one.');
  } finally {
    URL.revokeObjectURL(url);
  }
};

type StoryProps = {
  item: NewsletterItem;
  index: number;
  total: number;
  locked: boolean;
  onChanged: (item: NewsletterItem) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
};

const StoryEditor = ({ item, index, total, locked, onChanged, onMove, onDelete }: StoryProps) => {
  const [headline, setHeadline] = useState(item.headline);
  const [body, setBody] = useState(item.body);
  const [linkUrl, setLinkUrl] = useState(item.linkUrl);
  const [linkLabel, setLinkLabel] = useState(item.linkLabel);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = headline !== item.headline || body !== item.body || linkUrl !== item.linkUrl || linkLabel !== item.linkLabel;

  const run = async (action: () => Promise<NewsletterItem>, done: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      onChanged(await action());
      setMessage(done);
    } catch (caught) {
      setError(errorText(caught, 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...card, borderLeft: `4px solid ${gold}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <strong style={{ color: navy }}>{index === 0 ? 'Lead story' : `Headline ${index + 1}`}</strong>
        {!locked && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" aria-label="Move up" disabled={index === 0 || busy} onClick={() => onMove('up')} style={btn('ghost', index === 0 || busy)}>↑</button>
            <button type="button" aria-label="Move down" disabled={index === total - 1 || busy} onClick={() => onMove('down')} style={btn('ghost', index === total - 1 || busy)}>↓</button>
            <button type="button" disabled={busy} onClick={onDelete} style={btn('danger', busy)}>Remove</button>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 190px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={label} htmlFor={`headline-${item.id}`}>Headline</label>
            <input id={`headline-${item.id}`} disabled={locked} maxLength={160} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="e.g. Christmas Mass Times" style={field} />
          </div>
          <div>
            <label style={label} htmlFor={`body-${item.id}`}>Story</label>
            <textarea id={`body-${item.id}`} disabled={locked} maxLength={6000} rows={6} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the story. A blank line starts a new paragraph." style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={label} htmlFor={`link-${item.id}`}>Link (optional)</label>
              <input id={`link-${item.id}`} disabled={locked} maxLength={500} value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://…" style={field} />
            </div>
            <div>
              <label style={label} htmlFor={`linklabel-${item.id}`}>Button text</label>
              <input id={`linklabel-${item.id}`} disabled={locked} maxLength={40} value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Read more" style={field} />
            </div>
          </div>
        </div>
        <div>
          <span style={label}>Picture</span>
          <div style={{ aspectRatio: '4 / 3', borderRadius: 10, border: '1px dashed #cbd5e1', background: '#f8fafc', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
            {item.hasImage ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'No picture'}
          </div>
          {!locked && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void run(async () => api.setItemImage(item.id, await compressNewsletterImage(file)), 'Picture saved.');
              }} />
              <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} style={btn('ghost', busy)}>{item.hasImage ? 'Change' : 'Add picture'}</button>
              {item.hasImage && <button type="button" disabled={busy} onClick={() => void run(() => api.removeItemImage(item.id), 'Picture removed.')} style={btn('ghost', busy)}>Remove</button>}
            </div>
          )}
        </div>
      </div>
      {!locked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy || !dirty} onClick={() => void run(() => api.updateItem(item.id, { headline, body, linkUrl, linkLabel }), 'Saved.')} style={btn('primary', busy || !dirty)}>{busy ? 'Saving…' : 'Save headline'}</button>
          {dirty && <span style={{ fontSize: 12, color: '#b45309' }}>Unsaved changes</span>}
          {message && !dirty && <span role="status" style={{ fontSize: 13, color: '#166534' }}>{message}</span>}
          {error && <span role="alert" style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>}
        </div>
      )}
    </div>
  );
};

const toDataUrl = async (src: string): Promise<string> => {
  if (src.startsWith('data:')) return src;
  const candidates = [src];
  try {
    const url = new URL(src, window.location.href);
    const local = `${window.location.origin}${url.pathname}${url.search}`;
    if (local !== url.href) candidates.push(local);
  } catch { /* keep original only */ }
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) continue;
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) continue;
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch { /* try next candidate */ }
  }
  return '';
};

/** Renders newsletter HTML into a PNG (parish seal and story images inlined) and downloads it. */
const downloadNewsletterImage = async (html: string, fileName: string) => {
  const width = 640;
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + width + 'px;height:1000px;border:0;visibility:hidden;';
  document.body.appendChild(frame);
  try {
    await new Promise<void>((resolve) => { frame.onload = () => resolve(); frame.srcdoc = html; });
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Unable to prepare the newsletter image.');
    await Promise.all(Array.from(doc.images).map(async (img) => {
      const data = await toDataUrl(img.getAttribute('src') || '');
      if (data) img.setAttribute('src', data);
    }));
    doc.querySelectorAll('div[style*="display:none"]').forEach((node) => node.remove());
    const target = (doc.body.querySelector('table[width="600"]') as HTMLElement) || doc.body;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#efe9dc',
      logging: false,
      windowWidth: width,
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Your browser could not create the image.');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally {
    frame.remove();
  }
};

const NewsletterAdmin = () => {
  const [tab, setTab] = useState<'issues' | 'subscribers'>('issues');
  const [overview, setOverview] = useState<NewsletterOverview | null>(null);
  const [issues, setIssues] = useState<NewsletterIssueSummary[]>([]);
  const [issue, setIssue] = useState<NewsletterIssue | null>(null);
  const [metaLabel, setMetaLabel] = useState('');
  const [metaSubject, setMetaSubject] = useState('');
  const [metaIntro, setMetaIntro] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberPage>({ items: [], total: 0, limit: 25, offset: 0 });
  const [subscriberQuery, setSubscriberQuery] = useState('');
  const [subscriberStatus, setSubscriberStatus] = useState('');
  const [newSubscriber, setNewSubscriber] = useState({ name: '', email: '', whatsapp: '', phone: '' });
  const [subscriberMessage, setSubscriberMessage] = useState('');
  const [subscriberError, setSubscriberError] = useState('');

  const refreshOverview = useCallback(async () => {
    try {
      const [nextOverview, nextIssues] = await Promise.all([api.overview(), api.listIssues()]);
      setOverview(nextOverview);
      setIssues(nextIssues);
    } catch (caught) {
      setError(errorText(caught, 'Unable to load The Rosarian.'));
    }
  }, []);

  const loadIssue = useCallback(async (id: number) => {
    try {
      const loaded = await api.getIssue(id);
      setIssue(loaded);
      setMetaLabel(loaded.label);
      setMetaSubject(loaded.subject);
      setMetaIntro(loaded.intro);
      setPreviewHtml('');
      setError('');
    } catch (caught) {
      setError(errorText(caught, 'Unable to open this issue.'));
    }
  }, []);

  const loadSubscribers = useCallback(async (offset = 0) => {
    try {
      setSubscribers(await api.listSubscribers({ q: subscriberQuery, status: subscriberStatus, limit: 25, offset }));
      setSubscriberError('');
    } catch (caught) {
      setSubscriberError(errorText(caught, 'Unable to load subscribers.'));
    }
  }, [subscriberQuery, subscriberStatus]);

  useEffect(() => { void refreshOverview(); }, [refreshOverview]);
  useEffect(() => { if (tab === 'subscribers') void loadSubscribers(0); }, [tab, loadSubscribers]);
  useEffect(() => {
    if (!overview?.sending) return undefined;
    const timer = window.setInterval(() => { void refreshOverview(); if (issue) void loadIssue(issue.id); }, 5000);
    return () => window.clearInterval(timer);
  }, [overview?.sending, refreshOverview, loadIssue, issue]);

  const locked = !issue || issue.status === 'Sending' || issue.status === 'Sent';
  const metaDirty = Boolean(issue) && (metaLabel !== issue?.label || metaSubject !== issue?.subject || metaIntro !== issue?.intro);

  const act = async (action: () => Promise<void>, done = '') => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      if (done) setMessage(done);
    } catch (caught) {
      setError(errorText(caught, 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const createIssue = () => act(async () => {
    const created = await api.createIssue('');
    await refreshOverview();
    await loadIssue(created.id);
  }, 'New issue created. Add your headlines below.');

  const saveMeta = () => act(async () => {
    if (!issue) return;
    await api.updateIssue(issue.id, { label: metaLabel, subject: metaSubject, intro: metaIntro });
    await Promise.all([loadIssue(issue.id), refreshOverview()]);
  }, 'Issue details saved.');

  const addStory = () => act(async () => {
    if (!issue) return;
    const created = await api.addItem(issue.id);
    setIssue({ ...issue, items: [...issue.items, created] });
  });

  const preview = () => act(async () => {
    if (!issue) return;
    setPreviewHtml((await api.preview(issue.id)).html);
  });

  const downloadPreview = () => act(async () => {
    if (!issue || !previewHtml) return;
    const slug = (issue.label || 'newsletter').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await downloadNewsletterImage(previewHtml, `the-rosarian-${slug || 'issue'}.png`);
  }, 'Newsletter picture downloaded.');

  const setStatus = (status: 'Draft' | 'Ready') => act(async () => {
    if (!issue) return;
    await api.setStatus(issue.id, status);
    await Promise.all([loadIssue(issue.id), refreshOverview()]);
  }, status === 'Ready' ? `Marked Ready. It will be emailed automatically on ${overview?.nextAutomaticSend || 'the 1st of the month'}.` : 'Moved back to Draft. It will not be sent.');

  const sendTest = () => act(async () => {
    if (!issue) return;
    const result = await api.sendTest(issue.id, testEmail.trim());
    setMessage(`Test email sent to ${result.sentTo}. Check the inbox (and spam) to see how it looks.`);
  });

  const sendNow = () => {
    if (!issue || !overview) return;
    if (!window.confirm(`Send "${issue.label}" now to ${overview.activeSubscribers} subscriber${overview.activeSubscribers === 1 ? '' : 's'}? This cannot be undone.`)) return;
    void act(async () => {
      const result = await api.sendNow(issue.id);
      await Promise.all([loadIssue(issue.id), refreshOverview()]);
      setMessage(`Sending to ${result.recipients} subscriber${result.recipients === 1 ? '' : 's'}. This page updates as emails go out.`);
    });
  };

  const deleteIssue = () => {
    if (!issue || !window.confirm(`Delete the issue "${issue.label}" permanently?`)) return;
    void act(async () => {
      await api.deleteIssue(issue.id);
      setIssue(null);
      await refreshOverview();
    }, 'Issue deleted.');
  };

  const stat = (title: string, value: string, tone = navy, hint = '') => (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: tone }}>{value}</div>
      {hint && <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{hint}</div>}
    </div>
  );

  return (
    <section id="dominus-newsletter" style={{ scrollMarginTop: 24, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, color: gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Monthly Newsletter</p>
          <h2 style={{ margin: '6px 0 0', fontSize: 28, fontFamily: 'Playfair Display, serif' }}>The Rosarian</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Parish News and Highlights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['issues', 'subscribers'] as const).map((name) => (
            <button key={name} type="button" onClick={() => setTab(name)} aria-pressed={tab === name} style={{ ...btn(tab === name ? 'primary' : 'ghost'), textTransform: 'capitalize' }}>
              {name === 'subscribers' ? `Subscribers${overview ? ` (${overview.activeSubscribers})` : ''}` : 'Issues'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        {stat('Active subscribers', String(overview?.activeSubscribers ?? '–'), navy, overview ? `${overview.totalSubscribers} on the list in total` : '')}
        {stat('Gmail', overview ? (overview.mailConfigured ? 'Connected' : 'Not connected') : '–', overview?.mailConfigured ? '#166534' : '#b91c1c', overview?.mailConfigured ? overview.fromAddress : 'Add GMAIL_USER and GMAIL_APP_PASSWORD in Azure')}
        {stat('Next automatic send', overview?.readyIssue ? overview.nextAutomaticSend : 'Nothing queued', overview?.readyIssue ? navy : '#b45309', overview?.readyIssue ? `Issue: ${overview.readyIssue.label}` : 'Mark an issue Ready to queue it')}
      </div>
      {overview && !overview.mailConfigured && (
        <p role="alert" style={{ margin: '0 0 16px', padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 10, fontSize: 14 }}>
          Emails cannot be sent until Gmail is connected. Subscribers are still being saved. Set <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code> in the hosting settings (see README).
        </p>
      )}
      {error && <p role="alert" style={{ margin: '0 0 12px', padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 10, fontSize: 14 }}>{error}</p>}
      {message && <p role="status" style={{ margin: '0 0 12px', padding: '10px 14px', background: '#f0fdf4', color: '#166534', borderRadius: 10, fontSize: 14 }}>{message}</p>}

      {tab === 'issues' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <button type="button" disabled={busy} onClick={() => void createIssue()} style={btn('gold', busy)}>+ New issue</button>
            {issues.length === 0 && <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>No issues yet. Create the first issue of The Rosarian.</p>}
            {issues.map((entry) => (
              <button key={entry.id} type="button" onClick={() => void loadIssue(entry.id)} aria-pressed={issue?.id === entry.id} style={{ textAlign: 'left', border: issue?.id === entry.id ? `2px solid ${gold}` : '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff', cursor: 'pointer', color: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong>{entry.label}</strong><Chip value={entry.status} />
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                  {entry.itemCount} headline{entry.itemCount === 1 ? '' : 's'}
                  {entry.status === 'Sent' || entry.status === 'Sending' ? ` · ${entry.sentCount}/${entry.recipientsTotal} delivered${entry.failedCount ? ` · ${entry.failedCount} failed` : ''}` : ''}
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
            {!issue && <div style={{ ...card, color: '#64748b' }}>Choose an issue on the left, or create a new one.</div>}
            {issue && (
              <>
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h3 style={{ margin: 0, fontSize: 20 }}>{issue.label}</h3><Chip value={issue.status} /></div>
                    {issue.status !== 'Sending' && <button type="button" disabled={busy} onClick={deleteIssue} style={btn('danger', busy)}>Delete issue</button>}
                  </div>
                  {issue.status === 'Sent' && <p style={{ margin: '0 0 12px', fontSize: 14, color: '#166534' }}>Sent{issue.sentAt ? ` on ${issue.sentAt}` : ''} to {issue.sentCount} of {issue.recipientsTotal} subscribers{issue.failedCount ? ` (${issue.failedCount} failed)` : ''}. Sent issues are locked.</p>}
                  {issue.status === 'Sending' && <p style={{ margin: '0 0 12px', fontSize: 14, color: '#1e40af' }}>Sending… {issue.sentCount} of {issue.recipientsTotal} delivered. Gmail allows about {overview?.dailyLimit ?? 400} emails per day, so a large list continues automatically the next day.</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={label} htmlFor="rosarian-label">Issue label</label>
                      <input id="rosarian-label" disabled={locked} maxLength={80} value={metaLabel} onChange={(event) => setMetaLabel(event.target.value)} placeholder="December 2026" style={field} />
                    </div>
                    <div>
                      <label style={label} htmlFor="rosarian-subject">Email subject (optional)</label>
                      <input id="rosarian-subject" disabled={locked} maxLength={150} value={metaSubject} onChange={(event) => setMetaSubject(event.target.value)} placeholder={`The Rosarian - ${metaLabel || 'December 2026'}`} style={field} />
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={label} htmlFor="rosarian-intro">Opening message from the parish office (optional)</label>
                    <textarea id="rosarian-intro" disabled={locked} maxLength={3000} rows={4} value={metaIntro} onChange={(event) => setMetaIntro(event.target.value)} placeholder="Dear parishioners, …" style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} />
                  </div>
                  {!locked && <div style={{ marginTop: 12 }}><button type="button" disabled={busy || !metaDirty} onClick={() => void saveMeta()} style={btn('primary', busy || !metaDirty)}>Save issue details</button>{metaDirty && <span style={{ marginLeft: 10, fontSize: 12, color: '#b45309' }}>Unsaved changes</span>}</div>}
                </div>

                {issue.items.map((item, index) => (
                  <StoryEditor
                    key={item.id}
                    item={item}
                    index={index}
                    total={issue.items.length}
                    locked={locked}
                    onChanged={(updated) => setIssue((current) => current && { ...current, items: current.items.map((entry) => (entry.id === updated.id ? updated : entry)) })}
                    onMove={(direction) => void act(async () => { await api.moveItem(item.id, direction); await loadIssue(issue.id); })}
                    onDelete={() => { if (window.confirm('Remove this headline from the issue?')) void act(async () => { await api.deleteItem(item.id); await loadIssue(issue.id); }); }}
                  />
                ))}
                {!locked && <button type="button" disabled={busy} onClick={() => void addStory()} style={{ ...btn('ghost', busy), padding: 14, border: '2px dashed #cbd5e1', background: '#f8fafc' }}>+ Add a headline</button>}

                <div style={card}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Check, test and send</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="button" disabled={busy} onClick={() => void preview()} style={btn('ghost', busy)}>Preview newsletter</button>
                    <input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder={overview?.fromAddress || 'you@example.com'} aria-label="Test email address" style={{ ...field, width: 240 }} />
                    <button type="button" disabled={busy || !overview?.mailConfigured} onClick={() => void sendTest()} style={btn('ghost', busy || !overview?.mailConfigured)}>Send me a test</button>
                  </div>
                  {!locked && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {issue.status === 'Draft'
                        ? <button type="button" disabled={busy} onClick={() => void setStatus('Ready')} style={btn('gold', busy)}>Mark Ready for the 1st</button>
                        : <button type="button" disabled={busy} onClick={() => void setStatus('Draft')} style={btn('ghost', busy)}>Back to Draft</button>}
                      {issue.status === 'Ready' && <button type="button" disabled={busy || !overview?.mailConfigured} onClick={sendNow} style={btn('primary', busy || !overview?.mailConfigured)}>Send now to everyone</button>}
                      <span style={{ fontSize: 13, color: '#64748b' }}>
                        {issue.status === 'Ready' ? `Queued: goes out automatically on ${overview?.nextAutomaticSend || 'the 1st'}.` : 'Only issues marked Ready are sent automatically on the 1st of each month.'}
                      </span>
                    </div>
                  )}
                  {previewHtml && (
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" disabled={busy} onClick={() => void downloadPreview()} style={btn('gold', busy)}>Download as picture</button>
                    </div>
                  )}
                  {previewHtml && (
                    <iframe title="Newsletter preview" sandbox="" srcDoc={previewHtml} style={{ marginTop: 14, width: '100%', height: 760, border: '1px solid #e2e8f0', borderRadius: 10, background: '#efe9dc' }} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'subscribers' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <form style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr)) auto', gap: 10, alignItems: 'end' }} onSubmit={(event) => {
            event.preventDefault();
            setSubscriberError('');
            setSubscriberMessage('');
            void api.addSubscriber(newSubscriber)
              .then(() => { setNewSubscriber({ name: '', email: '', whatsapp: '', phone: '' }); setSubscriberMessage('Subscriber added.'); void loadSubscribers(0); void refreshOverview(); })
              .catch((caught: unknown) => setSubscriberError(errorText(caught, 'Unable to add this subscriber.')));
          }}>
            {(['name', 'email', 'whatsapp', 'phone'] as const).map((key) => (
              <div key={key}>
                <label style={label} htmlFor={`sub-${key}`}>{key === 'whatsapp' ? 'WhatsApp' : key}</label>
                <input id={`sub-${key}`} required={key === 'name' || key === 'email'} type={key === 'email' ? 'email' : 'text'} value={newSubscriber[key]} onChange={(event) => setNewSubscriber((current) => ({ ...current, [key]: event.target.value }))} style={field} />
              </div>
            ))}
            <button type="submit" style={btn('gold')}>Add subscriber</button>
          </form>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={subscriberQuery} onChange={(event) => setSubscriberQuery(event.target.value)} placeholder="Search name, email, phone…" aria-label="Search subscribers" style={{ ...field, width: 280 }} />
            <select value={subscriberStatus} onChange={(event) => setSubscriberStatus(event.target.value)} aria-label="Filter by status" style={{ ...field, width: 170 }}>
              <option value="">All statuses</option><option value="Active">Active</option><option value="Unsubscribed">Unsubscribed</option>
            </select>
            <a href={api.csvUrl} style={{ ...btn('ghost'), textDecoration: 'none' }}>Download CSV</a>
            <span style={{ fontSize: 13, color: '#64748b' }}>{subscribers.total} match{subscribers.total === 1 ? '' : 'es'}</span>
          </div>
          {subscriberError && <p role="alert" style={{ margin: 0, color: '#b91c1c', fontSize: 14 }}>{subscriberError}</p>}
          {subscriberMessage && <p role="status" style={{ margin: 0, color: '#166534', fontSize: 14 }}>{subscriberMessage}</p>}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Name', 'Email', 'WhatsApp', 'Phone', 'Status', 'Joined', ''].map((head) => <th key={head} style={{ padding: '10px 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>{head}</th>)}</tr></thead>
              <tbody>
                {subscribers.items.length === 0 && <tr><td colSpan={7} style={{ padding: 18, color: '#64748b' }}>No subscribers yet. They appear here when parishioners sign up on the website.</td></tr>}
                {subscribers.items.map((person) => (
                  <tr key={person.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>{person.name}</td>
                    <td style={{ padding: '10px 12px' }}>{person.email}</td>
                    <td style={{ padding: '10px 12px' }}>{person.whatsapp || '–'}</td>
                    <td style={{ padding: '10px 12px' }}>{person.phone || '–'}</td>
                    <td style={{ padding: '10px 12px' }}><Chip value={person.status} /></td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{person.createdAt.slice(0, 10)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <button type="button" style={btn('ghost')} onClick={() => void api.updateSubscriber(person.id, { name: person.name, email: person.email, whatsapp: person.whatsapp, phone: person.phone, status: person.status === 'Active' ? 'Unsubscribed' : 'Active' }).then(() => { void loadSubscribers(subscribers.offset); void refreshOverview(); }).catch((caught: unknown) => setSubscriberError(errorText(caught, 'Update failed.')))}>
                        {person.status === 'Active' ? 'Unsubscribe' : 'Resubscribe'}
                      </button>{' '}
                      <button type="button" style={btn('danger')} onClick={() => { if (window.confirm(`Delete ${person.name} (${person.email}) permanently?`)) void api.deleteSubscriber(person.id).then(() => { void loadSubscribers(subscribers.offset); void refreshOverview(); }).catch((caught: unknown) => setSubscriberError(errorText(caught, 'Delete failed.'))); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={subscribers.offset === 0} onClick={() => void loadSubscribers(Math.max(0, subscribers.offset - subscribers.limit))} style={btn('ghost', subscribers.offset === 0)}>Previous</button>
            <button type="button" disabled={subscribers.offset + subscribers.limit >= subscribers.total} onClick={() => void loadSubscribers(subscribers.offset + subscribers.limit)} style={btn('ghost', subscribers.offset + subscribers.limit >= subscribers.total)}>Next</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default NewsletterAdmin;
