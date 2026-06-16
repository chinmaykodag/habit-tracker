-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- It creates the four tables and locks each one down with RLS so users
-- can only ever read/write their own rows.

-- ─── Habits ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS habits (
  id           TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  color        TEXT,
  icon         TEXT,
  category_id  TEXT,
  frequency    JSONB       NOT NULL DEFAULT '{"type":"daily"}',
  created_at   TIMESTAMPTZ NOT NULL,
  archived_at  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits: owner full access"
  ON habits FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Categories ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: owner full access"
  ON categories FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Completions ─────────────────────────────────────────────────────────────
-- One row per (user, habit, date). Toggle = INSERT or DELETE.

CREATE TABLE IF NOT EXISTS completions (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id  TEXT NOT NULL,
  date      DATE NOT NULL,
  PRIMARY KEY (user_id, habit_id, date)
);

ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completions: owner full access"
  ON completions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── User settings ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  user_id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme          TEXT        NOT NULL DEFAULT 'system',
  accent         TEXT        NOT NULL DEFAULT 'sage',
  week_starts_on INT         NOT NULL DEFAULT 1,
  stats_order    JSONB,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings: owner full access"
  ON user_settings FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
