import React, { useState } from 'react';
import { newsletterPublicApi } from './lib/newsletterApi';

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#e8c97e' };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 8, border: '1px solid rgba(232,201,126,0.45)', background: 'rgba(255,255,255,0.96)', color: '#1a2744', fontSize: 16, fontFamily: 'inherit' };

const NewsletterSignup = () => {
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', phone: '', consent: false, website: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const set = (key: 'name' | 'email' | 'whatsapp' | 'phone' | 'website') => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('sending');
    setError('');
    try {
      await newsletterPublicApi.subscribe(form);
      setState('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to subscribe right now. Please try again.');
      setState('idle');
    }
  };

  return (
    <section id="newsletter" aria-labelledby="rosarian-heading" style={{ background: 'linear-gradient(135deg, #1a2744 0%, #24365f 100%)', borderTop: '4px solid #c9a84c', padding: '72px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c9a84c', fontWeight: 700 }}>Holy Rosary Catholic Church</p>
        <h2 id="rosarian-heading" style={{ margin: '12px 0 6px', fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(34px, 6vw, 52px)', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f6e7b8', fontWeight: 400 }}>The Rosarian</h2>
        <div style={{ display: 'inline-block', borderTop: '1px solid #c9a84c', borderBottom: '1px solid #c9a84c', padding: '8px 22px', margin: '0 0 22px' }}>
          <span style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c9a84c', fontWeight: 700 }}>Parish News and Highlights</span>
        </div>
        <p style={{ margin: '0 auto 30px', maxWidth: 560, color: '#d6dcea', fontSize: 17, lineHeight: 1.7 }}>
          Our monthly parish newsletter, delivered to your inbox on the first of every month. Stay close to what is happening in the life of Holy Rosary.
        </p>

        {state === 'done' ? (
          <div role="status" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(232,201,126,0.5)', borderRadius: 14, padding: '28px 22px', color: '#f6e7b8' }}>
            <p style={{ margin: 0, fontFamily: 'Playfair Display, Georgia, serif', fontSize: 24 }}>Thank you, and God bless you!</p>
            <p style={{ margin: '10px 0 0', color: '#d6dcea' }}>You are on the list for The Rosarian. Each email has an unsubscribe link at the bottom.</p>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} style={{ textAlign: 'left', display: 'grid', gap: 16 }} noValidate={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div><label style={labelStyle} htmlFor="rosarian-name">Full name *</label><input id="rosarian-name" required maxLength={120} autoComplete="name" value={form.name} onChange={set('name')} style={inputStyle} /></div>
              <div><label style={labelStyle} htmlFor="rosarian-email">Email *</label><input id="rosarian-email" required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={set('email')} style={inputStyle} /></div>
              <div><label style={labelStyle} htmlFor="rosarian-whatsapp">WhatsApp number</label><input id="rosarian-whatsapp" type="tel" maxLength={30} autoComplete="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+234…" style={inputStyle} /></div>
              <div><label style={labelStyle} htmlFor="rosarian-phone">Phone number</label><input id="rosarian-phone" type="tel" maxLength={30} value={form.phone} onChange={set('phone')} placeholder="0801…" style={inputStyle} /></div>
            </div>
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>Leave this empty<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#d6dcea', fontSize: 14, lineHeight: 1.5, cursor: 'pointer' }}>
              <input type="checkbox" required checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} style={{ marginTop: 3, width: 18, height: 18, accentColor: '#c9a84c' }} />
              <span>I agree that Holy Rosary Catholic Church may store my details and email me The Rosarian monthly. I can unsubscribe at any time.</span>
            </label>
            {error && <p role="alert" style={{ margin: 0, padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 14 }}>{error}</p>}
            <button type="submit" disabled={state === 'sending'} style={{ justifySelf: 'center', background: '#c9a84c', color: '#1a2744', border: 0, borderRadius: 8, padding: '15px 38px', fontSize: 14, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: state === 'sending' ? 'wait' : 'pointer', opacity: state === 'sending' ? 0.7 : 1 }}>
              {state === 'sending' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default NewsletterSignup;
