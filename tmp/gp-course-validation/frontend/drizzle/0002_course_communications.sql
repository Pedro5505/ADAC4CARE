CREATE TABLE IF NOT EXISTS gp_communications (
  id TEXT PRIMARY KEY NOT NULL,
  home_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('report', 'message')),
  request_json TEXT NOT NULL,
  record_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS gp_communications_home ON gp_communications(home_id, created_at);
