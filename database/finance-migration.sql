-- Executar no Neon SQL Editor antes de usar o resumo financeiro.
CREATE TABLE IF NOT EXISTS finance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  bank_cents INTEGER NOT NULL DEFAULT 0,
  home_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_settings_singleton CHECK (id = 1)
);
