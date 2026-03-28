CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jwt_id TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL DEFAULT 28,
  monthly_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monthly_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_investments JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_profile TEXT NOT NULL DEFAULT 'moderate',
  primary_concern TEXT NOT NULL DEFAULT '',
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
