CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR REPLACE INTO admin_users (id, email, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'sahar@rossimissionsf.com',
  'pbkdf2$100000$3AJ/ZxH5tcJ1E1/BEe11FQ==$wCVaxZT2EL3SO6uIql2HgK16LKNEBX8gRx1zMYIQvIo='
);
