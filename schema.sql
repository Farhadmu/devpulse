-- DevPulse Database Schema
-- Run this script once to initialize your PostgreSQL database

-- ─── Users Table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255)        NOT NULL,
  email      VARCHAR(255)        NOT NULL UNIQUE,
  password   VARCHAR(255)        NOT NULL,
  role       VARCHAR(20)         NOT NULL DEFAULT 'contributor'
               CHECK (role IN ('contributor', 'maintainer')),
  created_at TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ─── Issues Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(150)        NOT NULL,
  description TEXT                NOT NULL
                CHECK (char_length(description) >= 20),
  type        VARCHAR(20)         NOT NULL
                CHECK (type IN ('bug', 'feature_request')),
  status      VARCHAR(20)         NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved')),
  reporter_id INTEGER             NOT NULL,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ─── Auto-update updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS issues_updated_at ON issues;
CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
