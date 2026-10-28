-- Executar no Neon SQL Editor antes de usar "Não pago na totalidade".
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'notpaidyet';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_cents INTEGER NOT NULL DEFAULT 0;
