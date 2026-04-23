-- ==================== FINOPS SCHEMA EXTENSION ====================
-- Branch: feature/supabase-baseline
-- Date: 2026-04-23
-- Purpose: Extend transactions and categories tables to support
--          full FinOps data model from Airtable Finance Records SG

-- ==================== TRANSACTIONS — FinOps columns ====================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS txn_id          TEXT,
  ADD COLUMN IF NOT EXISTS txn_type        TEXT,
  ADD COLUMN IF NOT EXISTS acc_type        TEXT,
  ADD COLUMN IF NOT EXISTS currency        TEXT,
  ADD COLUMN IF NOT EXISTS amount_original NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS fx_rate_to_usd  NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS amount_usd      NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS main_category   TEXT,
  ADD COLUMN IF NOT EXISTS sub_category    TEXT,
  ADD COLUMN IF NOT EXISTS detail_category TEXT,
  ADD COLUMN IF NOT EXISTS card_holder     TEXT,
  ADD COLUMN IF NOT EXISTS card_name       TEXT,
  ADD COLUMN IF NOT EXISTS balance         NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS source          TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS period_month    TEXT,
  ADD COLUMN IF NOT EXISTS period_year     TEXT;

-- Deduplication constraint: prevents re-importing the same Airtable record
ALTER TABLE public.transactions
  ADD CONSTRAINT uq_txn_id_source UNIQUE (txn_id, source);

-- Performance indexes for FinOps query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_period
  ON public.transactions(period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_transactions_main_category
  ON public.transactions(user_id, main_category);

CREATE INDEX IF NOT EXISTS idx_transactions_txn_type
  ON public.transactions(user_id, txn_type);

CREATE INDEX IF NOT EXISTS idx_transactions_source
  ON public.transactions(source);

CREATE INDEX IF NOT EXISTS idx_transactions_currency
  ON public.transactions(currency);

-- ==================== CATEGORIES — hierarchy metadata ====================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS level        INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category_key TEXT;

-- Unique constraint for upsert support during category seed import
ALTER TABLE public.categories
  ADD CONSTRAINT uq_category_key_user UNIQUE (user_id, category_key);
