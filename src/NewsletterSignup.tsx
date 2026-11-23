import React, { useEffect, useState } from 'react';
import { newsletterPublicApi } from './lib/newsletterApi';

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#e8c97e',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid rgba(232,201,126,0.45)',
  background: 'rgba(255,255,255,0.96)',
  color: '#1a2744',
  fontSize: 15,
  fontFamily: 'inherit',
};

type NewsletterSignupModalProps = {
  open: boolean;
  initialEmail?: string;
  onClose: () => void;
};

const NewsletterSignupModal = ({ open, initialEmail = '', onClose }: NewsletterSignupModalProps) => {
  const [form, setForm] = useState({ name: '', email: initialEmail, whatsapp: '', phone: '', consent: false, website: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm((current) => ({ ...current, email: initialEmail || current.email }));
      setError('');
      if (state === 'done') setState('idle');
    }
  }, [open, initialEmail]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (key: 'name' | 'email' | 'whatsapp' | 'phone' | 'website') => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

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
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 130,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(10, 17, 34, 0.78)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rosarian-modal-heading"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 620,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 18,
          background: 'linear-gradient(135deg, #1a2744 0%, #24365f 100%)',
          borderTop: '4px solid #c9a84c',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45)',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close newsletter signup"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: '9999px',
            border: '1px solid rgba(232,201,126,0.35)',
            background: 'rgba(255,255,255,0.08)',
            color: '#f6e7b8',
            fontSize: 22,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c9a84c', fontWeight: 700 }}>
          Holy Rosary Catholic Church
        </p>
        <h2
          id="rosarian-modal-heading"
          style={{
            margin: '8px 0 6px',
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(28px, 5vw, 40px)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#f6e7b8',
            fontWeight: 400,
          }}
        >
          The Rosarian
        </h2>
        <div style={{ display: 'inline-block', borderTop: '1px solid #c9a84c', borderBottom: '1px solid #c9a84c', padding: '6px 18px', margin: '0 0 16px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#c9a84c', fontWeight: 700 }}>
            Parish News and Highlights
          </span>
        </div>
        <p style={{ margin: '0 auto 24px', maxWidth: 480, color: '#d6dcea', fontSize: 15, lineHeight: 1.6 }}>
          Complete your details below to receive our monthly newsletter and an instant welcome email with Mass &amp; Confession times and parish contacts.
        </p>

        {state === 'done' ? (
          <div role="status" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(232,201,126,0.5)', borderRadius: 14, padding: '26px 20px', color: '#f6e7b8' }}>
            <p style={{ margin: 0, fontFamily: 'Playfair Display, Georgia, serif', fontSize: 24 }}>
              Thank you for subscribing!
            </p>
            <p style={{ margin: '10px 0 0', color: '#d6dcea', fontSize: 15, lineHeight: 1.6 }}>
              A confirmation email with our Mass &amp; Confession schedule, Instagram, and Parishioners Platform link has been sent to <strong>{form.email}</strong>. God bless you!
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 20,
                background: '#c9a84c',
                color: '#1a2744',
                border: 0,
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} style={{ textAlign: 'left', display: 'grid', gap: 14 }} noValidate={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <label style={labelStyle} htmlFor="rosarian-name">Full name *</label>
                <input id="rosarian-name" required maxLength={120} autoComplete="name" value={form.name} onChange={set('name')} placeholder="Your full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rosarian-email">Email *</label>
                <input id="rosarian-email" required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={set('email')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rosarian-whatsapp">WhatsApp number</label>
                <input id="rosarian-whatsapp" type="tel" maxLength={30} autoComplete="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+234…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rosarian-phone">Phone number</label>
                <input id="rosarian-phone" type="tel" maxLength={30} value={form.phone} onChange={set('phone')} placeholder="0801…" style={inputStyle} />
              </div>
            </div>
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>Leave this empty<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#d6dcea', fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                required
                checked={form.consent}
                onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))}
                style={{ marginTop: 3, width: 18, height: 18, accentColor: '#c9a84c', flexShrink: 0 }}
              />
              <span>I agree that Holy Rosary Catholic Church may store my details and email me The Rosarian monthly. I can unsubscribe at any time.</span>
            </label>
            {error && (
              <p role="alert" style={{ margin: 0, padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 14 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={state === 'sending'}
              style={{
                justifySelf: 'center',
                background: '#c9a84c',
                color: '#1a2744',
                border: 0,
                borderRadius: 8,
                padding: '14px 36px',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                cursor: state === 'sending' ? 'wait' : 'pointer',
                opacity: state === 'sending' ? 0.7 : 1,
              }}
            >
              {state === 'sending' ? 'Subscribing…' : 'Complete Subscription'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export default NewsletterSignupModal;
