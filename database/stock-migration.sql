-- Executar no Neon SQL Editor antes de publicar a gestão de stock.
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
