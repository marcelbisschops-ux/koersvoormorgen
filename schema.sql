-- KantoorInzicht D1 Database Schema
-- Gebruik: wrangler d1 execute kantoorinzicht --file=schema.sql
-- Versie: 1.1 - Mei 2026

-- ============================================================
-- SCAN MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  dashboard_public INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scans (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id),
  office_name  TEXT,
  office_email TEXT,
  region      TEXT,
  fte         TEXT,
  revenue     TEXT,
  scores      TEXT NOT NULL,   -- JSON
  overall     INTEGER NOT NULL,
  top_scenario TEXT,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scans_group ON scans(group_id);
CREATE INDEX IF NOT EXISTS idx_scans_email ON scans(office_email);
CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at);

CREATE TABLE IF NOT EXISTS rapporten (
  scan_id    TEXT PRIMARY KEY REFERENCES scans(id),
  rapport    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rapport_usage (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rapport_usage_email ON rapport_usage(email);
CREATE INDEX IF NOT EXISTS idx_rapport_usage_ip ON rapport_usage(ip);

CREATE TABLE IF NOT EXISTS callbacks (
  id         TEXT PRIMARY KEY,
  naam       TEXT,
  tel        TEXT,
  email      TEXT,
  tijd       TEXT,
  kantoor    TEXT,   -- JSON
  totaal     INTEGER,
  scenario   TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_callbacks_email ON callbacks(email);

-- ============================================================
-- M&A MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS mna_trajecten (
  id              TEXT PRIMARY KEY,   -- verkoper-toegangscode (bijv. ABC123)
  kantoor_naam    TEXT NOT NULL,
  contact_naam    TEXT,
  contact_email   TEXT,
  traject_type    TEXT DEFAULT 'Verkoop',
  notitie         TEXT,
  status          TEXT DEFAULT 'actief',  -- actief | in_behandeling | vergrendeld | afgerond
  koper_code      TEXT,
  tussen_code     TEXT,
  vergrendeld_op  INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mna_email ON mna_trajecten(contact_email);
CREATE INDEX IF NOT EXISTS idx_mna_status ON mna_trajecten(status);

CREATE TABLE IF NOT EXISTS mna_data (
  id              TEXT PRIMARY KEY,   -- traject_id + '_' + fase_id
  traject_id      TEXT NOT NULL REFERENCES mna_trajecten(id),
  fase_id         TEXT NOT NULL,
  data_json       TEXT,               -- JSON veldwaarden
  checklist_json  TEXT,               -- JSON checklist-items
  notitie         TEXT,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mna_data_traject ON mna_data(traject_id);

CREATE TABLE IF NOT EXISTS mna_documenten (
  id              TEXT PRIMARY KEY,
  traject_id      TEXT NOT NULL REFERENCES mna_trajecten(id),
  fase_id         TEXT NOT NULL,
  bestand_naam    TEXT NOT NULL,
  bestand_type    TEXT,
  bestand_grootte INTEGER,
  r2_key          TEXT,
  bewaard         INTEGER DEFAULT 0,
  analyse         TEXT,               -- AI-analyse output
  veld_extractie  TEXT,               -- JSON geextraheerde velden
  methode         TEXT,               -- pdf_direct | pdf_large | text_extract | word
  uploaded_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mna_docs_traject ON mna_documenten(traject_id);
CREATE INDEX IF NOT EXISTS idx_mna_docs_fase ON mna_documenten(traject_id, fase_id);

-- ============================================================
-- M&A GROEPEN MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS mna_groepen (
  id            TEXT PRIMARY KEY,
  naam          TEXT NOT NULL,
  omschrijving  TEXT,
  tussen_code   TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mna_groep_trajecten (
  id          TEXT PRIMARY KEY,   -- groep_id + '_' + traject_id
  groep_id    TEXT NOT NULL REFERENCES mna_groepen(id),
  traject_id  TEXT NOT NULL REFERENCES mna_trajecten(id),
  added_at    INTEGER NOT NULL
);

-- ============================================================
-- AVG / PRIVACY MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS avg_verwijder_log (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_avg_log_ip ON avg_verwijder_log(ip, created_at);
