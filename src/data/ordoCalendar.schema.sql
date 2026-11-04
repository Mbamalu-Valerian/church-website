CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT,
  country TEXT,
  source_type TEXT,
  notes TEXT
);

CREATE TABLE ordo_calendar (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  group_name TEXT NOT NULL,
  category TEXT NOT NULL,
  liturgical_color TEXT NOT NULL,
  rank TEXT,
  featured INTEGER DEFAULT 0,
  source_id TEXT NOT NULL,
  source_label TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

INSERT INTO sources (id, name, publisher, country, source_type, notes)
VALUES (
  'nigerian-ordo-2025',
  'Official Ordo Booklet',
  'Catholic Bishops'' Conference of Nigeria',
  'Nigeria',
  'official_liturgical_calendar',
  'Authoritative source for liturgical dates and saints in the Nigerian Catholic context.'
);

INSERT INTO sources (id, name, publisher, country, source_type, notes)
VALUES (
  'local-parish-calendar',
  'Parish Calendar',
  'Holy Rosary Catholic Church',
  'Nigeria',
  'local_event_calendar',
  'Parish-only events and community gatherings.'
);
