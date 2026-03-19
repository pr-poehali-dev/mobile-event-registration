CREATE TABLE t_p78076459_mobile_event_registr.teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES t_p78076459_mobile_event_registr.events(id),
  user_id INTEGER NOT NULL REFERENCES t_p78076459_mobile_event_registr.users(id),
  team_name TEXT NOT NULL,
  tg_contact TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  slots_count INTEGER NOT NULL DEFAULT 1,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p78076459_mobile_event_registr.slots (
  id SERIAL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES t_p78076459_mobile_event_registr.teams(id),
  slot_number INTEGER NOT NULL,
  is_reserve BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE t_p78076459_mobile_event_registr.participants (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES t_p78076459_mobile_event_registr.slots(id),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);