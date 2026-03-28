-- Tax tips (scoped per user; BIGINT user_id matches users.id)

CREATE TABLE IF NOT EXISTS tax_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(100),
  tip TEXT NOT NULL,
  potential_savings DECIMAL(12,2),
  is_dismissed BOOLEAN DEFAULT FALSE,
  tip_month DATE NOT NULL DEFAULT (DATE_TRUNC('month', CURRENT_DATE)::DATE),
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_tips_user_id ON tax_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_tips_user_month ON tax_tips(user_id, tip_month);
