CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  status VARCHAR(30) DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sources (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  publisher VARCHAR(200),
  country VARCHAR(100),
  source_type VARCHAR(80),
  notes TEXT
);

CREATE TABLE liturgical_entries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(80) NOT NULL,
  rank VARCHAR(80),
  liturgical_color VARCHAR(20),
  description TEXT,
  source_id VARCHAR(100) REFERENCES sources(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE parish_announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE site_content (
  id SERIAL PRIMARY KEY,
  section VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  title VARCHAR(255),
  body TEXT,
  status VARCHAR(30) DEFAULT 'draft',
  updated_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  table_name VARCHAR(100) NOT NULL,
  record_id INT,
  action VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE site_health (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(120) NOT NULL,
  metric_value TEXT,
  status VARCHAR(30) NOT NULL,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description) VALUES
  ('dominus', 'Full access to manage parish announcements, review site functionality, monitor health, and oversee the full dashboard'),
  ('editor', 'Can update parish content and announcements'),
  ('viewer', 'Read-only access for dashboard reporting');

INSERT INTO sources (id, name, publisher, country, source_type, notes)
VALUES (
  'nigerian-ordo-2025',
  'Official Ordo Booklet',
  'Catholic Bishops'' Conference of Nigeria',
  'Nigeria',
  'official_liturgical_calendar',
  'Authoritative liturgical source for the Nigerian Catholic calendar.'
);
