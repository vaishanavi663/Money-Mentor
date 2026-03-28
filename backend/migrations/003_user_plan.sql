-- Subscription plan on users (source of truth for feature gates)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

UPDATE users SET plan = 'free' WHERE plan IS NOT NULL AND plan NOT IN ('free', 'pro');
