CREATE TABLE t_p78076459_mobile_event_registr.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  tg_id TEXT UNIQUE,
  vk_id TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  tg_username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);