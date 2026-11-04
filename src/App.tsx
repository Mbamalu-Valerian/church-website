import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { publicApi, authApi, adminApi } from './lib/api';
import type { Announcement, ParishArticle, FeastDay, GalleryImage } from './lib/api';

// ─── SVG Icon Components ──────────────────────────────────────────────────────
type IconProps = { className?: string; style?: React.CSSProperties };

const feastColorOptions = [
  { label: 'Green', value: '#16a34a' },
  { label: 'White', value: '#ffffff' },
  { label: 'Red', value: '#b91c1c' },
  { label: 'Purple', value: '#6b21a8' },
];

const feastColorLabels = Object.fromEntries(
  feastColorOptions.map((option) => [option.value, option.label])
);

const ParishArticleMarkdown = ({ source }: { source: string }) => (
  <ReactMarkdown
    components={{
      h2: ({ children }) => <h2 className="mt-7 mb-3 text-xl font-bold" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>{children}</h2>,
      p: ({ children }) => <p className="mb-4 text-gray-700 leading-7 last:mb-0">{children}</p>,
    }}
  >
    {source}
  </ReactMarkdown>
);

const CrossIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 2h2v9h9v2h-9v9h-2v-9H2v-2h9V2z" />
  </svg>
);

const PhoneIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15v1.92z" />
  </svg>
);

const MapPinIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChevronDownIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MenuIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const XIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);


const ArrowUpIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const MailIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22 6 12 13 2 6" />
  </svg>
);

const InstagramIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
  </svg>
);

const YouTubeIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23 12c0-1.9-.17-3.8-.5-5.6-.33-1.5-1.5-2.7-3-3.1C17.5 2.7 15.7 2.5 12 2.5S6.5 2.7 4.5 3.3c-1.5.4-2.7 1.6-3 3.1C1.2 8.2 1 10.1 1 12s.17 3.8.5 5.6c.33 1.5 1.5 2.7 3 3.1 2 .6 3.8.8 7.5.8s5.5-.2 7.5-.8c1.5-.4 2.7-1.6 3-3.1.33-1.8.5-3.7.5-5.6zm-13.2 4.1V7.9L16 12l-6.2 4.1z" />
  </svg>
);

const HeartIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

const BookIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
  </svg>
);

const MusicIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);

const UsersIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const StarIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const HandIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0" /><path d="M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2" /><path d="M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8" /><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15" />
  </svg>
);


// ─── Toast Component ──────────────────────────────────────────────────────────

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const primaryNavLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Parish Activities', href: '#activities' },
    { label: 'Committees', href: '#committees' },
    { label: 'Community', href: '#community' },
  ];

  const moreLinks = [
    { label: 'Photo Gallery', href: '#gallery' },
    { label: 'Pastoral Team', href: '#priests' },
    { label: 'Office Hours', href: '#office-hours' },
    { label: 'Upcoming Events', href: '#events' },
    { label: 'Contact Us', href: '#contact' },
  ];

  const allNavLinks = [
    ...primaryNavLinks,
    { label: 'Photo Gallery', href: '#gallery' },
    { label: 'Pastoral Team', href: '#priests' },
    { label: 'Office Hours', href: '#office-hours' },
  ];

  return (
    <nav
      className="navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        boxShadow: isScrolled ? '0 4px 24px rgba(0,0,0,0.35)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a href="#home" className="flex items-center gap-3 shrink-0 mr-4 xl:mr-8 group">
            <img
              src="/images/holy_rosary_seal_cutout.png"
              alt="Holy Rosary Catholic Church Seal"
              className="w-11 h-11 md:w-13 md:h-13 rounded-full object-cover border-2 border-[#D4AF37] bg-[#f3e7bb] shadow-[0_0_0_2px_rgba(212,175,55,0.35)] shrink-0"
            />
            <p className="text-white font-bold text-base xl:text-lg leading-tight whitespace-nowrap tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Holy Rosary Catholic Church
            </p>
          </a>

          <div className="hidden lg:flex items-center gap-4 xl:gap-6 ml-auto">
            {primaryNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-[#c9a84c] transition-colors duration-200 text-xs xl:text-sm font-medium whitespace-nowrap"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {link.label}
              </a>
            ))}

            {/* More Dropdown for secondary links */}
            <div
              className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                type="button"
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1 text-gray-300 hover:text-[#c9a84c] transition-colors duration-200 text-xs xl:text-sm font-medium py-1.5 focus:outline-none"
              >
                <span>More</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full pt-2 w-52 z-50 animate-fade-in">
                  <div
                    className="rounded-xl shadow-2xl p-2 border border-amber-500/30 backdrop-blur-md"
                    style={{ background: 'rgba(20, 30, 55, 0.98)' }}
                  >
                    {moreLinks.map((subLink) => (
                      <a
                        key={subLink.href}
                        href={subLink.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs xl:text-sm text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        {subLink.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a
              href="tel:+2349070761824"
              className="btn-gold text-xs py-2 px-3 xl:px-4 ml-1 xl:ml-2 whitespace-nowrap shrink-0"
            >
              <PhoneIcon className="w-3.5 h-3.5" />
              Call Now
            </a>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-white p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={menuOpen ? 'open' : ''} style={{ background: 'rgba(26,39,68,0.98)' }}>
        <div className="max-w-7xl mx-auto px-4 pb-4 flex flex-col gap-2">
          {allNavLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-white py-2.5 border-b border-white/10 text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="tel:+2349070761824"
            className="btn-gold text-xs py-2.5 mt-2 justify-center"
          >
            <PhoneIcon className="w-3.5 h-3.5" />
            Call Now: +234 907 076 1824
          </a>
        </div>
      </div>
    </nav>
  );
};

// ─── Hero Section ─────────────────────────────────────────────────────────────
const HeroSection = () => {
  const massTimes = [
    { day: 'Weekday Mass (Mon-Fri)', times: ['6:00 AM', '12:00 Noon', '6:00 PM'] },
    { day: 'Saturday Mass', times: ['6:00 AM'] },
    { day: 'Sunday Mass', times: ['6:00 AM', '8:00 AM', '8:15 AM (Children)', '10:00 AM', '6:00 PM'] },
  ];

  const sacramentTimes = [
    { day: 'Confession', times: ['Thursdays: 6:30 AM & 6:30 PM', 'Saturdays: 6:30 AM'] },
    { day: 'Benediction', times: ['Sundays, 5:00 PM'] },
  ];

  return (
    <section id="home" className="hero-section">
      <div className="hero-bg" />
      <div className="hero-overlay" />

      <div className="hero-content w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)' }}>
            <CrossIcon className="w-3.5 h-3.5" style={{ color: '#c9a84c' }} />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#c9a84c' }}>
              Est. in Faith & Community
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
            style={{ fontFamily: 'Playfair Display, serif', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            Welcome to{' '}
            <span className="block mt-1" style={{
              background: 'linear-gradient(135deg, #a07830, #e8c97e, #a07830)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Holy Rosary
            </span>
            Catholic Church
          </h1>

          <div className="gold-line my-6" />

          {/* Slogan with manual line break */}
          <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto mb-4">
            Rosarians!!! <br />
            One Family United In Christ
          </p>
          <p className="text-base text-gray-400 mb-10 flex items-center justify-center gap-2">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a84c' }} />
            Mambolo Street, Wuse Zone 2, Abuja 904101
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a href="tel:+2349070761824" className="btn-gold">
              <PhoneIcon className="w-4 h-4" />
              Call Now
            </a>
          </div>

          {/* Mass Times Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {massTimes.map((mt) => (
              <div key={mt.day} className="rounded-lg px-4 py-3 text-center flex flex-col justify-center items-center h-full transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="text-xs font-semibold mb-1 text-center" style={{ color: '#c9a84c' }}>{mt.day}</p>
                <div className="flex flex-col justify-center items-center gap-1 text-center w-full">
                  {mt.times.map((time, idx) => (
                    <span key={idx} className="block text-white text-sm font-medium">{time}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Confession & Benediction Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mt-3">
            {sacramentTimes.map((st) => (
              <div key={st.day} className="rounded-lg px-4 py-3 text-center flex flex-col justify-center items-center h-full transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="text-xs font-semibold mb-1 text-center" style={{ color: '#c9a84c' }}>{st.day}</p>
                <div className="flex flex-col justify-center items-center gap-1 text-center w-full">
                  {st.times.map((time, idx) => (
                    <span key={idx} className="block text-white text-sm font-medium">{time}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <a href="#about" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce">
        <ChevronDownIcon className="w-7 h-7" />
      </a>
    </section>
  );
};

// ─── About Section ────────────────────────────────────────────────────────────
const AboutSection = () => {
  return (
    <section id="about" className="py-20 section-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="section-tag mb-3">Who We Are</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#1a2744' }}>
            About Holy Rosary Parish
          </h2>
          <div className="gold-line mb-8" />
          <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
            Holy Rosary Catholic Church is a vibrant community in Wuse Zone 2 where faith is lived out through active worship, communal prayer, and dedicated service. We gather not only for Sunday Mass but for daily prayers, Eucharistic adoration, and Marian devotions, fostering a collective commitment to growing closer to God as one family united in Christ.
          </p>
        </div>
      </div>
    </section>
  );
};

// ─── Parish Activities Section ─────────────────────────────────────────────────
const parishChoirs = [
  {
    name: 'Chorale de Angelis',
    mass: 'Sings at the Sunday 6:00 AM Mass',
    rehearsal: 'Rehearsal: Saturday at 6:00 PM',
  },
  {
    name: 'All Saints Choir',
    mass: 'Sings at the Sunday 8:00 AM Mass',
    rehearsal: 'Rehearsals: Sunday at 10:30 AM and Saturday at 5:00 PM',
  },
  {
    name: 'St. Gregory Choir',
    mass: 'Sings at the Sunday 10:00 AM Mass',
    rehearsal: 'Rehearsal: Saturday at 6:30 PM',
  },
  {
    name: "St. Cecilia's Choir {Parish Choir}",
    mass: 'Parish Choir (Major Feasts & Solemnities)',
    rehearsal: 'Rehearsal: Thursdays at 6:00 PM',
  },
];

const ActivitiesSection = () => {
  const [choirsOpen, setChoirsOpen] = useState(false);
  const activities = [
    {
      icon: <MusicIcon className="w-7 h-7 text-white" />,
      title: 'Parish Choir & Rehearsals',
      description: 'Parish Choir and Individual Choir rehearsals. Tap to view all choir assignments and rehearsal schedules.',
      schedule: 'Weekly (Tap to view all 4 choirs)',
      tag: 'Music',
      isChoir: true,
    },
    {
      icon: <UsersIcon className="w-7 h-7 text-white" />,
      title: "Children's Ministry & CYON",
      description: "Nurturing the faith of our youth through the Catholic Youth Organization of Nigeria (CYON) and Children's Ministry.",
      schedule: "Children's Mass: Sundays, 8:15 AM",
      tag: 'Youth',
    },
    {
      icon: <HandIcon className="w-7 h-7 text-white" />,
      title: 'Communion Round',
      description: 'Holy Communion taken to the sick and aged parishioners who cannot attend mass.',
      schedule: 'Fridays: 7:00 AM - 9:00 AM',
      tag: 'Pastoral',
    },
    {
      icon: <HeartIcon className="w-7 h-7 text-white" />,
      title: 'Marriage Course',
      description: 'Dedicated marriage counselling and comprehensive marriage preparation courses.',
      schedule: 'Thur & Fri: 6-8 PM | Sat & Sun: 4-6 PM',
      tag: 'Family',
    },
    {
      icon: <CrossIcon className="w-7 h-7 text-white" />,
      title: 'Confession',
      description: 'Experience the healing grace of God through the Sacrament of Reconciliation.',
      schedule: 'Thur: 6:30 AM & 6:30 PM | Sat: 6:30 AM',
      tag: 'Sacrament',
    },
    {
      icon: <StarIcon className="w-7 h-7 text-white" />,
      title: 'Benediction',
      description: "A sacred hour of prayer and contemplation before the Blessed Sacrament.",
      schedule: 'Sundays, 5:00 PM',
      tag: 'Prayer',
    },
    {
      icon: <BookIcon className="w-7 h-7 text-white" />,
      title: 'Catechism Classes',
      description: 'Faith formation and sacramental preparation classes for all ages.',
      schedule: 'Sat & Sun: 4:00 PM',
      tag: 'Formation',
    },
    {
      icon: <CrossIcon className="w-7 h-7 text-white" />,
      title: 'Infant Baptism',
      description: 'Welcoming the newest members of our family into the Catholic faith.',
      schedule: '1st Saturday of the Month: 6:00 AM',
      tag: 'Sacrament',
    }
  ];

  return (
    <section id="activities" className="py-20 section-blue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="section-tag mb-3">Community Life</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#000000' }}>
            Parish Activities
          </h2>
          <div className="gold-line mb-5" />
          <p className="text-black text-lg max-w-2xl mx-auto">
            Grow in faith, fellowship, and service through our rich calendar of pastoral activities designed for every member of the family.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activities.map((act, i) => (
            <div
              key={i}
              onClick={() => {
                if (act.isChoir) setChoirsOpen(true);
              }}
              className={`card group transition-all duration-300 ${act.isChoir ? 'cursor-pointer hover:border-amber-400 hover:shadow-lg ring-1 ring-amber-500/20' : ''}`}
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="activity-icon-wrap">
                    {act.icon}
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#a07830', border: '1px solid rgba(201,168,76,0.3)' }}>
                    {act.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-6 flex items-center justify-between" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>
                  <span>{act.title}</span>
                  {act.isChoir && <span className="text-xs font-sans font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Tap to view</span>}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-grow">
                  {act.description}
                </p>
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <ClockIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a84c' }} />
                  <span className="text-xs font-semibold" style={{ color: '#a07830' }}>{act.schedule}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Parish Choirs Modal */}
      {choirsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setChoirsOpen(false)}
        >
          <div
            className="bg-[#1a2744] text-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-amber-500/40 shadow-2xl relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-400">
                  <MusicIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">Parish Choirs</h3>
                  <p className="text-xs text-amber-300">Mass assignments & rehearsal schedules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChoirsOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {parishChoirs.map((choir, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all"
                >
                  <h4 className="font-bold text-white text-base sm:text-lg flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-gray-900 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    {choir.name}
                  </h4>
                  <div className="ml-8 space-y-1.5">
                    <p className="text-sm text-amber-200/90 font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      {choir.mass}
                    </p>
                    <p className="text-xs text-gray-300 flex items-center gap-2">
                      <ClockIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {choir.rehearsal}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setChoirsOpen(false)}
                className="btn-gold text-xs py-2 px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ─── Parish Committees Section ────────────────────────────────────────────────
const CommitteesSection = () => {
  const [filter, setFilter] = useState<'all' | 'liturgical' | 'non-liturgical'>('all');

  const liturgicalCommittees = [
    {
      name: 'Board of Lectors',
      category: 'Liturgical Committee',
      meeting: '1st & 3rd Saturdays, 5:00 PM',
      duty: 'Proclamation of the Word of God at Daily & Sunday Masses',
      description: 'Dedicated to prayerful study, diction preparation, and the reverent proclamation of Sacred Scripture during all liturgical celebrations.',
    },
    {
      name: 'Parish Choir',
      category: 'Liturgical Committee',
      meeting: 'Weekly rehearsals by individual choirs',
      duty: 'Sacred Hymnody & Liturgical Choir Service',
      description: 'Coordinating sacred liturgical music across all parish Masses through four active choirs:',
      choirList: [
        'Chorale de Angelis — Sunday 6:00 AM Mass | Rehearsal: Saturday at 6:00 PM',
        'All Saints Choir — Sunday 8:00 AM Mass | Rehearsals: Sunday at 10:30 AM & Saturday at 5:00 PM',
        'St. Gregory Choir — Sunday 10:00 AM Mass | Rehearsal: Saturday at 6:30 PM',
        "St. Cecilia's Choir {Parish Choir} — Rehearsal: Thursdays at 6:00 PM",
      ],
    },
    {
      name: 'Altar Knights',
      category: 'Liturgical Committee',
      meeting: 'Every Saturday, 8:00 AM',
      duty: 'Sanctuary Service & Processions',
      description: 'Guiding altar servers in reverence, discipline, liturgical decorum, and assisting the priests during Masses and solemn processions.',
    },
  ];

  const nonLiturgicalCommittees = [
    {
      name: 'Board of Church Wardens (Church Ushers)',
      category: 'Non-Liturgical Committee',
      meeting: '2nd Sunday of the month after 10:00 AM Mass',
      duty: 'Hospitality, Decorum & Offertory Coordination',
      description: 'Ensuring reverent order and hospitality in church, assisting elderly and visitors, coordinating offertory processions, and maintaining sanctuary decorum.',
    },
    {
      name: 'Communications & Media Committee',
      category: 'Non-Liturgical Committee',
      meeting: '1st Sunday of the month, 4:00 PM',
      duty: 'Digital Media, Bulletin, Audio-Visuals & Parish Website',
      description: 'Managing parish digital broadcasts, weekly bulletin publications, photography, live streaming of Masses, audio-visual setup, and website updates.',
    },
  ];

  const displayed =
    filter === 'liturgical'
      ? liturgicalCommittees
      : filter === 'non-liturgical'
      ? nonLiturgicalCommittees
      : [...liturgicalCommittees, ...nonLiturgicalCommittees];

  return (
    <section id="committees" className="py-20 section-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-tag mb-3">Service & Ministry</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1a2744' }}>
            Parish Committees
          </h2>
          <div className="gold-line mb-5" />
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Our liturgical and non-liturgical committees ensure reverent worship, sanctuary decorum, pastoral outreach, and seamless parish administration.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { id: 'all', label: 'All Committees' },
            { id: 'liturgical', label: 'Liturgical Committees' },
            { id: 'non-liturgical', label: 'Non-Liturgical Committees' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                filter === tab.id
                  ? 'bg-[#1a2744] text-[#c9a84c] shadow-md border border-[#c9a84c]'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid of Committees */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto animate-fade-in">
          {displayed.map((c, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/80 hover:shadow-md hover:border-amber-400/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      c.category === 'Liturgical Committee'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                    }`}
                  >
                    {c.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-[#1a2744]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {c.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{c.description}</p>

                {'choirList' in c && Array.isArray(c.choirList) && (
                  <div className="mb-4 p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-2">
                    <p className="text-xs font-bold text-[#1a2744] uppercase tracking-wider">Choir Schedule:</p>
                    {c.choirList.map((ch: string, idx: number) => (
                      <div key={idx} className="text-xs text-gray-800 flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{ch}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-1.5 mt-auto">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                  <ClockIcon className="w-4 h-4 text-amber-600 shrink-0" />
                  <span><strong>Meeting:</strong> {c.meeting}</span>
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Role:</span> {c.duty}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Community (Societies) Section ────────────────────────────────────────────
type CommunityItem = {
  name: string;
  meeting?: string;
  time?: string;
  states?: string;
  subtitle?: string;
  thanksgiving?: string;
};

const CommunitySection = () => {
  const [activeTab, setActiveTab] = useState<'organizations' | 'societies' | 'knighthood' | 'states'>('organizations');
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({
    organizations: false,
    societies: false,
    knighthood: false,
    states: false,
  });

  const groups: Record<'organizations' | 'societies' | 'knighthood' | 'states', CommunityItem[]> = {
    organizations: [
      { name: 'Catholic Men Organization (CMO)', meeting: 'Every Second Saturday', thanksgiving: 'Every Second Sunday' },
      { name: 'Catholic Women Organization (CWO)', meeting: 'Every First Saturday', thanksgiving: '3rd Sunday after 10AM Mass' },
      { name: 'Catholic Youth Organization (CYON)', meeting: '1st Sunday after 8AM Mass', thanksgiving: 'Quarterly Youth Thanksgiving' },
      { name: 'Childrens Ministry', meeting: 'Sundays during Children\'s Mass', subtitle: 'Faith formation, catechism & liturgy for children' },
      { name: 'Parish Pastoral Council (PPC)', meeting: 'Monthly Executive & General Assembly', subtitle: 'Parish consultative & pastoral governance council' },
    ],
    societies: [
      { name: 'Eucharistic Adorers' },
      { name: 'Purgatorian Society' },
      { name: 'Rosa Mistica' },
      { name: 'Legion of Mary' },
      { name: 'Holy Family' },
      { name: 'Blue Army' },
      { name: 'Infant Jesus of Prague' },
      { name: 'Queen of All Hearts' },
      { name: 'Association of Sacred Heart of Jesus' },
      { name: 'St. Jude Society' },
      { name: 'Block Rosary' },
      { name: 'Precious Blood' },
      { name: 'Guild of St. Anthony of Padua' },
      { name: 'Apostleship of Sacred Heart of Jesus' },
      { name: 'Confraternity of the Most Holy Rosary' },
      { name: 'Our Lady Help of Christians Ministry' },
      { name: 'St. Rita of Cascia' },
      { name: 'Divine Mercy Devotees' },
      { name: 'Catholic Daughters of Mary' },
      { name: 'Catholic Sisters United' },
      { name: 'Confraternity of Christian Mothers' },
      { name: 'St. Vincent de Paul' },
      { name: 'St. Monica Society' },
      { name: 'Confraternity of Our Mother of Perpetual Help' },
      { name: 'Dove of Peace Charismatic Community' },
      { name: 'Associate Missionary of St. Paul' },
    ],
    knighthood: [
      { name: 'Knights & Ladies of St. Mulumba', subtitle: 'Order of the Knights of Saint Mulumba Nigeria (KSM / LSM)', meeting: '3rd Saturday of the month' },
      { name: 'Knights & Ladies of St. John International', subtitle: 'Knights of St. John International & Ladies Auxiliary (KSJI / LAUX)', meeting: '2nd Saturday of the month' },
    ],
    states: [
      { name: 'St. Anthony Catholic Community' },
      { name: 'Blessed Iwene Tansi', states: 'Anambra, Ebonyi & Enugu', time: '2nd Sunday of the month' },
      { name: 'St. Michael Catholic Community', states: 'All Yoruba-speaking states', time: '3rd Sunday of the month' },
      { name: 'St. Peter Catholic Community', states: 'Akwa Ibom, Bayelsa, Cross River & Rivers', time: '1st Sunday of the month' },
      { name: 'St. Patrick Catholic Community', states: 'Edo & Delta', time: '2nd Sunday of the month' },
      { name: 'Northern States Catholic Community', states: 'Kaduna, Kano, Katsina, Sokoto, Borno, Bauchi, Gombe & Adamawa', time: '1st Sunday of the month' },
      { name: 'St. Raphael Catholic Community', states: 'Imo & Abia', time: '2nd Sunday of the month' },
      { name: 'St. Gabriel Catholic Community' },
    ],
  };

  const initialCounts: Record<string, number> = {
    organizations: 4,
    societies: 26,
    knighthood: 2,
    states: 8,
  };

  const allItems = groups[activeTab] || [];
  const limit = initialCounts[activeTab] || 4;
  const isExpanded = !!expandedTabs[activeTab];
  const displayedItems = isExpanded ? allItems : allItems.slice(0, limit);
  const hasMore = allItems.length > limit;

  const tabLabels: Record<string, string> = {
    organizations: 'Statutory Organizations',
    societies: 'Pious Societies',
    knighthood: 'Knighthood Orders',
    states: 'State Associations',
  };

  return (
    <section id="community" className="py-20 section-blue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-tag mb-3">Get Involved</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Parish Communities</h2>
          <div className="gold-line mb-8" />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10">
          {[
            { id: 'organizations', label: 'Statutory Organizations' },
            { id: 'societies', label: 'Pious Societies' },
            { id: 'knighthood', label: 'Knighthood' },
            { id: 'states', label: 'State Associations' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === tab.id ? 'bg-amber-500 text-gray-900 shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto animate-fade-in">
          {displayedItems.map((item, i) => {
            const schedule = item.time || item.meeting || '';
            const region = item.states || item.subtitle || '';
            const thanksgiving = item.thanksgiving || '';

            return (
              <div
                key={i}
                className="p-5 rounded-lg flex items-center justify-between transition-all duration-300 hover:border-amber-500/30"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div>
                  <p className="font-bold text-white text-base mb-1">{item.name}</p>
                  {region ? (
                    <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{region}</p>
                  ) : null}
                  {schedule ? (
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#c9a84c' }}>
                      <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{schedule}</span>
                    </div>
                  ) : null}
                  {thanksgiving ? (
                    <div className="text-xs mt-1" style={{ color: 'rgba(201,168,76,0.85)' }}>
                      <span className="font-medium text-amber-200/70">Thanksgiving:</span> {thanksgiving}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* View More / See More Button for all Community Sections */}
        {hasMore && (
          <div className="mt-8 flex justify-center animate-fade-in">
            <button
              type="button"
              onClick={() =>
                setExpandedTabs((prev) => ({
                  ...prev,
                  [activeTab]: !prev[activeTab],
                }))
              }
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border border-amber-500/50 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm hover:scale-105 active:scale-95"
            >
              {isExpanded ? (
                <>
                  <span>Show Less</span>
                  <ChevronDownIcon className="w-4 h-4 transform rotate-180 transition-transform duration-200" />
                </>
              ) : (
                <>
                  <span>
                    View More {tabLabels[activeTab]} ({allItems.length - limit} more)
                  </span>
                  <ChevronDownIcon className="w-4 h-4 transition-transform duration-200" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Upcoming Events Section ───────────────────────────────────────────────────
const EventsSection = () => {
  const [publishedAnnouncements, setPublishedAnnouncements] = useState<Array<{ id: number; title: string; description: string; date: string }>>([]);
  const [feastDays, setFeastDays] = useState<FeastDay[]>([]);

  useEffect(() => {
    publicApi.announcements().then(setPublishedAnnouncements).catch(() => setPublishedAnnouncements([]));
    publicApi.feastDays().then(setFeastDays).catch(() => setFeastDays([]));
  }, []);

  const eventsByGroup: Record<string, Array<any>> = {
    'Feast & Saint Days': feastDays.map((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return {
        id: item.id,
        month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        day: String(date.getDate()).padStart(2, '0'),
        year: String(date.getFullYear()),
        title: item.title,
        desc: item.description,
        category: item.category,
        group: 'Feast & Saint Days',
        color: item.color,
      };
    }),
    'Parish Announcements': publishedAnnouncements.map((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return {
        id: item.id,
        month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        day: String(date.getDate()).padStart(2, '0'),
        year: String(date.getFullYear()),
        title: item.title,
        desc: item.description,
        category: '',
        group: 'Parish Announcements',
        color: '#1d5fa6',
      };
    }),
  };

  const getFeastCardStyle = (color: string) => {
    const normalized = color.toLowerCase();
    const isWhite = normalized === '#ffffff' || normalized === '#fff';
    return {
      background: isWhite ? '#fdf8e9' : '#ffffff',
      borderLeft: `8px solid ${isWhite ? '#d4af37' : color}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    };
  };

  return (
    <section id="events" className="py-20 section-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="section-tag mb-3">Calendar</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1a2744' }}>
            Upcoming Events
          </h2>
          <div className="gold-line mb-5" />
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Mark your calendars and join us for these special celebrations, feasts, and community gatherings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {(['Feast & Saint Days', 'Parish Announcements'] as const).map((groupName) => {
            const groupEvents = eventsByGroup[groupName] || [];

            return (
              <div key={groupName} className="rounded-2xl p-6 sm:p-7 shadow-xl"
                style={{ background: 'linear-gradient(135deg, #ffffff, #faf8f3)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <h3 className="text-2xl font-bold mb-6 text-center" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>
                  {groupName}
                </h3>

                {groupEvents.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm">Nothing scheduled yet. Check back soon.</p>
                ) : (
                  <div className="space-y-4">
                    {groupEvents.map((ev, i) => {
                      const isFeastGroup = groupName === 'Feast & Saint Days';
                      const cardStyle = isFeastGroup ? getFeastCardStyle(ev.color) : undefined;
                      const color = ev.color || '';
                      const isWhite = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff';
                      const accentColor = isWhite ? '#d4af37' : (color || (i % 2 === 0 ? '#d4af37' : '#1d5fa6'));

                      return (
                        <div key={ev.id ?? i} className="event-card" style={cardStyle}>
                          <div className="event-date-box" style={isFeastGroup ? {
                            background: isWhite ? 'linear-gradient(135deg, #d4af37, #b9952a)' : `linear-gradient(135deg, ${color}, ${color})`,
                            color: isWhite ? '#1a2744' : '#ffffff',
                          } : undefined}>
                            <span className="text-xs font-bold tracking-wider uppercase leading-none">{ev.month}</span>
                            <span className="text-xl font-bold leading-tight">{ev.day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-bold text-base" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>
                                {ev.title}
                              </h4>
                              {isFeastGroup && (
                                <>
                                  <span className="text-xs px-2 py-0.5 rounded text-white flex-shrink-0" style={{ background: '#1a2744' }}>
                                    {ev.category}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0"
                                    style={{
                                      background: isWhite ? '#ffffff' : color,
                                      color: isWhite ? '#1a2744' : '#ffffff',
                                      border: isWhite ? '1px solid #d4af37' : '1px solid rgba(0,0,0,0.08)',
                                    }}>
                                    {feastColorLabels[color] || 'Liturgical'}
                                  </span>
                                  {ev.title === 'Our Lady of the Rosary' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0"
                                      style={{ background: '#d4af37', color: '#1a2744', border: '1px solid rgba(26,39,68,0.2)' }}>
                                      Parish Feast
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            {ev.desc ? (
                              <p className="text-gray-500 text-sm leading-relaxed">{ev.desc}</p>
                            ) : (
                              isFeastGroup ? (
                                <div className="mt-2 h-2.5 w-28 rounded-full" style={{ background: accentColor }} />
                              ) : null
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ─── Photo Gallery Section ────────────────────────────────────────────────────
const compressGalleryImage = async (file: File): Promise<string> => {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare the selected photo.');

    for (let attempt = 0; attempt < 8; attempt += 1) {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', Math.max(0.45, 0.82 - attempt * 0.07));
      const base64 = imageData.slice(imageData.indexOf(',') + 1);
      const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
      if (Math.floor(base64.length * 3 / 4) - padding <= 1024 * 1024) return imageData;
      canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
    }
    throw new Error('This photo could not be compressed enough. Choose a smaller image.');
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const GallerySection = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryError, setGalleryError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeImageIndex === null) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveImageIndex(null);
      if (event.key === 'ArrowRight') setActiveImageIndex((index) => index === null ? null : (index + 1) % images.length);
      if (event.key === 'ArrowLeft') setActiveImageIndex((index) => index === null ? null : (index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, images.length]);

  useEffect(() => {
    publicApi.gallery()
      .then(setImages)
      .catch((error: unknown) => setGalleryError(error instanceof Error ? error.message : 'Unable to load parish photos.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="gallery" className="py-20 section-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-tag mb-3">Memories</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#1a2744' }}>Photo Gallery</h2>
          <div className="gold-line mb-8" />
        </div>
        {galleryError ? <p role="alert" className="text-center text-gray-600">{galleryError}</p>
          : images.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageIndex(images.findIndex((item) => item.id === image.id))}
                aria-label={`View ${image.caption}`}
                className={`group relative block w-full overflow-hidden rounded-xl bg-white p-0 text-left shadow-md focus:outline-none focus:ring-4 focus:ring-amber-400 ${image.isFeatured ? 'sm:col-span-2 lg:col-span-2' : ''}`}
              >
                <img src={image.thumbnailUrl} alt={image.caption} loading="lazy" className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${image.isFeatured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} />
                {image.isFeatured && <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950">Featured photo</span>}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 text-lg font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  {image.caption}
                </span>
              </button>
            ))}
          </div>
            : <p className="text-center text-gray-600">{loading ? 'Loading parish photos...' : 'Parish photos will appear here soon.'}</p>}
      </div>
      {activeImageIndex !== null && images[activeImageIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Parish photo viewer"
          onClick={() => setActiveImageIndex(null)}
        >
          <button type="button" onClick={() => setActiveImageIndex(null)} aria-label="Close photo viewer" className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-2xl text-white hover:bg-white/25">×</button>
          {images.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + images.length) % images.length); }} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25 sm:left-6">‹</button>}
          <div className="flex max-h-full max-w-6xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <img src={images[activeImageIndex].thumbnailUrl} alt={images[activeImageIndex].caption} className="max-h-[78vh] max-w-full rounded-lg object-contain" />
            <p className="m-0 text-center text-lg font-semibold text-white">{images[activeImageIndex].caption}</p>
            <p className="m-0 text-sm text-white/70">{activeImageIndex + 1} of {images.length}</p>
          </div>
          {images.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % images.length); }} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25 sm:right-6">›</button>}
        </div>
      )}
    </section>
  );
};

// ─── Articles Section ─────────────────────────────────────────────────────────
const ArticlesSection = () => {
  const [articles, setArticles] = useState<ParishArticle[]>([]);

  useEffect(() => {
    publicApi.articles().then(setArticles).catch(() => setArticles([]));
  }, []);

  return (
    <section id="articles" className="py-20 section-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="section-tag mb-3">Parish Blog</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1a2744' }}>
            Parish Articles
          </h2>
          <div className="gold-line mb-5" />
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Reflections and stories from the life of Holy Rosary Catholic Church.
          </p>
        </div>

        {articles.length === 0 ? (
          <p className="text-center text-gray-500">The next parish article will appear here.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {articles.map((article) => (
                <article key={article.id} id={`article-${article.slug}`} className="rounded-xl p-6 flex flex-col h-full shadow-lg" style={{ background: '#faf8f3', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <time className="text-xs font-semibold uppercase mb-4" style={{ color: '#a07830' }} dateTime={article.publishDate}>
                    {new Date(`${article.publishDate}T00:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </time>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>{article.title}</h3>
                  <p className="text-xs font-semibold mb-3" style={{ color: '#a07830' }}>By {article.authorName}</p>
                  <p className="text-gray-600 leading-relaxed mb-5">{article.excerpt}</p>
                  <details className="mt-auto border-t border-[#e5dcc4] pt-4">
                    <summary className="cursor-pointer font-semibold" style={{ color: '#1a2744' }}>Read article</summary>
                    <div className="mt-4">
                      <ParishArticleMarkdown source={article.body} />
                    </div>
                  </details>
                </article>
              ))}
            </div>

            <div className="border-t border-[#e5dcc4] pt-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>Previous articles</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                {articles.map((article) => (
                  <li key={`archive-${article.id}`}>
                    <a href={`#article-${article.slug}`} className="font-medium hover:underline" style={{ color: '#1d5fa6' }}>{article.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

// ─── Pastoral Team Section ────────────────────────────────────────────────────
const PastoralTeamSection = () => {
  const hierarchy = [
    {
      name: 'His Eminence, John Cardinal Onaiyekan',
      title: 'Archbishop Emeritus of Abuja',
      image: '/images/cardinal.jpg',
      specialization: 'Cardinal',
    },
    {
      name: 'Most Rev. Dr. Ignatius Ayau Kaigama',
      title: 'Archbishop of Abuja',
      image: '/images/archbishop.jpg',
      specialization: 'Archbishop',
    },
    {
      name: 'Most Rev. Dr. Anselm Umoren',
      title: 'Auxiliary Bishop of Abuja',
      image: '/images/aux-bishop.jpg',
      specialization: 'Auxiliary Bishop',
    }
  ];

  const parishClergy = [
    {
      name: 'Rev. Fr. Francis Kale',
      title: 'Parish Priest',
      image: '/images/priest1.jpg',
      contact: '0812 219 2192',
      phoneHref: 'tel:+2348122192192',
      specialization: 'Parish Priest',
    },
    {
      name: 'Rev. Fr. Pascal Okpanachi Yahaya',
      title: 'Associate Priest',
      image: '/images/priest2.jpg',
      contact: 'Contact via Parish Office',
      specialization: 'Associate Priest',
    },
    {
      name: 'Rev. Fr. Chijioke Majela',
      title: 'Associate Priest',
      image: '/images/priest3.jpg',
      contact: 'Contact via Parish Office',
      specialization: 'Associate Priest',
    },
  ];

  return (
    <section id="priests" className="py-20 section-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="section-tag mb-3">Our Shepherds</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1a2744' }}>
            The Pastoral Team
          </h2>
          <div className="gold-line mb-5" />
        </div>

        {/* Archdiocesan Hierarchy Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {hierarchy.map((leader, i) => (
            <div key={`hierarchy-${i}`} className="priest-card">
              <div className="relative overflow-hidden" style={{ height: 320 }}>
                <img src={leader.image} alt={leader.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, rgba(26,39,68,0.9), transparent)' }} />
                <div className="absolute bottom-4 left-4">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(201,168,76,0.9)', color: '#1a1a1a' }}>
                    {leader.specialization}
                  </span>
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold mb-1" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>{leader.name}</h3>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{leader.title}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full h-px mb-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />

        {/* Parish Clergy Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {parishClergy.map((priest, i) => (
            <div key={`priest-${i}`} className="priest-card">
              <div className="relative overflow-hidden" style={{ height: 320 }}>
                <img src={priest.image} alt={priest.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, rgba(26,39,68,0.9), transparent)' }} />
                <div className="absolute bottom-4 left-4">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(201,168,76,0.9)', color: '#1a1a1a' }}>
                    {priest.title}
                  </span>
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>{priest.name}</h3>
                {priest.phoneHref ? <a href={priest.phoneHref} className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ background: 'rgba(201,168,76,0.1)', color: '#1a2744' }} aria-label={`Call ${priest.name} at ${priest.contact}`}>
                  <PhoneIcon className="w-3.5 h-3.5" style={{ color: '#a07830' }}/>
                  {priest.contact}
                </a> : <div className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)', color: '#1a2744' }}>
                  <PhoneIcon className="w-3.5 h-3.5" style={{ color: '#a07830' }}/>
                  {priest.contact}
                </div>}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

// ─── Office Hours Section ─────────────────────────────────────────────────────
const OfficeHoursSection = () => {
  const clergyOfficeDays = [
    { role: 'Parish Priest', days: 'Monday – Thursday' },
    { role: 'Assistant Parish Priest', days: 'Tuesday – Friday' },
  ];

  const services = [
    { icon: '📋', name: 'Baptism Registration' },
    { icon: '✝', name: 'Mass Intention Submission' },
    { icon: '📜', name: 'Church Certificates' },
    { icon: '📞', name: 'Emergency Pastoral Care' },
    { icon: '⚕️', name: 'Youth Medical Services' },
  ];

  return (
    <section id="office-hours" className="py-20 section-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="section-tag mb-3">Accessibility</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#1a2744' }}>
            Parish Office Days
          </h2>
          <div className="gold-line mb-5" />
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Our parish office is open to assist you with sacramental records, counselling referrals, and administrative needs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              <div className="px-6 py-4"
                style={{ background: 'linear-gradient(135deg, #1a2744, #2a3a5c)' }}>
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5" style={{ color: '#c9a84c' }} />
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Parish Office
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {clergyOfficeDays.map((member) => (
                    <li key={member.role} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                      <span className="font-semibold text-sm" style={{ color: '#1a2744' }}>{member.role}</span>
                      <span className="text-sm text-gray-600">{member.days}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #1a2744, #2a3a5c)' }}>
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Office Services
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {services.map((svc, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <span className="text-2xl flex-shrink-0">{svc.icon}</span>
                    <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>{svc.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: 'linear-gradient(135deg, #faf8f3, #fff)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <h4 className="font-bold text-base mb-4" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>
                Reach Us Directly
              </h4>
              <a href="tel:+2349070761824"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-50 transition-colors group">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,0.15)' }}>
                  <PhoneIcon className="w-4 h-4" style={{ color: '#a07830' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>+234 907 076 1824</p>
                </div>
              </a>
              <a href="mailto:holyrosaryabuja@catholic.ng"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-50 transition-colors group">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,0.15)' }}>
                  <MailIcon className="w-4 h-4" style={{ color: '#a07830' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>holyrosaryabuja@catholic.ng</p>
                </div>
              </a>
              <div className="flex items-start gap-3 p-3 rounded-lg">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,0.15)' }}>
                  <MapPinIcon className="w-4 h-4" style={{ color: '#a07830' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Address</p>
                  <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>
                    Mambolo Street, Wuse Zone 2,<br />Abuja 904101, Nigeria
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Contact / Map Section ────────────────────────────────────────────────────
const ContactSection = () => (
  <section id="contact" className="py-20 section-cream">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <p className="section-tag mb-3">Find Us</p>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#1a2744' }}>
          Visit Holy Rosary Church
        </h2>
        <div className="gold-line mb-5" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <a
          href="https://www.google.com/maps/search/?api=1&query=Holy+Rosary+Catholic+Church%2C+Wuse%2C+Zone+2%2C+Mambolo+St%2C+Wuse%2C+Abuja+900281%2C+Federal+Capital+Territory"
          target="_blank"
          rel="noreferrer"
          className="lg:col-span-3 rounded-2xl overflow-hidden shadow-xl block"
          style={{ height: 400 }}
          aria-label="Open Holy Rosary Catholic Church location in Google Maps"
        >
          <iframe
            title="Holy Rosary Catholic Church Location"
            src="https://www.google.com/maps?q=Holy+Rosary+Catholic+Church%2C+Wuse%2C+Zone+2%2C+Mambolo+St%2C+Wuse%2C+Abuja+900281%2C+Federal+Capital+Territory&z=17&output=embed"
            width="100%"
            height="400"
            style={{ border: 0, pointerEvents: 'none' }}
            allowFullScreen
            loading="lazy"
          />
        </a>

        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl p-6 shadow-lg bg-white">
            <h3 className="font-bold text-xl mb-5" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>
              Get in Touch
            </h3>
            <div className="space-y-5">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Holy+Rosary+Catholic+Church%2C+Wuse%2C+Zone+2%2C+Mambolo+St%2C+Wuse%2C+Abuja+900281%2C+Federal+Capital+Territory"
                target="_blank"
                rel="noreferrer"
                className="flex gap-4 block rounded-xl hover:bg-gray-50 transition-colors p-2 -m-2"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1a2744, #2a3a5c)' }}>
                  <MapPinIcon className="w-5 h-5" style={{ color: '#c9a84c' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Address</p>
                  <p className="font-medium text-gray-700">Holy Rosary Catholic Church, Wuse</p>
                  <p className="font-medium text-gray-700">Zone 2, Mambolo St, Wuse, Abuja 900281, Federal Capital Territory</p>
                </div>
              </a>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1a2744, #2a3a5c)' }}>
                  <PhoneIcon className="w-5 h-5" style={{ color: '#c9a84c' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Phone</p>
                  <a href="tel:+2349070761824" className="font-semibold text-gray-700 hover:underline"
                    style={{ color: '#1a2744' }}>
                    +234 907 076 1824
                  </a>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1a2744, #2a3a5c)' }}>
                  <MailIcon className="w-5 h-5" style={{ color: '#c9a84c' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Email</p>
                  <a href="mailto:holyrosaryabuja@catholic.ng"
                    className="font-semibold text-gray-700 hover:underline">
                    holyrosaryabuja@catholic.ng
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <a href="tel:+2349070761824" className="btn-gold w-full justify-center">
                <PhoneIcon className="w-4 h-4" />
                Call Us Now
              </a>
            </div>
          </div>

          <div className="rounded-2xl p-6 shadow-lg bg-white">
            <h4 className="font-bold text-sm mb-4" style={{ color: '#1a2744' }}>Follow Us Online</h4>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors hover:bg-gray-50"
                style={{ border: '1px solid #e5e7eb', color: '#1a2744' }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: 'rgba(212, 175, 55, 0.12)', color: '#d4af37' }}>
                  <InstagramIcon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium text-gray-600">Instagram</span>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors hover:bg-gray-50"
                style={{ border: '1px solid #e5e7eb', color: '#1a2744' }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: 'rgba(212, 175, 55, 0.12)', color: '#d4af37' }}>
                  <YouTubeIcon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium text-gray-600">YouTube</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = () => {
  const quickLinks = [
    { label: 'Mass Schedule', href: '#home' },
    { label: 'About Us', href: '#about' },
    { label: 'Parish Activities', href: '#activities' },
    { label: 'Parish Committees', href: '#committees' },
    { label: 'Parish Communities', href: '#community' },
    { label: 'Photo Gallery', href: '#gallery' },
    { label: 'Pastoral Team', href: '#priests' },
    { label: 'Contact Us', href: '#contact' },
  ];

  const massSchedule = [
    { day: 'Mon – Fri', time: '6:00 AM, 12:00 Noon, 6:00 PM' },
    { day: 'Saturday', time: '6:00 AM' },
    { day: 'Sunday', time: '6:00 AM, 8:00 AM, 8:15 AM (Children), 10:00 AM, 6:00 PM' },
    { day: 'Confession', time: 'Thur (6:30 AM/PM), Sat (6:30 AM)' },
  ];

  return (
    <footer>
      <div className="pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <img
                  src="/images/holy_rosary_seal_cutout.png"
                  alt="Holy Rosary Catholic Church Seal"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37] bg-[#f3e7bb] shadow-[0_0_0_2px_rgba(212,175,55,0.35)]"
                />
                <div>
                  <p className="text-white font-black text-lg leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Holy Rosary Catholic Church
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                A community of faith rooted in the love of Christ, the intercession of the Blessed Virgin Mary, and service to all God's people.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#c9a84c' }} />
                  <span className="text-gray-400 text-xs">Mambolo Street, Wuse Zone 2, Abuja 904101, Nigeria</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a84c' }} />
                  <a href="tel:+2349070761824" className="text-gray-400 text-xs hover:text-white transition-colors">
                    +234 907 076 1824
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MailIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#c9a84c' }} />
                  <a href="mailto:holyrosaryabuja@catholic.ng" className="text-gray-400 text-xs hover:text-white transition-colors">
                    holyrosaryabuja@catholic.ng
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-5 uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}
                      className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-2 group">
                      <span className="text-xs transition-transform group-hover:translate-x-1" style={{ color: '#c9a84c' }}>›</span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-5 uppercase tracking-wider">Mass Schedule</h4>
              <div className="space-y-3">
                {massSchedule.map((ms) => (
                  <div key={ms.day} className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold" style={{ color: '#c9a84c' }}>{ms.day}</span>
                    <span className="text-gray-400 text-xs">{ms.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-5 uppercase tracking-wider">Stay Connected</h4>
              <p className="text-gray-400 text-sm mb-4">
                Receive parish newsletters, event updates, and spiritual reflections directly to your inbox.
              </p>
              <div className="space-y-2 mb-5">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-white bg-white/10 border border-white/15 placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button className="btn-gold w-full justify-center text-xs py-2.5">
                  Subscribe to Newsletter
                </button>
              </div>
              <div className="flex gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(212, 175, 55, 0.12)', color: '#d4af37' }}
                  aria-label="Instagram"
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(212, 175, 55, 0.12)', color: '#d4af37' }}
                  aria-label="YouTube"
                >
                  <YouTubeIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-xs text-center sm:text-left">
                © {new Date().getFullYear()} Holy Rosary Catholic Church, Wuse Zone 2, Abuja. All rights reserved.
              </p>
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                Made by Valerian for Gods Glory.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ─── Scroll Animation Hook ────────────────────────────────────────────────────
const useScrollAnimation = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.fade-up, .fade-in');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

// ─── Back to Top Button ───────────────────────────────────────────────────────
const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      id="back-to-top"
      className={visible ? 'visible' : ''}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Proof of Payment Verification to top"
    >
      <ArrowUpIcon className="w-5 h-5" />
    </button>
  );
};

// ─── Dominus Dashboard ───────────────────────────────────────────────────────
const DominusDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [articles, setArticles] = useState<ParishArticle[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState(new Date().toISOString().slice(0, 10));
  const [draftDescription, setDraftDescription] = useState('');
  const getTodayInAbuja = () => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const [articleTitle, setArticleTitle] = useState('');
  const [articleAuthorName, setArticleAuthorName] = useState('');
  const [articleExcerpt, setArticleExcerpt] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [articlePublishDate, setArticlePublishDate] = useState(getTodayInAbuja);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [articleError, setArticleError] = useState('');
  const [articleMessage, setArticleMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [feastDays, setFeastDays] = useState<FeastDay[]>([]);
  const [feastTitle, setFeastTitle] = useState('');
  const [feastDate, setFeastDate] = useState(getTodayInAbuja());
  const [feastDescription, setFeastDescription] = useState('');
  const [feastCategory, setFeastCategory] = useState('Memorial');
  const [feastColor, setFeastColor] = useState('#16a34a');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryError, setGalleryError] = useState('');
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryMessage, setGalleryMessage] = useState('');

  const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

  const fetchAnnouncements = async () => {
    try {
      setAnnouncements(await adminApi.listAnnouncements());
    } catch {
      setAnnouncements([]);
    }
  };

  const fetchArticles = async () => {
    try {
      setArticles(await adminApi.listArticles());
    } catch {
      setArticleError('Unable to load articles. Refresh and try again.');
    }
  };

  const fetchFeastDays = async () => {
    try {
      setFeastDays(await adminApi.listFeastDays());
    } catch {
      setFeastDays([]);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      setGalleryImages(await adminApi.listGalleryImages());
    } catch {
      setGalleryError('Unable to load gallery images. Refresh and try again.');
    }
  };

  useEffect(() => {
    authApi.isAdmin()
      .then(setIsAuthenticated)
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchAnnouncements();
    void fetchArticles();
    void fetchFeastDays();
    void fetchGalleryImages();
  }, [isAuthenticated]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await authApi.signIn(loginData.username, loginData.password);
      setIsAuthenticated(true);
      setLoginError('');
      setLoginData({ username: '', password: '' });
    } catch (error) {
      setLoginError(errorMessage(error, 'Invalid login. Use the private Dominus credentials.'));
    }
  };

  const handleAddAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftTitle.trim() || !draftDescription.trim()) {
      return;
    }

    try {
      const created = await adminApi.createAnnouncement({
        title: draftTitle.trim(),
        description: draftDescription.trim(),
        date: draftDate || new Date().toISOString().slice(0, 10),
      });
      setAnnouncements((current) => [created, ...current]);
      setDraftTitle('');
      setDraftDescription('');
      setDraftDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to save announcement'));
    }
  };

  const handlePublishAnnouncement = async (id: number) => {
    try {
      await adminApi.publishAnnouncement(id);
      setAnnouncements((current) => current.map((item) => item.id === id ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish announcement'));
    }
  };

  const handlePublishAllDrafts = async () => {
    try {
      await adminApi.publishAllAnnouncements();
      setAnnouncements((current) => current.map((item) => item.status === 'Draft' ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish drafts'));
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await adminApi.deleteAnnouncement(id);
      setAnnouncements((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to delete announcement'));
    }
  };

  const handleAddFeastDay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!feastTitle.trim() || !feastDate) return;

    try {
      const created = await adminApi.createFeastDay({
        title: feastTitle.trim(),
        description: feastDescription.trim(),
        category: feastCategory,
        date: feastDate,
        color: feastColor,
      });
      setFeastDays((current) => [created, ...current]);
      setFeastTitle('');
      setFeastDescription('');
      setFeastDate(getTodayInAbuja());
      setFeastCategory('Memorial');
      setFeastColor('#16a34a');
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to save feast day'));
    }
  };

  const handlePublishFeastDay = async (id: number) => {
    try {
      await adminApi.publishFeastDay(id);
      setFeastDays((current) => current.map((item) => item.id === id ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish feast day'));
    }
  };

  const handlePublishAllFeastDrafts = async () => {
    try {
      await adminApi.publishAllFeastDays();
      setFeastDays((current) => current.map((item) => item.status === 'Draft' ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish feast drafts'));
    }
  };

  const handleDeleteFeastDay = async (id: number) => {
    try {
      await adminApi.deleteFeastDay(id);
      setFeastDays((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to delete feast day'));
    }
  };

  const handleGalleryFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (files.length === 0) return;
    setGalleryError('');
    setGalleryMessage('');
    setGallerySaving(true);
    const imageFiles = files.filter((file) => (
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      || /\.(jpe?g|png|webp)$/i.test(file.name)
    ));
    const failures: string[] = [];
    let uploaded = 0;
    for (const [index, file] of imageFiles.entries()) {
      if (file.size > 5 * 1024 * 1024) {
        failures.push(`${file.name} is larger than 5 MB`);
        continue;
      }
      try {
        const imageData = await compressGalleryImage(file);
        const caption = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Parish photo';
        const created = await adminApi.createGalleryImage({ caption, imageData });
        setGalleryImages((current) => [created, ...current]);
        uploaded += 1;
        setGalleryMessage(`Uploading photos: ${index + 1} of ${imageFiles.length} checked.`);
      } catch (error) {
        failures.push(`${file.name}: ${errorMessage(error, 'upload failed')}`);
      }
    }
    setGallerySaving(false);
    if (imageFiles.length === 0) {
      setGalleryError('The selected folder has no supported JPG, PNG, or WebP images.');
      return;
    }
    setGalleryMessage(`${uploaded} photo${uploaded === 1 ? '' : 's'} saved as drafts.`);
    if (failures.length > 0) setGalleryError(failures.slice(0, 5).join('. '));
  };

  const handleGalleryStatus = async (image: GalleryImage) => {
    try {
      if (image.status === 'Published') await adminApi.unpublishGalleryImage(image.id);
      else await adminApi.publishGalleryImage(image.id);
      setGalleryImages((current) => current.map((item) => item.id === image.id
        ? { ...item, status: item.status === 'Published' ? 'Draft' : 'Published', isFeatured: item.status === 'Published' ? false : item.isFeatured }
        : item));
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to update the gallery image.'));
    }
  };

  const handleFeatureGalleryImage = async (image: GalleryImage) => {
    try {
      await adminApi.featureGalleryImage(image.id);
      setGalleryImages((current) => current.map((item) => ({ ...item, isFeatured: item.id === image.id })));
      setGalleryMessage(`${image.caption} is now the featured display photo.`);
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to feature the gallery image.'));
    }
  };

  const handleDeleteGalleryImage = async (id: number) => {
    try {
      await adminApi.deleteGalleryImage(id);
      setGalleryImages((current) => current.filter((image) => image.id !== id));
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to delete the gallery image.'));
    }
  };

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArticleTitle('');
    setArticleAuthorName('');
    setArticleExcerpt('');
    setArticleBody('');
    setArticlePublishDate(getTodayInAbuja());
  };

  const handleSaveArticle = async (event: React.FormEvent) => {
    event.preventDefault();
    setArticleError('');
    setArticleMessage('');
    const input = {
      title: articleTitle,
      authorName: articleAuthorName,
      excerpt: articleExcerpt,
      body: articleBody,
      publishDate: articlePublishDate,
    };
    try {
      if (editingArticleId !== null) {
        const updated = await adminApi.updateArticle(editingArticleId, input);
        setArticles((current) => current.map((article) => article.id === updated.id ? updated : article));
      } else {
        const created = await adminApi.createArticle(input);
        setArticles((current) => [created, ...current]);
      }
      resetArticleForm();
      setArticleMessage('Article saved as a draft.');
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to save article draft.'));
    }
  };

  const handleEditArticle = (article: ParishArticle) => {
    setEditingArticleId(article.id);
    setArticleTitle(article.title);
    setArticleAuthorName(article.authorName);
    setArticleExcerpt(article.excerpt);
    setArticleBody(article.body);
    setArticlePublishDate(article.publishDate);
    setArticleError('');
    setArticleMessage('');
  };

  const handlePublishArticle = async (id: number) => {
    setArticleError('');
    setArticleMessage('');
    try {
      const updated = await adminApi.publishArticle(id);
      setArticles((current) => current.map((article) => article.id === id ? updated : article));
      setArticleMessage(updated.publishDate > getTodayInAbuja()
        ? `Article scheduled for ${updated.publishDate}.`
        : 'Article published to the parish blog.');
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to publish article.'));
    }
  };

  const handleDeleteArticle = async (id: number) => {
    setArticleError('');
    setArticleMessage('');
    try {
      await adminApi.deleteArticle(id);
      setArticles((current) => current.filter((article) => article.id !== id));
      if (editingArticleId === id) resetArticleForm();
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to delete article.'));
    }
  };

  const handleLogout = async () => {
    await authApi.signOut().catch(() => undefined);
    setIsAuthenticated(false);
    setAnnouncements([]);
    setArticles([]);
    setFeastDays([]);
  };

  if (!isAuthenticated) {
    if (loading) return <div role="status" style={{ padding: 32, color: '#1a2744' }}>Checking secure session...</div>;
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)',
        padding: '24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 25px 80px rgba(15, 23, 42, 0.3)',
          padding: 32,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b9952a', fontWeight: 700 }}>
              Private Access
            </p>
            <h1 style={{ margin: '12px 0 4px', color: '#1a2744', fontSize: 30, fontFamily: 'Playfair Display, serif' }}>
              Dominus
            </h1>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Username</label>
              <input
                type="text"
                autoComplete="username"
                value={loginData.username}
                onChange={(event) => setLoginData((current) => ({ ...current, username: event.target.value }))}
                placeholder="Enter your username"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #d8dce3', fontSize: 15 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={loginData.password}
                onChange={(event) => setLoginData((current) => ({ ...current, password: event.target.value }))}
                placeholder="Enter your password"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #d8dce3', fontSize: 15 }}
              />
            </div>

            {loginError && (
              <div style={{ background: '#fff1f2', color: '#b42318', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1px solid #fecdd3' }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #b9952a)',
                color: '#1a2744',
                border: 'none',
                borderRadius: 12,
                padding: '12px 18px',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Enter Dominus
            </button>
          </form>
        </div>
      </div>
    );
  }

  const drafts = announcements.filter((item) => item.status === 'Draft');
  const published = announcements.filter((item) => item.status === 'Published');
  const articleDrafts = articles.filter((article) => article.status === 'Draft');
  const publishedArticles = articles.filter((article) => article.status === 'Published');
  const feastDrafts = feastDays.filter((item) => item.status === 'Draft');
  const publishedFeastDays = feastDays.filter((item) => item.status === 'Published');

  const healthCards = [
    { label: 'Feast days', value: `${publishedFeastDays.length} published`, tone: '#16a34a' },
    { label: 'Announcements queue', value: `${drafts.length} pending`, tone: '#f59e0b' },
    { label: 'Website status', value: 'Online', tone: '#2563eb' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', color: '#1a2744', padding: '32px 20px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.18em', color: '#b9952a', fontWeight: 700, textTransform: 'uppercase' }}>
              Parish Operations
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: 38, fontFamily: 'Playfair Display, serif' }}>Dominus Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
          >
            Sign out
          </button>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 28 }}>
          {healthCards.map((item) => (
            <div key={item.label} style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 10px 28px rgba(26,39,68,0.06)' }}>
              <div style={{ color: item.tone, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{item.label}</div>
              <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800 }}>{item.value}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Add parish announcement</h2>
            <form onSubmit={handleAddAnnouncement} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Title</label>
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #dfe4ee' }} placeholder="Youth Retreat & Recollection" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Date</label>
                <input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #dfe4ee' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Description</label>
                <textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} rows={5} style={{ width: '100%', resize: 'vertical', padding: '12px 14px', borderRadius: 10, border: '1px solid #dfe4ee' }} placeholder="Share the parish notice, purpose, and schedule." />
              </div>

              <button type="submit" style={{ background: 'linear-gradient(135deg, #d4af37, #b9952a)', border: 'none', borderRadius: 12, padding: '12px 18px', fontWeight: 800, color: '#1a2744', cursor: 'pointer' }}>
                Save as draft
              </button>
            </form>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Draft queue</h2>
              <button
                type="button"
                onClick={handlePublishAllDrafts}
                disabled={drafts.length === 0}
                style={{
                  background: drafts.length ? '#1a2744' : '#dfe4ee',
                  color: drafts.length ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 700,
                  cursor: drafts.length ? 'pointer' : 'not-allowed',
                }}
              >
                Publish all drafts
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {drafts.length === 0 ? (
                <div style={{ border: '1px dashed #dfe4ee', borderRadius: 12, padding: 16, color: '#64748b', background: '#fafbfd' }}>
                  No drafts waiting to be published.
                </div>
              ) : drafts.map((item) => (
                <div key={item.id} style={{ border: '1px solid #edf0f6', borderRadius: 14, padding: 14, background: '#fafbfd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16 }}>{item.title}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#fff7ed', color: '#c2410c', padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{item.status}</span>
                      <button
                        type="button"
                        onClick={() => handlePublishAnnouncement(item.id)}
                        style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, color: '#475569', fontSize: 13 }}>{item.date}</div>
                  <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Memories</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>Photo Gallery</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              Select a folder of photos to add them to the gallery. Publish the photos you want visitors to see, then choose one as the featured display photo.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Choose a photo folder
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                ref={(element) => {
                  if (element) {
                    element.setAttribute('webkitdirectory', '');
                    element.setAttribute('directory', '');
                  }
                }}
                onChange={(event) => void handleGalleryFolderUpload(event)}
                disabled={gallerySaving}
              />
            </label>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
              JPG, PNG, and WebP files up to 5 MB each are accepted. Images are optimized before saving to the site database. Uploaded images start as drafts.
            </p>
            {galleryError && <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>{galleryError}</p>}
            {galleryMessage && <p role="status" style={{ margin: 0, color: '#166534', fontSize: 13 }}>{galleryMessage}</p>}
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Gallery photos</h3>
            {galleryImages.length === 0 ? <p style={{ margin: 0, color: '#64748b' }}>No gallery photos uploaded yet.</p> : galleryImages.map((image) => (
              <div key={image.id} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                <img src={image.thumbnailUrl} alt="" style={{ width: 88, height: 66, borderRadius: 8, objectFit: 'cover' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{image.caption}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{image.isFeatured ? 'Featured display photo · ' : ''}{image.status}</div>
                </div>
                {image.status === 'Published' && !image.isFeatured && (
                  <button type="button" onClick={() => void handleFeatureGalleryImage(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>
                    Set as display photo
                  </button>
                )}
                <button type="button" onClick={() => void handleGalleryStatus(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: image.status === 'Published' ? '#fef3c7' : '#dcfce7', color: image.status === 'Published' ? '#92400e' : '#166534' }}>
                  {image.status === 'Published' ? 'Unpublish' : 'Publish'}
                </button>
                <button type="button" onClick={() => void handleDeleteGalleryImage(image.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Published announcements</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {published.length === 0 ? (
              <div style={{ border: '1px dashed #dfe4ee', borderRadius: 12, padding: 16, color: '#64748b', background: '#fafbfd' }}>
                No published announcements yet.
              </div>
            ) : published.map((item) => (
              <div key={item.id} style={{ border: '1px solid #ecfdf5', borderRadius: 14, padding: 14, background: '#f0fdf4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}>{item.title}</strong>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{item.status}</span>
                </div>
                <div style={{ marginTop: 8, color: '#475569', fontSize: 13 }}>{item.date}</div>
                <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Liturgical Calendar</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>Feast & Saint Days</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 22 }}>
            <form onSubmit={handleAddFeastDay} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Add feast day</h3>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Title
                <input required maxLength={200} value={feastTitle} onChange={(event) => setFeastTitle(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="e.g. Our Lady of the Rosary" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Date
                <input required type="date" value={feastDate} onChange={(event) => setFeastDate(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Category
                <select value={feastCategory} onChange={(event) => setFeastCategory(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }}>
                  {['Solemnity', 'Feast', 'Memorial', 'Saint', 'Optional'].map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <div style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                <span>Color of the day</span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {feastColorOptions.map((option) => {
                    const selected = feastColor === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setFeastColor(option.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8,
                          border: selected ? '2px solid #1a2744' : '1px solid #dfe4ee', background: '#fff', cursor: 'pointer', fontWeight: 700,
                        }}
                      >
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: option.value, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Description
                <textarea maxLength={2000} rows={3} value={feastDescription} onChange={(event) => setFeastDescription(event.target.value)} style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="Optional note shown on the public card." />
              </label>
              <button type="submit" style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }}>Save feast day</button>
            </form>

            <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Feast day drafts</h3>
                  <button
                    type="button"
                    onClick={handlePublishAllFeastDrafts}
                    disabled={feastDrafts.length === 0}
                    style={{
                      background: feastDrafts.length ? '#1a2744' : '#dfe4ee',
                      color: feastDrafts.length ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      cursor: feastDrafts.length ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Publish all
                  </button>
                </div>
                {feastDrafts.length === 0 ? <p style={{ color: '#64748b' }}>No feast day drafts yet.</p> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {feastDrafts.map((item) => (
                      <article key={item.id} style={{ border: '1px solid #e5e9f0', borderRadius: 8, padding: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                          <div>
                            <strong>{item.title}</strong>
                            <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>{item.date} · {item.category}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} title={feastColorLabels[item.color] || 'Liturgical color'} />
                            <button type="button" onClick={() => void handlePublishFeastDay(item.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#dcfce7', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>Publish</button>
                            <button type="button" onClick={() => void handleDeleteFeastDay(item.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                          </div>
                        </div>
                        {item.description && <p style={{ margin: '9px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>{item.description}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Published feast days</h3>
                {publishedFeastDays.length === 0 ? <p style={{ color: '#64748b' }}>Published feast days will appear here.</p> : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {publishedFeastDays.map((item) => (
                      <div key={item.id} style={{ borderLeft: '3px solid #d4af37', padding: '6px 0 6px 10px' }}>
                        <strong>{item.title}</strong>
                        <div style={{ marginTop: 3, color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.date} · {item.category}
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                          {feastColorLabels[item.color] || 'Liturgical'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Blog</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>Articles</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 22 }}>
            <form onSubmit={handleSaveArticle} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{editingArticleId ? 'Edit article draft' : 'Write an article'}</h3>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Title
                <input required maxLength={200} value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="Article title" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Writer name
                <input required maxLength={100} value={articleAuthorName} onChange={(event) => setArticleAuthorName(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="Name shown on the article" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Short introduction
                <textarea required maxLength={400} rows={3} value={articleExcerpt} onChange={(event) => setArticleExcerpt(event.target.value)} style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="A brief preview shown on the blog." />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Article
                <textarea required maxLength={30000} rows={10} value={articleBody} onChange={(event) => setArticleBody(event.target.value)} style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400, lineHeight: 1.6 }} placeholder="Write the full article here. Separate paragraphs with a blank line." />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Publish date
                <input required type="date" value={articlePublishDate} onChange={(event) => setArticlePublishDate(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} />
              </label>
              {articleError && <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>{articleError}</p>}
              {articleMessage && <p role="status" style={{ margin: 0, color: '#166534', fontSize: 13 }}>{articleMessage}</p>}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }}>
                  {editingArticleId ? 'Update draft' : 'Save draft'}
                </button>
                {editingArticleId && <button type="button" onClick={resetArticleForm} style={{ background: '#eef2f7', color: '#1a2744', border: 'none', borderRadius: 8, padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }}>Cancel edit</button>}
              </div>
            </form>

            <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
              <article style={{ border: '1px solid #e5e9f0', borderRadius: 8, padding: 16, background: '#faf8f3' }}>
                <p style={{ margin: '0 0 10px', color: '#a07830', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Live article preview</p>
                <h3 style={{ margin: '0 0 8px', color: '#1a2744', fontSize: 22, fontFamily: 'Playfair Display, serif' }}>{articleTitle || 'Your article title'}</h3>
                <p style={{ margin: '0 0 8px', color: '#a07830', fontSize: 13, fontWeight: 700 }}>By {articleAuthorName || 'Writer name'}</p>
                <p style={{ margin: '0 0 12px', color: '#a07830', fontSize: 12 }}>{articlePublishDate}</p>
                <p style={{ margin: '0 0 14px', color: '#475569', lineHeight: 1.6 }}>{articleExcerpt || 'Your short introduction will appear here.'}</p>
                <div style={{ borderTop: '1px solid #e5dcc4', paddingTop: 12, color: '#334155', lineHeight: 1.7 }}>
                  {articleBody
                    ? <ParishArticleMarkdown source={articleBody} />
                    : <p style={{ margin: 0, color: '#64748b' }}>Your article text will appear here as you write.</p>}
                </div>
              </article>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Drafts</h3>
                {articleDrafts.length === 0 ? <p style={{ color: '#64748b' }}>No article drafts yet.</p> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {articleDrafts.map((article) => (
                      <article key={article.id} style={{ border: '1px solid #e5e9f0', borderRadius: 8, padding: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                          <div><strong>{article.title}</strong><div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>Planned: {article.publishDate}</div></div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => handleEditArticle(article)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#eef2f7', color: '#1a2744', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                            <button type="button" onClick={() => void handlePublishArticle(article.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#dcfce7', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>Publish</button>
                            <button type="button" onClick={() => void handleDeleteArticle(article.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                          </div>
                        </div>
                        <p style={{ margin: '9px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>{article.excerpt}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Published and scheduled</h3>
                {publishedArticles.length === 0 ? <p style={{ color: '#64748b' }}>Published articles will be archived here.</p> : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {publishedArticles.map((article) => (
                      <div key={article.id} style={{ borderLeft: '3px solid #d4af37', padding: '6px 0 6px 10px' }}>
                        <strong>{article.title}</strong>
                        <div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>{article.publishDate}{article.publishDate > getTodayInAbuja() ? ' · Scheduled' : ' · On blog'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  useScrollAnimation();
  const isDominusRoute = typeof window !== 'undefined' && (window.location.pathname === '/dominus' || window.location.pathname.startsWith('/dominus/'));

  if (isDominusRoute) {
    return <DominusDashboard />;
  }

  return (
    <div className="min-h-screen">
      <div>
        <Navbar />
        <HeroSection />
        <AboutSection />
        <ActivitiesSection />
        <CommitteesSection />
        <CommunitySection />
        <EventsSection />
        <GallerySection />
        <ArticlesSection />
        <PastoralTeamSection />
        <OfficeHoursSection />
        <ContactSection />
        <Footer />
      </div>
      <BackToTop />
    </div>
  );
}