import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { publicApi, authApi, adminApi } from './lib/api';
import type { Announcement, ParishArticle, FeastDay, GalleryAlbum, GalleryAlbumDetail, GalleryImage, PastoralImageKey, PastoralImages, PastoralTeam, PastoralTeamMember, ParishCommittee, CommunityGroupKey, CommunityItem, ParishCommunities } from './lib/api';

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

const UsersIcon = ({ className = '', style }: IconProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
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
    { label: 'Pastoral Team', href: '#priests' },
    { label: 'Article Board', href: '#articles' },
    { label: 'Photo Gallery', href: '#gallery' },
    { label: 'Office Hours', href: '#office-hours' },
    { label: 'Upcoming Events', href: '#events' },
    { label: 'Contact Us', href: '#contact' },
  ];

  const allNavLinks = [
    ...primaryNavLinks,
    { label: 'Pastoral Team', href: '#priests' },
    { label: 'Article Board', href: '#articles' },
    { label: 'Photo Gallery', href: '#gallery' },
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
    { day: 'Saturday Mass', times: ['7:00 AM'] },
    { day: 'Sunday Mass', times: ['6:00 AM', '8:00 AM', '8:15 AM (Children)', '10:00 AM', '6:00 PM'] },
  ];

  const sacramentTimes = [
    { day: 'Confession', times: ['Thursdays: 6:30 AM & 6:30 PM', 'Saturdays: 7:30 AM'] },
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
            Rosarians, <br />
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
const ActivitiesSection = () => {
  const activities = [
    {
      icon: <UsersIcon className="w-7 h-7 text-white" />,
      title: 'Catholic Youth Organization (CYON)',
      description: 'A parish community for young people to grow in faith, fellowship, and service.',
      schedule: '1st Sunday after 8:00 AM Mass',
      tag: 'Youth',
    },
    {
      icon: <BookIcon className="w-7 h-7 text-white" />,
      title: "Children's Ministry",
      description: 'Faith formation, catechism, and liturgy for children.',
      schedule: "Sundays during Children's Mass at 8:15 AM",
      tag: 'Children',
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
      schedule: '1st Saturday of the Month: 7:00 AM',
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
              className="card group transition-all duration-300"
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
    </section>
  );
};

// ─── Parish Committees Section ────────────────────────────────────────────────
const defaultCommittees: ParishCommittee[] = [
    {
      id: 'liturgy',
      name: 'Liturgy Committee',
      category: 'liturgical',
      meeting: 'As scheduled by the committee',
      description: 'Headed by the Parish Priest (PP), the committee coordinates and supports the parish liturgical celebrations.',
    },
    {
      id: 'lectors',
      name: 'Board of Lectors',
      category: 'liturgical',
      meeting: '1st & 3rd Saturdays, 5:00 PM',
      description: 'Dedicated to prayerful study, diction preparation, and the reverent proclamation of Sacred Scripture during all liturgical celebrations.',
    },
    {
      id: 'choir',
      name: 'Parish Choir',
      category: 'liturgical',
      meeting: 'Weekly rehearsals by individual choirs',
      description: 'Coordinating sacred liturgical music across all parish Masses through four active choirs:',
      choirList: [
        'Choral de Angelis | Rehearsals: Tuesday at 5:00 PM and Saturday at 5:00 PM',
        'All Saints Choir | Rehearsals: Sunday at 10:30 AM & Saturday at 5:00 PM',
        'St. Gregory | Rehearsals: Tuesday at 5:00 PM and Saturday at 6:00 PM',
        "Children's Choir | Rehearsals: Friday and Saturday at 4:00 PM",
      ],
    },
    {
      id: 'altar-knights',
      name: 'Altar Knights',
      category: 'liturgical',
      meeting: 'Every Saturday, 8:00 AM',
      description: 'Guiding altar servers in reverence, discipline, liturgical decorum, and assisting the priests during Masses and solemn processions.',
    },
    {
      id: 'church-wardens',
      name: 'Board of Church Wardens',
      category: 'non-liturgical',
      meeting: '2nd Sunday of the month after 10:00 AM Mass',
      description: 'Ensuring reverent order and hospitality in church, assisting elderly and visitors, coordinating offertory processions, and maintaining sanctuary decorum.',
    },
    {
      id: 'communications',
      name: 'Communications Committee',
      category: 'non-liturgical',
      meeting: 'Last Tuesday of the month, 6:30 PM',
      description: 'Manages information dissemination and communication activities, monthly bulletin publication, parish announcements, and website updates.',
    },
    {
      id: 'finance',
      name: 'Finance Committee',
      category: 'non-liturgical',
      meeting: 'As scheduled by the committee',
      description: 'Supports the responsible planning, management, and reporting of parish finances.',
    },
    {
      id: 'security',
      name: 'Security Committee',
      category: 'non-liturgical',
      meeting: 'As scheduled by the committee',
      description: 'Supports a safe and secure environment for parishioners, visitors, and parish activities.',
    },
  ];

const CommitteesSection = () => {
  const [filter, setFilter] = useState<'all' | 'liturgical' | 'non-liturgical'>('all');
  const [committees, setCommittees] = useState<ParishCommittee[]>(defaultCommittees);

  useEffect(() => {
    publicApi.committees()
      .then((saved) => { if (saved) setCommittees(saved); })
      .catch((error: unknown) => console.error('Unable to load parish committee updates.', error));
  }, []);

  const displayed =
    filter === 'liturgical'
      ? committees.filter((item) => item.category === 'liturgical')
      : filter === 'non-liturgical'
      ? committees.filter((item) => item.category === 'non-liturgical')
      : committees;

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
          {displayed.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/80 hover:shadow-md hover:border-amber-400/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      c.category === 'liturgical'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                    }`}
                  >
                    {c.category === 'liturgical' ? 'Liturgical Committee' : 'Non-Liturgical Committee'}
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Community (Societies) Section ────────────────────────────────────────────
const defaultCommunities: ParishCommunities = {
  organizations: [
    { id: 'cmo', name: 'Catholic Men Organization (CMO)', meeting: 'Every Second Saturday', thanksgiving: 'Every Second Sunday' },
    { id: 'cwo', name: 'Catholic Women Organization (CWO)', meeting: 'Every First Saturday', thanksgiving: 'First Sunday after 10AM Mass' },
    { id: 'cyon', name: 'Catholic Youth Organization (CYON)', meeting: 'Third Sunday after 8AM Mass', thanksgiving: 'Third Sunday at 8AM Mass' },
    { id: 'children-ministry', name: 'Childrens Ministry', meeting: 'Sundays at 8:15am during Children\'s Mass', subtitle: 'Faith formation, catechism & liturgy for children' },
    { id: 'ppc', name: 'Parish Pastoral Council (PPC)', meeting: 'Monthly Executive & General Assembly', subtitle: 'Parish consultative & pastoral governance council' },
  ],
  societies: [
    { id: 'eucharistic-adorers', name: 'Eucharistic Adorers', meeting: 'Mondays, 5:00 PM' },
    { id: 'purgatorian-society', name: 'Purgatorian Society', meeting: 'Mondays, 5:00 PM' },
    { id: 'st-jude', name: 'St. Jude Society', meeting: 'Wednesdays, 5:00 PM' },
    { id: 'infant-jesus', name: 'Infant Jesus of Prague', meeting: 'Novena: 16th–24th, 9-day monthly novena' },
    { id: 'rosa-mistica', name: 'Rosa Mistica' },
    { id: 'legion-of-mary', name: 'Legion of Mary' },
    { id: 'holy-family', name: 'Holy Family' },
    { id: 'blue-army', name: 'Blue Army' },
    { id: 'queen-of-all-hearts', name: 'Queen of All Hearts' },
    { id: 'sacred-heart-association', name: 'Association of Sacred Heart of Jesus' },
    { id: 'block-rosary', name: 'Block Rosary' },
    { id: 'precious-blood', name: 'Precious Blood' },
    { id: 'st-anthony-guild', name: 'Guild of St. Anthony of Padua' },
    { id: 'apostleship-sacred-heart', name: 'Apostleship of Sacred Heart of Jesus' },
    { id: 'rosary-confraternity', name: 'Confraternity of the Most Holy Rosary' },
    { id: 'our-lady-help', name: 'Our Lady Help of Christians Ministry' },
    { id: 'st-rita', name: 'St. Rita of Cascia' },
    { id: 'divine-mercy', name: 'Divine Mercy Devotees' },
    { id: 'daughters-of-mary', name: 'Catholic Daughters of Mary' },
    { id: 'sisters-united', name: 'Catholic Sisters United' },
    { id: 'christian-mothers', name: 'Confraternity of Christian Mothers' },
    { id: 'st-vincent-de-paul', name: 'St. Vincent de Paul' },
    { id: 'st-monica', name: 'St. Monica Society' },
    { id: 'perpetual-help', name: 'Confraternity of Our Mother of Perpetual Help' },
    { id: 'dove-of-peace', name: 'Dove of Peace Charismatic Community' },
    { id: 'associate-missionary', name: 'Associate Missionary of St. Paul' },
  ],
  knighthood: [
    { id: 'knights-st-mulumba', name: 'Knights & Ladies of St. Mulumba', subtitle: 'Order of the Knights of Saint Mulumba Nigeria (KSM / LSM)', meeting: '3rd Saturday of the month' },
    { id: 'knights-st-john', name: 'Knights of St. John International {Commandery #653} & Ladies Auxiliary {Commandery #577} (KSJI / LAUX)', subtitle: '', meeting: '3rd Saturday of the month' },
  ],
  states: [
    {
      id: 'st-anthony-community',
      name: 'St. Anthony Catholic Community',
      states: 'Benue/Kogi',
      time: 'Last Sunday of every month',
      details: {
        formalName: 'St. Anthony Benue/Kogi Catholic Community, Holy Rosary Catholic Church Wuse',
        audience: 'For parishioners from Benue and Kogi States.',
        leadership: 'Headed by elected executives.',
        patronSaintDay: '13th June.',
        whatWeDo: 'Visit the sick, support the needy, celebrate with members in times of joy, and check up on members who have been away from meetings for a long period without prior notice.',
      },
    },
    {
      id: 'blessed-iwene-tansi',
      name: 'Blessed Iwene Tansi',
      states: 'Anambra/Enugu/Parts of Ebonyi',
      time: '2nd Sunday of the month',
      details: {
        audience: 'For parishioners from Anambra, Enugu and parts of Ebonyi States.',
        slogan: 'Iwene Tansi di Ngozi, Yobala anyi ayiyo: Blessed Iwene Tansi, pray for us.',
        mantra: "O nuru ube nwanne agbakwana oso, Ofu obi ka anyi ji aga: Do not ignore a brother/sister's cry, we move with one spirit.",
        mission: 'Grow together in Catholic faith like the early Christians in Acts 2, verses 44 to 47, in love, unity and care.',
        whatWeDo: 'Pray and study Catechism in Igbo, share food at monthly meetings, support members in sorrow and joy, pay levies promptly, and join all Parish feasts, harvest, retreats and prayers.',
      },
    },
    {
      id: 'st-michael-yoruba',
      name: 'St. Michael Yoruba Catholic Community',
      states: 'Ekiti/Ogun/Osun/Oyo/Ondo/Kwara/Kogi/Lagos',
      time: 'Last Sunday of every month',
      details: {
        formalName: 'St. Michael Yoruba Catholic Community, Holy Rosary Catholic Church Wuse Zone 2',
        audience: 'For parishioners from Ekiti, Ogun, Osun, Oyo, Ondo, Kwara, Kogi and Lagos.',
        meetingPlace: 'Civic Center.',
        mission: 'Participate actively in all Parish programs and serve in other societies in the Parish.',
        whatWeDo: 'Pray the Novena to St. Michael from 20th to 28th September and celebrate St. Michael Day and Thanksgiving on 29th September. Join the Feast Day, Retreats, Cathedraticum, Harvest and Bazaar, Lenten Retreat, corporal works of mercy and quarterly Archdiocesan Meeting. Serve in Sacred Heart, St. Anthony, CWO, CMO, the Choir and other societies.',
      },
    },
    { id: 'st-peter-community', name: 'St. Peter Catholic Community', states: 'Akwa Ibom/Bayelsa/Cross River/Rivers', time: '1st Sunday of the month' },
    { id: 'st-patrick-community', name: 'St. Patrick Catholic Community', states: 'Edo/Delta', time: '2nd Sunday of the month' },
    { id: 'st-raphael-community', name: 'St. Raphael Catholic Community', states: 'Imo/Abia/Parts of Ebonyi', time: '2nd Sunday of the month' },
    {
      id: 'saint-gabriel-arewa',
      name: 'Saint Gabriel Arewa Catholic Community',
      states: 'All Northern States',
      time: 'Last Sunday of every month, after 8:00 AM Mass',
      details: {
        formalName: 'Saint Gabriel Arewa Northern Catholic Community of Holy Rosary Catholic Church, Wuse Zone 2',
        audience: 'For parishioners from the 18 Northern States.',
        members: '40 registered members.',
        meetingPlace: 'Civic Centre opposite the Church.',
        mission: 'Foster unity, fellowship, empowerment and support for members.',
        whatWeDo: 'Pray the Novena to St. Gabriel from 20th to 28th September and celebrate Thanksgiving on 29th September. Join parish programs such as Feast Day, Retreats, Cathedraticum, Harvest and Bazaar, and serve actively in CYON, CWO, CMO, the Choir and other societies.',
      },
    },
  ],
};

const CommunitySection = () => {
  const [activeTab, setActiveTab] = useState<'organizations' | 'societies' | 'knighthood' | 'states'>('organizations');
  const [groups, setGroups] = useState<ParishCommunities>(defaultCommunities);
  const [expandedAssociations, setExpandedAssociations] = useState<Record<string, boolean>>({});
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({
    organizations: false,
    societies: false,
    knighthood: false,
    states: false,
  });

  useEffect(() => {
    publicApi.communities()
      .then((saved) => { if (saved) setGroups(saved); })
      .catch((error: unknown) => console.error('Unable to load parish community updates.', error));
  }, []);

  const initialCounts: Record<string, number> = {
    organizations: 4,
    societies: 4,
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
                key={item.id}
                className="p-5 rounded-lg transition-all duration-300 hover:border-amber-500/30"
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
                  {activeTab === 'states' && (
                    <>
                      <button
                        type="button"
                        aria-expanded={!!expandedAssociations[item.name]}
                        aria-controls={`association-details-${i}`}
                        onClick={() => setExpandedAssociations((previous) => ({
                          ...previous,
                          [item.name]: !previous[item.name],
                        }))}
                        className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                      >
                        {expandedAssociations[item.name] ? 'Read less' : 'Read more'}
                      </button>
                      {expandedAssociations[item.name] && (
                        <div
                          id={`association-details-${i}`}
                          className="mt-3 space-y-3 border-t border-white/10 pt-3 text-sm text-gray-200"
                        >
                          {item.details ? (
                            <>
                              {item.details.formalName && (
                                <p className="font-semibold text-white">{item.details.formalName}</p>
                              )}
                              <p>{item.details.audience}</p>
                              {item.details.members && <p>{item.details.members}</p>}
                              {item.details.leadership && (
                                <p>
                                  <span className="font-semibold text-amber-200">Leadership: </span>
                                  {item.details.leadership}
                                </p>
                              )}
                              {item.details.patronSaintDay && (
                                <p>
                                  <span className="font-semibold text-amber-200">Patron Saint Day: </span>
                                  {item.details.patronSaintDay}
                                </p>
                              )}
                              {item.details.meetingPlace && (
                                <p>
                                  <span className="font-semibold text-amber-200">Meeting place: </span>
                                  {item.details.meetingPlace}
                                </p>
                              )}
                              {item.details.slogan && (
                                <p>
                                  <span className="font-semibold text-amber-200">Slogan: </span>
                                  {item.details.slogan}
                                </p>
                              )}
                              {item.details.mantra && (
                                <p>
                                  <span className="font-semibold text-amber-200">Mantra: </span>
                                  {item.details.mantra}
                                </p>
                              )}
                              {item.details.mission && (
                                <p>
                                  <span className="font-semibold text-amber-200">Mission: </span>
                                  {item.details.mission}
                                </p>
                              )}
                              <p>
                                <span className="font-semibold text-amber-200">What We Do: </span>
                                {item.details.whatWeDo}
                              </p>
                            </>
                          ) : (
                            <p>More information about this association will be added soon.</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
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
                    {activeTab === 'societies' ? 'See More' : 'View More'} {tabLabels[activeTab]} ({allItems.length - limit} more)
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
  const previewImages = images.slice(0, 6);

  useEffect(() => {
    if (activeImageIndex === null) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveImageIndex(null);
      if (event.key === 'ArrowRight') setActiveImageIndex((index) => index === null ? null : (index + 1) % previewImages.length);
      if (event.key === 'ArrowLeft') setActiveImageIndex((index) => index === null ? null : (index - 1 + previewImages.length) % previewImages.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, previewImages.length]);

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
          : loading ? <p className="text-center text-gray-600">Loading parish photos...</p>
          : previewImages.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {previewImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageIndex(index)}
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
          ) : <p className="text-center text-gray-600">Parish photos will appear here soon.</p>}
        <div className="mt-10 text-center">
          <a href="/gallery" className="btn-gold inline-flex">See More Gallery Albums</a>
        </div>
      </div>
      {activeImageIndex !== null && previewImages[activeImageIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Parish photo viewer"
          onClick={() => setActiveImageIndex(null)}
        >
          <button type="button" onClick={() => setActiveImageIndex(null)} aria-label="Close photo viewer" className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-2xl text-white hover:bg-white/25">×</button>
          {previewImages.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + previewImages.length) % previewImages.length); }} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25 sm:left-6">‹</button>}
          <div className="flex max-h-full max-w-6xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <img src={previewImages[activeImageIndex].thumbnailUrl} alt={previewImages[activeImageIndex].caption} className="max-h-[78vh] max-w-full rounded-lg object-contain" />
            <p className="m-0 text-center text-lg font-semibold text-white">{previewImages[activeImageIndex].caption}</p>
            <p className="m-0 text-sm text-white/70">{activeImageIndex + 1} of {previewImages.length}</p>
          </div>
          {previewImages.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % previewImages.length); }} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25 sm:right-6">›</button>}
        </div>
      )}
    </section>
  );
};

const GalleryPage = ({ albumSlug }: { albumSlug?: string }) => {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [album, setAlbum] = useState<GalleryAlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryError, setGalleryError] = useState('');
  const [search, setSearch] = useState('');
  const [albumSort, setAlbumSort] = useState<'newest' | 'oldest'>('newest');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setGalleryError('');
    if (albumSlug) {
      publicApi.galleryAlbum(albumSlug)
        .then((result) => { if (active) setAlbum(result); })
        .catch((error: unknown) => { if (active) setGalleryError(error instanceof Error ? error.message : 'Unable to load this album.'); })
        .finally(() => { if (active) setLoading(false); });
    } else {
      publicApi.galleryAlbums()
        .then((result) => { if (active) setAlbums(result); })
        .catch((error: unknown) => { if (active) setGalleryError(error instanceof Error ? error.message : 'Unable to load gallery albums.'); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [albumSlug]);

  useEffect(() => {
    if (activeImageIndex === null || !album) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveImageIndex(null);
      if (event.key === 'ArrowRight') setActiveImageIndex((index) => index === null ? null : (index + 1) % album.photos.length);
      if (event.key === 'ArrowLeft') setActiveImageIndex((index) => index === null ? null : (index - 1 + album.photos.length) % album.photos.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, album]);

  const visibleAlbums = albums
    .filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()))
    .slice()
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const aDate = a.date || a.createdAt;
      const bDate = b.date || b.createdAt;
      return albumSort === 'newest' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
    });
  const displayDate = (value: string) => {
    if (!value) return 'Date not specified';
    const parsedDate = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsedDate.getTime())
      ? 'Date not specified'
      : parsedDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      <header className="bg-[#1a2744] px-4 py-4 text-white shadow-lg sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href="/" className="font-serif text-lg font-bold sm:text-xl">Holy Rosary Catholic Church</a>
          <a href="/#gallery" className="text-sm font-semibold text-amber-300 hover:text-amber-200">Back to Home</a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {albumSlug && (
          <a href="/gallery" className="mb-6 inline-flex items-center gap-2 font-semibold text-[#1a2744] hover:text-amber-700">
            <span aria-hidden="true">←</span> Back to Gallery
          </a>
        )}
        {galleryError ? (
          <p role="alert" className="rounded-xl bg-white p-6 text-center text-gray-700 shadow-sm">{galleryError}</p>
        ) : loading ? (
          <p role="status" className="text-center text-gray-600">Loading gallery...</p>
        ) : albumSlug && album ? (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="m-0 font-serif text-3xl font-bold text-[#1a2744] sm:text-4xl">{album.title}</h1>
                {album.isFeatured && <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950">Featured album</span>}
              </div>
              <p className="mt-2 text-sm text-gray-600">{displayDate(album.date)} · {album.photoCount} {album.photoCount === 1 ? 'Photo' : 'Photos'}</p>
              {album.description && <p className="mt-3 max-w-3xl leading-relaxed text-gray-700">{album.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {album.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`View ${photo.caption}`}
                  className="group relative overflow-hidden rounded-xl bg-white p-0 text-left shadow-md focus:outline-none focus:ring-4 focus:ring-amber-400"
                >
                  <img src={photo.thumbnailUrl} alt={photo.caption} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  {photo.isFeatured && <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-slate-950 sm:left-3 sm:top-3 sm:text-xs">Featured photo</span>}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-sm font-semibold text-white">{photo.caption}</span>
                </button>
              ))}
            </div>
          </>
        ) : albumSlug ? (
          <p className="text-center text-gray-600">This gallery album could not be found.</p>
        ) : (
          <>
            <div className="mb-10 text-center">
              <p className="section-tag mb-3">Memories</p>
              <h1 className="font-serif text-3xl font-bold text-[#1a2744] sm:text-4xl">Photo Gallery</h1>
              <div className="gold-line my-6" />
              <p className="mx-auto max-w-2xl text-gray-600">Browse parish photos grouped by event.</p>
            </div>
            <div className="mx-auto mb-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label>
                <span className="sr-only">Search albums by event name</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Search events..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#1a2744] shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-[#1a2744] shadow-sm">
                <span>Sort</span>
                <select value={albumSort} onChange={(event) => setAlbumSort(event.currentTarget.value === 'oldest' ? 'oldest' : 'newest')} className="min-w-0 flex-1 bg-transparent py-3 outline-none">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
            {visibleAlbums.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleAlbums.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-md">
                    <a href={`/gallery/${encodeURIComponent(item.slug)}`} className="group relative block aspect-[4/3] overflow-hidden bg-[#e8e4d8]">
                      {item.coverImage ? (
                        <img src={item.coverImage.thumbnailUrl} alt={`${item.title} album cover`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">Album cover coming soon</div>
                      )}
                      {item.isFeatured && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950">Featured album</span>}
                    </a>
                    <div className="p-5">
                      <h2 className="font-serif text-xl font-bold text-[#1a2744]">{item.title}</h2>
                      <p className="mt-1 text-sm text-gray-500">{displayDate(item.date)} · {item.photoCount} {item.photoCount === 1 ? 'Photo' : 'Photos'}</p>
                      {item.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-600">{item.description}</p>}
                      <a href={`/gallery/${encodeURIComponent(item.slug)}`} className="btn-gold mt-5 inline-flex">See More</a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600">{search ? 'No albums match your search.' : 'Parish photo albums will appear here soon.'}</p>
            )}
          </>
        )}
      </main>
      {album && activeImageIndex !== null && album.photos[activeImageIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo viewer"
          onClick={() => setActiveImageIndex(null)}
        >
          <button type="button" onClick={() => setActiveImageIndex(null)} aria-label="Close photo viewer" className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-2xl text-white hover:bg-white/25">×</button>
          {album.photos.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + album.photos.length) % album.photos.length); }} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white sm:left-6">‹</button>}
          <div className="flex max-h-full max-w-6xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <img src={album.photos[activeImageIndex].thumbnailUrl} alt={album.photos[activeImageIndex].caption} className="max-h-[78vh] max-w-full rounded-lg object-contain" />
            <p className="m-0 text-center text-lg font-semibold text-white">{album.photos[activeImageIndex].caption}</p>
            <p className="m-0 text-sm text-white/70">{activeImageIndex + 1} of {album.photos.length}</p>
          </div>
          {album.photos.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % album.photos.length); }} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white sm:right-6">›</button>}
        </div>
      )}
    </div>
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
                  {article.imageData && <img src={article.imageData} alt="" className="mb-5 max-h-72 w-full rounded-lg object-cover" />}
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
const pastoralTeamDefaults: PastoralTeam = {
  hierarchy: [
    { id: 'archbishop', name: 'Most Rev. Dr. Ignatius Ayau Kaigama', title: 'Archbishop of Abuja', image: '/images/archbishop.jpg', specialization: 'Archbishop' },
    { id: 'auxiliaryBishop', name: 'Most Rev. Dr. Anselm Umoren', title: 'Auxiliary Bishop of Abuja', image: '/images/aux-bishop.jpg', specialization: 'Auxiliary Bishop' },
    { id: 'cardinal', name: 'His Eminence, John Cardinal Onaiyekan', title: 'Archbishop Emeritus of Abuja', image: '/images/cardinal.jpg', specialization: 'Cardinal' },
  ],
  parishClergy: [
    { id: 'parishPriest', name: 'Rev. Fr. Francis Kale', title: 'Parish Priest', image: '/images/priest1.jpg', contact: '0812 219 2192', phoneHref: 'tel:+2348122192192' },
    { id: 'associatePriest1', name: 'Rev. Fr. Pascal Okpanachi Yahaya', title: 'Associate Priest', image: '/images/priest2.jpg', contact: 'Contact via Parish Office' },
    { id: 'associatePriest2', name: 'Rev. Fr. Chijioke Majela', title: 'Associate Priest', image: '/images/priest3.jpg', contact: 'Contact via Parish Office' },
  ],
  catechists: [
    { id: 'catechist1', name: 'Catechist 1', title: 'Catechist', image: '' },
    { id: 'catechist2', name: 'Catechist 2', title: 'Catechist', image: '' },
  ],
};

const PastoralTeamSection = () => {
  const [team, setTeam] = useState<PastoralTeam>(pastoralTeamDefaults);
  useEffect(() => {
    publicApi.pastoralTeam()
      .then(setTeam)
      .catch((error: unknown) => console.error('Unable to load pastoral team updates.', error));
  }, []);
  const { hierarchy, parishClergy, catechists } = team;

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
          {hierarchy.map((leader) => (
            <div key={leader.id} className="priest-card">
              <div className="relative overflow-hidden" style={{ height: 320 }}>
                {leader.image ? <img src={leader.image} alt={leader.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-[#e8e4d8] text-gray-500">Photo coming soon</div>}
                <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, rgba(26,39,68,0.9), transparent)' }} />
                <div className="absolute bottom-4 left-4">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(201,168,76,0.9)', color: '#1a1a1a' }}>
                    {leader.specialization || leader.title}
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
          {parishClergy.map((priest) => (
            <div key={priest.id} className="priest-card">
              <div className="relative overflow-hidden" style={{ height: 320 }}>
                {priest.image ? <img src={priest.image} alt={priest.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-[#e8e4d8] text-gray-500">Photo coming soon</div>}
                <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, rgba(26,39,68,0.9), transparent)' }} />
                <div className="absolute bottom-4 left-4">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(201,168,76,0.9)', color: '#1a1a1a' }}>
                    {priest.title}
                  </span>
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>{priest.name}</h3>
                {priest.contact && priest.phoneHref ? <a href={priest.phoneHref} className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ background: 'rgba(201,168,76,0.1)', color: '#1a2744' }} aria-label={`Call ${priest.name} at ${priest.contact}`}>
                  <PhoneIcon className="w-3.5 h-3.5" style={{ color: '#a07830' }}/>
                  {priest.contact}
                </a> : priest.contact ? <div className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)', color: '#1a2744' }}>
                  <PhoneIcon className="w-3.5 h-3.5" style={{ color: '#a07830' }}/>
                  {priest.contact}
                </div> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full h-px my-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />

        <div>
          <h3 className="mb-6 text-center text-2xl font-bold" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>Parish Catechists</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {catechists.map((catechist) => (
              <div key={catechist.id} className="priest-card">
                <div className="relative overflow-hidden" style={{ height: 320 }}>
                  {catechist.image ? <img src={catechist.image} alt={catechist.name} className="w-full h-full object-cover object-top" /> : <div className="flex h-full items-center justify-center bg-[#e8e4d8] text-gray-500">Photo coming soon</div>}
                  <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, rgba(26,39,68,0.9), transparent)' }} />
                  <div className="absolute bottom-4 left-4">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(201,168,76,0.9)', color: '#1a1a1a' }}>{catechist.title}</span>
                  </div>
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-lg font-bold mb-1" style={{ color: '#1a2744', fontFamily: 'Playfair Display, serif' }}>{catechist.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

// ─── Office Hours Section ─────────────────────────────────────────────────────
const OfficeHoursSection = () => {
  const clergyOfficeDays = [
    { role: 'Parish Priest', days: 'Tuesday – Friday' },
    { role: 'Assistant Parish Priest', days: 'Monday – Thursday' },
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
    { label: 'Pastoral Team', href: '#priests' },
    { label: 'Article Board', href: '#articles' },
    { label: 'Parish Activities', href: '#activities' },
    { label: 'Parish Committees', href: '#committees' },
    { label: 'Parish Communities', href: '#community' },
    { label: 'Photo Gallery', href: '#gallery' },
    { label: 'Contact Us', href: '#contact' },
  ];

  const massSchedule = [
    { day: 'Mon – Fri', time: '6:00 AM, 12:00 Noon, 6:00 PM' },
    { day: 'Saturday', time: '7:00 AM' },
    { day: 'Sunday', time: '6:00 AM, 8:00 AM, 8:15 AM (Children), 10:00 AM, 6:00 PM' },
    { day: 'Confession', time: 'Thur (6:30 AM/PM), Sat (7:30 AM)' },
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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
  const [articleImageData, setArticleImageData] = useState('');
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
  const [galleryAlbums, setGalleryAlbums] = useState<GalleryAlbum[]>([]);
  const [gallerySelectedAlbumId, setGallerySelectedAlbumId] = useState<number | null>(null);
  const [galleryOpenAlbumId, setGalleryOpenAlbumId] = useState<number | null>(null);
  const [galleryNewAlbumTitle, setGalleryNewAlbumTitle] = useState('');
  const [galleryNewAlbumDate, setGalleryNewAlbumDate] = useState('');
  const [galleryNewAlbumDescription, setGalleryNewAlbumDescription] = useState('');
  const [galleryAlbumSearch, setGalleryAlbumSearch] = useState('');
  const [galleryAlbumDateFilter, setGalleryAlbumDateFilter] = useState('');
  const [galleryAlbumEditId, setGalleryAlbumEditId] = useState<number | null>(null);
  const [galleryAlbumEditTitle, setGalleryAlbumEditTitle] = useState('');
  const [galleryAlbumEditDate, setGalleryAlbumEditDate] = useState('');
  const [galleryAlbumEditDescription, setGalleryAlbumEditDescription] = useState('');
  const [galleryError, setGalleryError] = useState('');
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryMessage, setGalleryMessage] = useState('');
  const [galleryDeleteAllOpen, setGalleryDeleteAllOpen] = useState(false);
  const [galleryDeleteAllConfirmation, setGalleryDeleteAllConfirmation] = useState('');
  const [galleryDeletingAll, setGalleryDeletingAll] = useState(false);
  const [pastoralImages, setPastoralImages] = useState<PastoralImages>({});
  const [pastoralTeam, setPastoralTeam] = useState<PastoralTeam>(pastoralTeamDefaults);
  const [pastoralTeamDirty, setPastoralTeamDirty] = useState(false);
  const [pastoralTeamSaving, setPastoralTeamSaving] = useState(false);
  const [pastoralImageError, setPastoralImageError] = useState('');
  const [pastoralImageMessage, setPastoralImageMessage] = useState('');
  const [savingPastoralImage, setSavingPastoralImage] = useState<PastoralImageKey | null>(null);
  const [committees, setCommittees] = useState<ParishCommittee[]>(defaultCommittees);
  const [communities, setCommunities] = useState<ParishCommunities>(defaultCommunities);
  const [communityEditGroup, setCommunityEditGroup] = useState<CommunityGroupKey>('organizations');
  const [committeeContentDirty, setCommitteeContentDirty] = useState(false);
  const [communityContentDirty, setCommunityContentDirty] = useState(false);
  const [committeeContentSaving, setCommitteeContentSaving] = useState(false);
  const [communityContentSaving, setCommunityContentSaving] = useState(false);
  const [committeeContentError, setCommitteeContentError] = useState('');
  const [committeeContentMessage, setCommitteeContentMessage] = useState('');

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

  const fetchGalleryAlbums = async () => {
    try {
      const albums = await adminApi.listGalleryAlbums();
      setGalleryAlbums(albums);
      setGallerySelectedAlbumId((current) => current && albums.some((album) => album.id === current)
        ? current
        : albums.find((album) => album.slug === 'general-gallery')?.id ?? albums[0]?.id ?? null);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to load gallery albums. Refresh and try again.'));
    }
  };

  const fetchPastoralContent = async () => {
    try {
      const [images, team] = await Promise.all([
        adminApi.listPastoralImages(),
        adminApi.listPastoralTeam(),
      ]);
      setPastoralImages(images);
      setPastoralTeam(team);
      setPastoralTeamDirty(false);
      setPastoralImageError('');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to load the pastoral team. Refresh and try again.'));
    }
  };

  const fetchParishContent = async () => {
    try {
      const [savedCommittees, savedCommunities] = await Promise.all([
        adminApi.listCommittees(),
        adminApi.listCommunities(),
      ]);
      if (savedCommittees) setCommittees(savedCommittees);
      if (savedCommunities) setCommunities(savedCommunities);
      setCommitteeContentError('');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to load committees and communities. Refresh and try again.'));
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
    void fetchGalleryAlbums();
    void fetchPastoralContent();
    void fetchParishContent();
  }, [isAuthenticated]);

  const updateCommittee = (id: string, changes: Partial<ParishCommittee>) => {
    setCommittees((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
    setCommitteeContentDirty(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
  };

  const addCommittee = () => {
    setCommittees((current) => [...current, {
      id: `committee-${crypto.randomUUID()}`,
      name: '',
      category: 'liturgical',
      meeting: '',
      description: '',
    }]);
    setCommitteeContentDirty(true);
  };

  const removeCommittee = (id: string) => {
    if (!window.confirm('Remove this committee from the website?')) return;
    setCommittees((current) => current.filter((item) => item.id !== id));
    setCommitteeContentDirty(true);
  };

  const saveCommittees = async () => {
    setCommitteeContentSaving(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
    try {
      const saved = await adminApi.updateCommittees(committees);
      setCommittees(saved);
      setCommitteeContentDirty(false);
      setCommitteeContentMessage('Parish committees saved.');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to save parish committees.'));
    } finally {
      setCommitteeContentSaving(false);
    }
  };

  const discardParishContentChanges = async () => {
    setCommitteeContentError('');
    try {
      const [savedCommittees, savedCommunities] = await Promise.all([
        adminApi.listCommittees(),
        adminApi.listCommunities(),
      ]);
      setCommittees(savedCommittees || defaultCommittees);
      setCommunities(savedCommunities || defaultCommunities);
      setCommitteeContentDirty(false);
      setCommunityContentDirty(false);
      setCommitteeContentMessage('');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to reload saved parish information.'));
    }
  };

  const updateCommunity = (id: string, changes: Partial<CommunityItem>) => {
    setCommunities((current) => ({
      ...current,
      [communityEditGroup]: current[communityEditGroup].map((item) => item.id === id ? { ...item, ...changes } : item),
    }));
    setCommunityContentDirty(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
  };

  const updateCommunityDetails = (id: string, field: keyof NonNullable<CommunityItem['details']>, value: string) => {
    const item = communities[communityEditGroup].find((entry) => entry.id === id);
    if (!item) return;
    updateCommunity(id, { details: { ...item.details, [field]: value } });
  };

  const addCommunity = () => {
    setCommunities((current) => ({
      ...current,
      [communityEditGroup]: [...current[communityEditGroup], {
        id: `community-${crypto.randomUUID()}`,
        name: '',
        details: communityEditGroup === 'states' ? { audience: '', whatWeDo: '' } : undefined,
      }],
    }));
    setCommunityContentDirty(true);
  };

  const removeCommunity = (id: string) => {
    if (!window.confirm('Remove this item from the community section?')) return;
    setCommunities((current) => ({
      ...current,
      [communityEditGroup]: current[communityEditGroup].filter((item) => item.id !== id),
    }));
    setCommunityContentDirty(true);
  };

  const saveCommunities = async () => {
    setCommunityContentSaving(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
    try {
      const saved = await adminApi.updateCommunities(communities);
      setCommunities(saved);
      setCommunityContentDirty(false);
      setCommitteeContentMessage('Parish communities saved.');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to save parish communities.'));
    } finally {
      setCommunityContentSaving(false);
    }
  };

  const updatePastoralTeamMember = (id: string, changes: Partial<PastoralTeamMember>) => {
    setPastoralTeam((current) => ({
      hierarchy: current.hierarchy.map((member) => member.id === id ? { ...member, ...changes } : member),
      parishClergy: current.parishClergy.map((member) => member.id === id ? { ...member, ...changes } : member),
      catechists: current.catechists.map((member) => member.id === id ? { ...member, ...changes } : member),
    }));
    setPastoralTeamDirty(true);
    setPastoralImageError('');
    setPastoralImageMessage('');
  };

  const addPastoralTeamMember = (group: keyof PastoralTeam) => {
    const member: PastoralTeamMember = {
      id: `team-${crypto.randomUUID()}`,
      name: '',
      title: '',
      image: '',
      ...(group === 'parishClergy' ? { contact: '' } : group === 'hierarchy' ? { specialization: '' } : {}),
    };
    setPastoralTeam((current) => ({ ...current, [group]: [...current[group], member] }));
    setPastoralTeamDirty(true);
  };

  const removePastoralTeamMember = (group: keyof PastoralTeam, id: string) => {
    if (!window.confirm('Remove this member from the Pastoral Team section?')) return;
    setPastoralTeam((current) => ({ ...current, [group]: current[group].filter((member) => member.id !== id) }));
    setPastoralTeamDirty(true);
    setPastoralImageMessage('');
  };

  const movePastoralTeamMember = (group: keyof PastoralTeam, id: string, destination: keyof PastoralTeam) => {
    if (group === destination) return;
    const member = pastoralTeam[group].find((item) => item.id === id);
    if (!member) return;
    setPastoralTeam((current) => ({
      ...current,
      [group]: current[group].filter((item) => item.id !== id),
      [destination]: [...current[destination], member],
    }));
    setPastoralTeamDirty(true);
  };

  const reorderPastoralTeamMember = (group: keyof PastoralTeam, index: number, offset: -1 | 1) => {
    setPastoralTeam((current) => {
      const members = [...current[group]];
      const target = index + offset;
      if (target < 0 || target >= members.length) return current;
      [members[index], members[target]] = [members[target], members[index]];
      return { ...current, [group]: members };
    });
    setPastoralTeamDirty(true);
  };

  const savePastoralTeam = async () => {
    setPastoralTeamSaving(true);
    setPastoralImageError('');
    setPastoralImageMessage('');
    try {
      const saved = await adminApi.updatePastoralTeam(pastoralTeam);
      setPastoralTeam(saved);
      setPastoralTeamDirty(false);
      setPastoralImageMessage('Pastoral Team details saved to the website.');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to save the Pastoral Team details.'));
    } finally {
      setPastoralTeamSaving(false);
    }
  };

  const discardPastoralTeamChanges = async () => {
    setPastoralImageError('');
    try {
      setPastoralTeam(await adminApi.listPastoralTeam());
      setPastoralTeamDirty(false);
      setPastoralImageMessage('');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to reload the saved pastoral team.'));
    }
  };

  const handlePastoralImageUpload = async (key: PastoralImageKey, file: File | undefined) => {
    if (!file) return;
    setPastoralImageError('');
    setPastoralImageMessage('');
    if (
      !(['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        || /\.(jpe?g|png|webp)$/i.test(file.name))
    ) {
      setPastoralImageError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPastoralImageError('The selected photo is larger than 10 MB. Choose a smaller image.');
      return;
    }
    setSavingPastoralImage(key);
    try {
      const imageData = await compressGalleryImage(file);
      setPastoralImages(await adminApi.updatePastoralImage(key, imageData));
      setPastoralImageMessage('Pastoral team photo updated on the website.');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to update this pastoral team photo.'));
    } finally {
      setSavingPastoralImage(null);
    }
  };

  const handleResetPastoralImage = async (key: PastoralImageKey) => {
    setPastoralImageError('');
    setPastoralImageMessage('');
    setSavingPastoralImage(key);
    try {
      setPastoralImages(await adminApi.updatePastoralImage(key, null));
      setPastoralImageMessage('Original pastoral team photo restored.');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to restore the original pastoral team photo.'));
    } finally {
      setSavingPastoralImage(null);
    }
  };

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
    if (gallerySelectedAlbumId === null) {
      setGalleryError('Create or select an album before uploading photos.');
      return;
    }
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
        const created = await adminApi.createGalleryImage({ caption, imageData, albumId: gallerySelectedAlbumId });
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
    await fetchGalleryAlbums();
  };

  const handleCreateGalleryAlbum = async (event: React.FormEvent) => {
    event.preventDefault();
    setGalleryError('');
    setGalleryMessage('');
    try {
      const album = await adminApi.createGalleryAlbum({
        title: galleryNewAlbumTitle,
        date: galleryNewAlbumDate,
        description: galleryNewAlbumDescription,
      });
      setGalleryAlbums((current) => [album, ...current]);
      setGallerySelectedAlbumId(album.id);
      setGalleryOpenAlbumId(album.id);
      setGalleryNewAlbumTitle('');
      setGalleryNewAlbumDate('');
      setGalleryNewAlbumDescription('');
      setGalleryMessage(`${album.title} album created. Select photos to upload into it.`);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to create the gallery album.'));
    }
  };

  const handleStartGalleryAlbumEdit = (album: GalleryAlbum) => {
    setGalleryAlbumEditId(album.id);
    setGalleryAlbumEditTitle(album.title);
    setGalleryAlbumEditDate(album.date);
    setGalleryAlbumEditDescription(album.description);
  };

  const handleSaveGalleryAlbum = async (event: React.FormEvent) => {
    event.preventDefault();
    if (galleryAlbumEditId === null) return;
    setGalleryError('');
    try {
      const updated = await adminApi.updateGalleryAlbum(galleryAlbumEditId, {
        title: galleryAlbumEditTitle,
        date: galleryAlbumEditDate,
        description: galleryAlbumEditDescription,
      });
      setGalleryAlbums((current) => current.map((album) => album.id === updated.id ? updated : album));
      setGalleryAlbumEditId(null);
      setGalleryMessage(`${updated.title} album updated.`);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to update the gallery album.'));
    }
  };

  const handleFeatureGalleryAlbum = async (album: GalleryAlbum) => {
    try {
      if (album.isFeatured) await adminApi.unfeatureGalleryAlbum(album.id);
      else await adminApi.featureGalleryAlbum(album.id);
      setGalleryAlbums((current) => current.map((item) => ({ ...item, isFeatured: !album.isFeatured && item.id === album.id })));
      setGalleryMessage(album.isFeatured ? `${album.title} is no longer featured.` : `${album.title} is now the featured album.`);
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to feature the gallery album.'));
    }
  };

  const handleDeleteGalleryAlbum = async (album: GalleryAlbum) => {
    if (album.slug === 'uncategorized') return;
    if (!window.confirm(`Delete the "${album.title}" album? Its photos will be moved to Uncategorized, not deleted.`)) return;
    try {
      await adminApi.deleteGalleryAlbum(album.id);
      setGalleryAlbums((current) => current.filter((item) => item.id !== album.id));
      if (galleryAlbumEditId === album.id) setGalleryAlbumEditId(null);
      if (galleryOpenAlbumId === album.id) setGalleryOpenAlbumId(null);
      await fetchGalleryImages();
      await fetchGalleryAlbums();
      setGalleryMessage(`Album deleted. Its photos were moved to Uncategorized.`);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to delete the gallery album.'));
    }
  };

  const handleDeleteAllGalleryContent = async () => {
    if (galleryDeleteAllConfirmation !== 'DELETE') return;
    setGalleryDeletingAll(true);
    setGalleryError('');
    setGalleryMessage('');
    try {
      const result = await adminApi.deleteAllGalleryContent();
      const albums = await adminApi.listGalleryAlbums();
      setGalleryImages([]);
      setGalleryAlbums(albums);
      setGallerySelectedAlbumId(null);
      setGalleryOpenAlbumId(null);
      setGalleryAlbumEditId(null);
      setGalleryAlbumSearch('');
      setGalleryAlbumDateFilter('');
      setGalleryDeleteAllConfirmation('');
      setGalleryDeleteAllOpen(false);
      setGalleryMessage(`Deleted ${result.photosDeleted} photo${result.photosDeleted === 1 ? '' : 's'} and ${result.albumsDeleted} album${result.albumsDeleted === 1 ? '' : 's'}. The Uncategorized folder is ready for a fresh start.`);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to clear the gallery.'));
    } finally {
      setGalleryDeletingAll(false);
    }
  };

  const handleMoveGalleryImage = async (image: GalleryImage, albumId: number) => {
    try {
      const updated = await adminApi.moveGalleryImage(image.id, albumId);
      setGalleryImages((current) => current.map((item) => item.id === updated.id ? updated : item));
      await fetchGalleryAlbums();
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to move the photo to that album.'));
    }
  };

  const handleSetGalleryAlbumCover = async (image: GalleryImage) => {
    if (image.albumId === null) return;
    const album = galleryAlbums.find((item) => item.id === image.albumId);
    if (!album) return;
    try {
      const updated = await adminApi.updateGalleryAlbum(album.id, {
        title: album.title,
        date: album.date,
        description: album.description,
        coverImageId: image.id,
      });
      setGalleryAlbums((current) => current.map((item) => item.id === updated.id ? updated : item));
      setGalleryMessage(`${image.caption} is now the ${album.title} cover photo.`);
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to set the album cover photo.'));
    }
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
      await fetchGalleryAlbums();
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
    setArticleImageData('');
    setArticlePublishDate(getTodayInAbuja());
  };

  const handleArticleImageUpload = async (file?: File) => {
    if (!file) return;
    setArticleError('');
    try {
      setArticleImageData(await compressGalleryImage(file));
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to prepare the article image.'));
    }
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
      imageData: articleImageData,
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
    setArticleImageData(article.imageData || '');
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
    const article = articles.find((item) => item.id === id);
    if (!window.confirm(`Permanently delete "${article?.title || 'this article'}"?`)) return;
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
    setGalleryImages([]);
    setGalleryAlbums([]);
    setPastoralImages({});
  };

  if (!isAuthenticated) {
    if (loading) return <div role="status" style={{ padding: 32, color: '#1a2744' }}>Checking secure session...</div>;
    return (
      <div style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)',
        padding: 16,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 460,
          boxSizing: 'border-box',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 25px 80px rgba(15, 23, 42, 0.3)',
          padding: 24,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src="/images/holy_rosary_seal_cutout.png" alt="Holy Rosary Catholic Church seal" style={{ display: 'block', width: 68, height: 68, objectFit: 'contain', margin: '0 auto 6px' }} />
            <h1 style={{ margin: '4px 0', color: '#1a2744', fontSize: 40, fontWeight: 800, lineHeight: 1.15, fontFamily: 'Playfair Display, serif' }}>
              Dominus
            </h1>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Username</label>
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={loginData.username}
                onChange={(event) => {
                  setLoginData((current) => ({ ...current, username: event.target.value }));
                  setLoginError('');
                }}
                placeholder="Enter your username"
                style={{ boxSizing: 'border-box', width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #d8dce3', fontSize: 15 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={loginData.password}
                  onChange={(event) => {
                    setLoginData((current) => ({ ...current, password: event.target.value }));
                    setLoginError('');
                  }}
                  placeholder="Enter your password"
                  style={{ boxSizing: 'border-box', width: '100%', padding: '12px 68px 12px 14px', borderRadius: 10, border: '1px solid #d8dce3', fontSize: 15 }}
                />
                <button
                  type="button"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showLoginPassword}
                  onClick={() => setShowLoginPassword((visible) => !visible)}
                  style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', border: 0, borderRadius: 6, padding: '6px 8px', background: 'transparent', color: '#1a2744', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>
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
                fontSize: 17,
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
  const openGalleryAlbum = galleryAlbums.find((album) => album.id === galleryOpenAlbumId) || null;
  const openGalleryPhotos = galleryOpenAlbumId === null
    ? []
    : galleryImages.filter((image) => image.albumId === galleryOpenAlbumId);

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

        <nav aria-label="Dashboard sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {[
            ['dominus-pastoral-team', 'Pastoral Team'],
            ['dominus-committees', 'Parish Committees'],
            ['dominus-communities', 'Communities & Societies'],
          ].map(([href, label]) => (
            <a key={href} href={`#${href}`} style={{ border: '1px solid #d8dee9', borderRadius: 999, padding: '9px 14px', color: '#1a2744', background: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </nav>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 28 }}>
          {healthCards.map((item) => (
            <div key={item.label} style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 10px 28px rgba(26,39,68,0.06)' }}>
              <div style={{ color: item.tone, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{item.label}</div>
              <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800 }}>{item.value}</div>
            </div>
          ))}
        </section>

        <section id="dominus-pastoral-team" style={{ scrollMarginTop: 16, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Website Appearance</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>Pastoral Team</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              Edit names, roles, contacts, photos, and the order of everyone displayed in this section.
            </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pastoralTeamDirty && (
                <button
                  type="button"
                  onClick={() => void discardPastoralTeamChanges()}
                  disabled={pastoralTeamSaving || savingPastoralImage !== null}
                  style={{ border: 0, borderRadius: 10, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', color: '#334155', background: '#e2e8f0' }}
                >
                  Discard changes
                </button>
              )}
              <button
                type="button"
                onClick={() => void savePastoralTeam()}
                disabled={!pastoralTeamDirty || pastoralTeamSaving || savingPastoralImage !== null}
                style={{ border: 0, borderRadius: 10, padding: '11px 16px', fontWeight: 800, cursor: pastoralTeamDirty && !pastoralTeamSaving ? 'pointer' : 'not-allowed', color: '#1a2744', background: pastoralTeamDirty ? 'linear-gradient(135deg, #d4af37, #b9952a)' : '#e2e8f0' }}
              >
                {pastoralTeamSaving ? 'Saving team...' : pastoralTeamDirty ? 'Save Pastoral Team' : 'Team saved'}
              </button>
            </div>
          </div>
          {pastoralImageError && <p role="alert" style={{ margin: '0 0 12px', color: '#b42318', fontSize: 13 }}>{pastoralImageError}</p>}
          {pastoralImageMessage && <p role="status" style={{ margin: '0 0 12px', color: '#166534', fontSize: 13 }}>{pastoralImageMessage}</p>}
          <div style={{ display: 'grid', gap: 24 }}>
            {([
              { key: 'hierarchy' as const, label: 'Archdiocesan Leadership', members: pastoralTeam.hierarchy },
              { key: 'parishClergy' as const, label: 'Parish Clergy', members: pastoralTeam.parishClergy },
              { key: 'catechists' as const, label: 'Catechists', members: pastoralTeam.catechists },
            ]).map(({ key: group, label, members }) => (
              <div key={group} style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{label}</h3>
                  <button
                    type="button"
                    disabled={pastoralTeamSaving}
                    onClick={() => addPastoralTeamMember(group)}
                    style={{ border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', background: '#e0f2fe', color: '#075985' }}
                  >
                    Add member
                  </button>
                </div>
                {members.length === 0 && <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No members in this group.</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                  {members.map((member, index) => {
                    const imageUrl = pastoralImages[member.id] || member.image;
                    const isSaving = savingPastoralImage === member.id;
                    return (
                      <article key={member.id} style={{ minWidth: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fafbfd' }}>
                        {imageUrl
                          ? <img src={imageUrl} alt={member.name || 'Pastoral team member'} style={{ display: 'block', width: '100%', height: 190, objectFit: 'cover', objectPosition: 'top' }} />
                          : <div style={{ display: 'flex', width: '100%', height: 190, alignItems: 'center', justifyContent: 'center', background: '#e8e4d8', color: '#64748b' }}>Photo not set</div>}
                        <div style={{ display: 'grid', gap: 10, padding: 14 }}>
                          <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                            Name
                            <input maxLength={120} value={member.name} onChange={(event) => updatePastoralTeamMember(member.id, { name: event.target.value })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                          </label>
                          <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                            Role / title
                            <input maxLength={120} value={member.title} onChange={(event) => updatePastoralTeamMember(member.id, { title: event.target.value })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                          </label>
                          {group === 'hierarchy' ? (
                            <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                              Badge text
                              <input maxLength={120} value={member.specialization || ''} onChange={(event) => updatePastoralTeamMember(member.id, { specialization: event.target.value })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                            </label>
                          ) : group === 'parishClergy' ? (
                            <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                              Contact details
                              <input maxLength={120} value={member.contact || ''} onChange={(event) => updatePastoralTeamMember(member.id, { contact: event.target.value, phoneHref: undefined })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                            </label>
                          ) : null}
                          <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                            Change photo
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={savingPastoralImage !== null || pastoralTeamDirty || pastoralTeamSaving}
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                event.currentTarget.value = '';
                                void handlePastoralImageUpload(member.id, file);
                              }}
                              style={{ width: '100%', minWidth: 0, fontSize: 12 }}
                            />
                          </label>
                          {pastoralTeamDirty && <span style={{ color: '#92400e', fontSize: 11 }}>Save team edits before changing photos.</span>}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                            <button type="button" disabled={index === 0 || pastoralTeamSaving} onClick={() => reorderPastoralTeamMember(group, index, -1)} style={{ border: 0, borderRadius: 7, padding: '7px 9px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Move up</button>
                            <button type="button" disabled={index === members.length - 1 || pastoralTeamSaving} onClick={() => reorderPastoralTeamMember(group, index, 1)} style={{ border: 0, borderRadius: 7, padding: '7px 9px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Move down</button>
                            <select aria-label={`Group for ${member.name || 'new member'}`} value={group} disabled={pastoralTeamSaving} onChange={(event) => movePastoralTeamMember(group, member.id, event.target.value === 'hierarchy' ? 'hierarchy' : event.target.value === 'catechists' ? 'catechists' : 'parishClergy')} style={{ flex: 1, minWidth: 140, padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff' }}>
                              <option value="hierarchy">Leadership</option>
                              <option value="parishClergy">Parish clergy</option>
                              <option value="catechists">Catechists</option>
                            </select>
                            <button type="button" disabled={pastoralTeamSaving} onClick={() => removePastoralTeamMember(group, member.id)} style={{ border: 0, borderRadius: 7, padding: '7px 9px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Remove</button>
                          </div>
                          {pastoralImages[member.id] && (
                            <button
                              type="button"
                              disabled={savingPastoralImage !== null || pastoralTeamDirty}
                              onClick={() => void handleResetPastoralImage(member.id)}
                              style={{ border: 0, borderRadius: 8, padding: '9px 11px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}
                            >
                              {isSaving ? 'Saving...' : 'Restore original photo'}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', color: '#64748b', fontSize: 12 }}>
            Save team edits before updating photos. JPG, PNG, or WebP files up to 10 MB are accepted before optimization; saved images are limited to 1 MB.
          </p>
        </section>

        <section id="dominus-committees" style={{ scrollMarginTop: 16, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Information</p>
              <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>Parish Committees</h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Edit committee details or add a new liturgical or non-liturgical committee.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={addCommittee} disabled={committeeContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer', background: '#e0f2fe', color: '#075985' }}>Add committee</button>
              {(committeeContentDirty || communityContentDirty) && <button type="button" onClick={() => void discardParishContentChanges()} disabled={committeeContentSaving || communityContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Discard changes</button>}
              <button type="button" onClick={() => void saveCommittees()} disabled={!committeeContentDirty || committeeContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 800, cursor: committeeContentDirty ? 'pointer' : 'not-allowed', background: committeeContentDirty ? '#d4af37' : '#e2e8f0', color: '#1a2744' }}>{committeeContentSaving ? 'Saving...' : 'Save committees'}</button>
            </div>
          </div>
          {committeeContentError && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{committeeContentError}</p>}
          {committeeContentMessage && <p role="status" style={{ color: '#166534', fontSize: 13 }}>{committeeContentMessage}</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            {committees.map((item) => (
              <article key={item.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fafbfd' }}>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Committee name
                  <input maxLength={120} value={item.name} onChange={(event) => updateCommittee(item.id, { name: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Subsection
                  <select value={item.category} onChange={(event) => updateCommittee(item.id, { category: event.target.value === 'non-liturgical' ? 'non-liturgical' : 'liturgical' })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                    <option value="liturgical">Liturgical Committee</option>
                    <option value="non-liturgical">Non-Liturgical Committee</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Meeting schedule
                  <input maxLength={500} value={item.meeting} onChange={(event) => updateCommittee(item.id, { meeting: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, gridColumn: '1 / -1' }}>Description
                  <textarea rows={3} maxLength={2000} value={item.description} onChange={(event) => updateCommittee(item.id, { description: event.target.value })} style={{ resize: 'vertical', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                {item.choirList && <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, gridColumn: '1 / -1' }}>Additional schedule items (one per line)
                  <textarea rows={3} maxLength={3000} value={item.choirList.join('\n')} onChange={(event) => updateCommittee(item.id, { choirList: event.target.value.split('\n').slice(0, 30) })} style={{ resize: 'vertical', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>}
                {!item.choirList && <button type="button" onClick={() => updateCommittee(item.id, { choirList: [''] })} style={{ justifySelf: 'start', border: 0, borderRadius: 8, padding: '8px 10px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>Add schedule details</button>}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => removeCommittee(item.id)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Remove committee</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="dominus-communities" style={{ scrollMarginTop: 16, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Information</p>
              <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>Communities & Societies</h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Choose a subsection to edit, add, or remove its entries and their information.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={addCommunity} disabled={communityContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer', background: '#e0f2fe', color: '#075985' }}>Add to subsection</button>
              <button type="button" onClick={() => void saveCommunities()} disabled={!communityContentDirty || communityContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 800, cursor: communityContentDirty ? 'pointer' : 'not-allowed', background: communityContentDirty ? '#d4af37' : '#e2e8f0', color: '#1a2744' }}>{communityContentSaving ? 'Saving...' : 'Save communities'}</button>
            </div>
          </div>
          <label style={{ display: 'grid', gap: 5, maxWidth: 400, marginBottom: 16, fontSize: 12, fontWeight: 700 }}>Community subsection
            <select value={communityEditGroup} onChange={(event) => setCommunityEditGroup(event.target.value as CommunityGroupKey)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
              <option value="organizations">Statutory Organizations</option>
              <option value="societies">Pious Societies</option>
              <option value="knighthood">Knighthood</option>
              <option value="states">State Associations</option>
            </select>
          </label>
          {committeeContentError && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{committeeContentError}</p>}
          {committeeContentMessage && <p role="status" style={{ color: '#166534', fontSize: 13 }}>{committeeContentMessage}</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            {communities[communityEditGroup].map((item) => (
              <article key={item.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fafbfd' }}>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Name
                  <input maxLength={120} value={item.name} onChange={(event) => updateCommunity(item.id, { name: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Meeting / schedule
                  <input maxLength={500} value={item.meeting || item.time || ''} onChange={(event) => updateCommunity(item.id, communityEditGroup === 'states' ? { time: event.target.value, meeting: undefined } : { meeting: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                {communityEditGroup !== 'states' && <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Subtitle / description
                  <input maxLength={500} value={item.subtitle || ''} onChange={(event) => updateCommunity(item.id, { subtitle: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>}
                {communityEditGroup === 'organizations' && <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Thanksgiving schedule
                  <input maxLength={500} value={item.thanksgiving || ''} onChange={(event) => updateCommunity(item.id, { thanksgiving: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>}
                {communityEditGroup === 'states' && <>
                  <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>States / region
                    <input maxLength={500} value={item.states || ''} onChange={(event) => updateCommunity(item.id, { states: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                  </label>
                  {([
                    ['formalName', 'Formal name'],
                    ['audience', 'Who the community serves'],
                    ['members', 'Membership'],
                    ['leadership', 'Leadership'],
                    ['meetingPlace', 'Meeting place'],
                    ['patronSaintDay', 'Patron saint day'],
                    ['slogan', 'Slogan'],
                    ['mantra', 'Mantra'],
                    ['mission', 'Mission'],
                    ['whatWeDo', 'What we do'],
                  ] as Array<[keyof NonNullable<CommunityItem['details']>, string]>).map(([field, label]) => (
                    <label key={field} style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, gridColumn: field === 'whatWeDo' ? '1 / -1' : undefined }}>{label}
                      <textarea rows={field === 'whatWeDo' ? 3 : 2} maxLength={2000} value={item.details?.[field] || ''} onChange={(event) => updateCommunityDetails(item.id, field, event.target.value)} style={{ resize: 'vertical', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    </label>
                  ))}
                </>}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => removeCommunity(item.id)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Remove entry</button>
                </div>
              </article>
            ))}
          </div>
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
              Browse photos by album folders, publish photos visitors can see, and feature an album or individual photo.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" onClick={() => setGalleryDeleteAllOpen(true)} disabled={galleryDeletingAll} style={{ border: 0, borderRadius: 8, padding: '9px 13px', fontWeight: 700, cursor: galleryDeletingAll ? 'not-allowed' : 'pointer', background: '#fee2e2', color: '#b91c1c' }}>
              Delete all photos &amp; albums
            </button>
          </div>
          {galleryDeleteAllOpen && (
            <div role="alertdialog" aria-modal="true" aria-labelledby="gallery-delete-all-title" aria-describedby="gallery-delete-all-description" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(15,23,42,0.65)' }}>
              <div style={{ display: 'grid', gap: 14, width: '100%', maxWidth: 480, padding: 22, borderRadius: 16, background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                <h3 id="gallery-delete-all-title" style={{ margin: 0, color: '#991b1b', fontSize: 20 }}>Delete all gallery content?</h3>
                <p id="gallery-delete-all-description" style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
                  This permanently deletes every gallery photo and event album. The empty Uncategorized folder will remain. Articles, announcements, and other site content will not be affected.
                </p>
                <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                  Type DELETE to confirm
                  <input autoComplete="off" value={galleryDeleteAllConfirmation} onChange={(event) => setGalleryDeleteAllConfirmation(event.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" disabled={galleryDeletingAll} onClick={() => { setGalleryDeleteAllOpen(false); setGalleryDeleteAllConfirmation(''); }} style={{ border: 0, borderRadius: 8, padding: '9px 13px', fontWeight: 700, cursor: galleryDeletingAll ? 'not-allowed' : 'pointer', background: '#e2e8f0', color: '#334155' }}>Cancel</button>
                  <button type="button" disabled={galleryDeletingAll || galleryDeleteAllConfirmation !== 'DELETE'} onClick={() => void handleDeleteAllGalleryContent()} style={{ border: 0, borderRadius: 8, padding: '9px 13px', fontWeight: 700, cursor: galleryDeletingAll || galleryDeleteAllConfirmation !== 'DELETE' ? 'not-allowed' : 'pointer', background: galleryDeleteAllConfirmation === 'DELETE' ? '#b91c1c' : '#fecaca', color: '#fff' }}>
                    {galleryDeletingAll ? 'Deleting gallery...' : 'Permanently delete all'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleCreateGalleryAlbum} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, alignItems: 'end', padding: 16, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fafbfd' }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              New album event name
              <input required maxLength={120} value={galleryNewAlbumTitle} onChange={(event) => setGalleryNewAlbumTitle(event.target.value)} placeholder="Harvest of Amazing Grace 2026" style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Event date
              <input type="date" value={galleryNewAlbumDate} onChange={(event) => setGalleryNewAlbumDate(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Description (optional)
              <input maxLength={500} value={galleryNewAlbumDescription} onChange={(event) => setGalleryNewAlbumDescription(event.target.value)} placeholder="A short event description" style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <button type="submit" style={{ border: 0, borderRadius: 8, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', color: '#fff', background: '#1a2744' }}>Create album</button>
          </form>

          {galleryOpenAlbumId === null ? (
            <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Album folders</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
                  Search folders
                  <input type="search" value={galleryAlbumSearch} onChange={(event) => setGalleryAlbumSearch(event.target.value)} placeholder="Search albums..." style={{ width: '100%', minWidth: 0, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
                  Filter by event date
                  <input type="date" value={galleryAlbumDateFilter} onChange={(event) => setGalleryAlbumDateFilter(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {galleryAlbums
                  .filter((album) => album.title.toLowerCase().includes(galleryAlbumSearch.trim().toLowerCase()))
                  .filter((album) => !galleryAlbumDateFilter || album.date === galleryAlbumDateFilter)
                  .slice()
                  .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt))
                  .map((album) => (
                    <article key={album.id} style={{ display: 'grid', alignContent: 'start', gap: 10, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                      {album.coverImage
                        ? <img src={album.coverImage.thumbnailUrl} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                        : <div aria-hidden="true" style={{ display: 'grid', placeItems: 'center', height: 140, background: '#f1f5f9', color: '#64748b', fontSize: 32 }}>▰</div>}
                      <div style={{ display: 'grid', gap: 4, padding: '0 12px' }}>
                        <strong style={{ overflowWrap: 'anywhere' }}>{album.title}</strong>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{album.date || 'No event date'} · {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}{album.isFeatured ? ' · Featured' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 12px 12px' }}>
                        <button type="button" onClick={() => { setGalleryOpenAlbumId(album.id); setGallerySelectedAlbumId(album.id); }} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#dbeafe', color: '#1e3a8a' }}>Open folder</button>
                        <button type="button" onClick={() => setGallerySelectedAlbumId(album.id)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: gallerySelectedAlbumId === album.id ? '#dcfce7' : '#f1f5f9', color: gallerySelectedAlbumId === album.id ? '#166534' : '#334155' }}>
                          {gallerySelectedAlbumId === album.id ? 'Upload folder selected' : 'Use for uploads'}
                        </button>
                        <button type="button" onClick={() => handleStartGalleryAlbumEdit(album)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#f1f5f9', color: '#334155' }}>Rename / edit</button>
                        <button type="button" onClick={() => void handleFeatureGalleryAlbum(album)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>{album.isFeatured ? 'Unfeature album' : 'Feature album'}</button>
                        {album.slug !== 'uncategorized' && <button type="button" onClick={() => void handleDeleteGalleryAlbum(album)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Delete album</button>}
                      </div>
                    </article>
                  ))}
              </div>
              {!galleryAlbums.length && <p style={{ margin: 0, color: '#64748b' }}>Loading folders...</p>}
              {galleryAlbums.length > 0 && !galleryAlbums.some((album) => album.title.toLowerCase().includes(galleryAlbumSearch.trim().toLowerCase()) && (!galleryAlbumDateFilter || album.date === galleryAlbumDateFilter)) && <p style={{ margin: 0, color: '#64748b' }}>No folders match these filters.</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 18, padding: 14, border: '1px solid #bfdbfe', borderRadius: 12, background: '#eff6ff' }}>
              <div>
                <button type="button" onClick={() => setGalleryOpenAlbumId(null)} style={{ border: 0, padding: 0, marginBottom: 8, background: 'transparent', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>← All folders</button>
                <h3 style={{ margin: 0, fontSize: 18 }}>{openGalleryAlbum?.title || 'Gallery folder'}</h3>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>{openGalleryAlbum?.photoCount ?? openGalleryPhotos.length} photos in this folder</p>
              </div>
              {openGalleryAlbum && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" onClick={() => handleStartGalleryAlbumEdit(openGalleryAlbum)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#334155' }}>Rename / edit</button>
                  {openGalleryAlbum.slug !== 'uncategorized' && <button type="button" onClick={() => void handleDeleteGalleryAlbum(openGalleryAlbum)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Delete folder</button>}
                </div>
              )}
            </div>
          )}

          {galleryAlbumEditId !== null && (
            <form onSubmit={handleSaveGalleryAlbum} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, alignItems: 'end', marginTop: 18, padding: 16, border: '1px solid #f2d574', borderRadius: 14, background: '#fffbeb' }}>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Event name
                <input required maxLength={120} value={galleryAlbumEditTitle} onChange={(event) => setGalleryAlbumEditTitle(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Event date
                <input type="date" value={galleryAlbumEditDate} onChange={(event) => setGalleryAlbumEditDate(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Description
                <input maxLength={500} value={galleryAlbumEditDescription} onChange={(event) => setGalleryAlbumEditDescription(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={{ border: 0, borderRadius: 8, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', color: '#fff', background: '#1a2744' }}>Save changes</button>
                <button type="button" onClick={() => setGalleryAlbumEditId(null)} style={{ border: 0, borderRadius: 8, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Cancel</button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Album for these uploads
              <select required value={gallerySelectedAlbumId ?? ''} onChange={(event) => setGallerySelectedAlbumId(event.target.value ? Number(event.target.value) : null)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                <option value="" disabled>Choose an album folder</option>
                {galleryAlbums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Choose multiple photos or a photo folder
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
                disabled={gallerySaving || gallerySelectedAlbumId === null}
              />
            </label>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
              Select several photos or a whole folder to keep them together in the chosen album. JPG, PNG, and WebP images up to 5 MB each are accepted; videos are not supported yet. Uploaded images start as drafts.
            </p>
            {galleryError && <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>{galleryError}</p>}
            {galleryMessage && <p role="status" style={{ margin: 0, color: '#166534', fontSize: 13 }}>{galleryMessage}</p>}
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{galleryOpenAlbumId === null ? 'Photos' : `Photos in ${openGalleryAlbum?.title || 'folder'}`}</h3>
            {galleryOpenAlbumId === null
              ? <p style={{ margin: 0, color: '#64748b' }}>Open an album folder above to view and manage its photos.</p>
              : openGalleryPhotos.length === 0
                ? <p style={{ margin: 0, color: '#64748b' }}>This folder is empty. Select it for uploads and add photos above.</p>
                : openGalleryPhotos.map((image) => (
              <div key={image.id} style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', alignItems: 'center', gap: 12, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                <img src={image.thumbnailUrl} alt="" style={{ width: 88, height: 66, borderRadius: 8, objectFit: 'cover' }} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ overflowWrap: 'anywhere' }}>{image.caption}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{image.isFeatured ? 'Featured display photo · ' : ''}{image.status}</div>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
                  <label style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', gap: 8, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                    Album
                    <select value={image.albumId ?? ''} onChange={(event) => { if (event.target.value) void handleMoveGalleryImage(image, Number(event.target.value)); }} style={{ minWidth: 0, width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                      <option value="" disabled>Select album</option>
                      {galleryAlbums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
                    </select>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {image.albumId !== null && <button type="button" onClick={() => void handleSetGalleryAlbumCover(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>Set as album cover</button>}
                    {image.status === 'Published' && !image.isFeatured && (
                      <button type="button" onClick={() => void handleFeatureGalleryImage(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>
                        Feature photo
                      </button>
                    )}
                    <button type="button" onClick={() => void handleGalleryStatus(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: image.status === 'Published' ? '#fef3c7' : '#dcfce7', color: image.status === 'Published' ? '#92400e' : '#166534' }}>
                      {image.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => void handleDeleteGalleryImage(image.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
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
                Article picture
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    void handleArticleImageUpload(file);
                  }}
                  style={{ width: '100%', fontSize: 13, fontWeight: 400 }}
                />
              </label>
              {articleImageData && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <img src={articleImageData} alt="Article image preview" style={{ maxHeight: 220, width: '100%', borderRadius: 8, objectFit: 'cover' }} />
                  <button type="button" onClick={() => setArticleImageData('')} style={{ justifySelf: 'start', background: '#eef2f7', color: '#1a2744', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Remove picture</button>
                </div>
              )}
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
                {articleImageData && <img src={articleImageData} alt="" style={{ maxHeight: 220, width: '100%', marginBottom: 12, borderRadius: 8, objectFit: 'cover' }} />}
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
                      <div key={article.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderLeft: '3px solid #d4af37', padding: '6px 0 6px 10px' }}>
                        <div>
                          <strong>{article.title}</strong>
                          <div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>{article.publishDate}{article.publishDate > getTodayInAbuja() ? ' · Scheduled' : ' · On blog'}</div>
                        </div>
                        <button type="button" onClick={() => void handleDeleteArticle(article.id)} style={{ flexShrink: 0, border: 0, borderRadius: 6, padding: '6px 9px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
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
  const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
  const isDominusRoute = currentPath === '/dominus' || currentPath.startsWith('/dominus/');
  const isGalleryRoute = currentPath === '/gallery' || currentPath.startsWith('/gallery/');

  if (isDominusRoute) {
    return <DominusDashboard />;
  }
  if (isGalleryRoute) {
    const albumSlug = currentPath.startsWith('/gallery/') ? decodeURIComponent(currentPath.slice('/gallery/'.length)) : undefined;
    return <GalleryPage albumSlug={albumSlug} />;
  }

  return (
    <div className="min-h-screen">
      <div>
        <Navbar />
        <HeroSection />
        <AboutSection />
        <PastoralTeamSection />
        <ActivitiesSection />
        <CommitteesSection />
        <CommunitySection />
        <EventsSection />
        <GallerySection />
        <ArticlesSection />
        <OfficeHoursSection />
        <ContactSection />
        <Footer />
      </div>
      <BackToTop />
    </div>
  );
}