-- One row per phone that has alerts switched on.
CREATE TABLE devices (
  id          TEXT PRIMARY KEY,          -- random ID the app generates
  secret_hash TEXT NOT NULL,             -- SHA-256 of the app's secret; only that phone can change its row
  push_token  TEXT NOT NULL UNIQUE,      -- ExponentPushToken[...]
  lang        TEXT NOT NULL,             -- 'en' | 'bm'
  threshold   INTEGER NOT NULL,          -- 101 | 151 | 201 | 301 (US AQI)
  updated_at  TEXT NOT NULL
);

-- Stations each phone follows, including its current nearest station.
CREATE TABLE follows (
  device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,              -- WAQI station uid
  PRIMARY KEY (device_id, station_id)
);

-- Whether the last alert for a station said "above" or "back down", so we only alert on a change.
CREATE TABLE alert_state (
  device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  above      INTEGER NOT NULL,
  changed_at TEXT NOT NULL,
  PRIMARY KEY (device_id, station_id)
);

-- Expo push tickets waiting for a delivery receipt.
CREATE TABLE push_tickets (
  id         TEXT PRIMARY KEY,
  device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE INDEX follows_station ON follows(station_id);
CREATE INDEX push_tickets_created ON push_tickets(created_at);
