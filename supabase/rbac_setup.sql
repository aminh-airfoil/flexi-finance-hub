-- =============================================================================
-- Airfoil FinOps Hub — RBAC Setup SQL
-- Run once against the Supabase project via the SQL editor.
-- =============================================================================

-- ─── 1. Profiles table ────────────────────────────────────────────────────────
-- Maps auth.users.id (UUID) to FinOps roles.
-- This is the single source of truth for RBAC.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Auto-create profile on new auth user ──────────────────────────────────
-- Trigger: whenever a new user signs up (or is created via admin API),
-- insert a profile row with role = 'member'.
-- The owner's profile is seeded separately below.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 3. Seed owner profile ────────────────────────────────────────────────────
-- Upsert the owner's profile.
-- aminh@airfoil.studio signed in via Google OAuth → UUID 243b65e1-38f3-482c-86da-410b327a6ba3

INSERT INTO public.profiles (id, email, name, role)
VALUES ('243b65e1-38f3-482c-86da-410b327a6ba3', 'aminh@airfoil.studio', 'Amin Hakim', 'owner')
ON CONFLICT (id) DO UPDATE SET role = 'owner', name = 'Amin Hakim', updated_at = NOW();

-- ─── 4. Enable RLS on all FinOps tables ──────────────────────────────────────

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;

-- ─── 5. Helper function: get current user's role ──────────────────────────────
-- Used in RLS policies to avoid repeated subqueries.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ─── 6. RLS policies — transactions ──────────────────────────────────────────

DROP POLICY IF EXISTS "transactions_select"  ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert"  ON public.transactions;
DROP POLICY IF EXISTS "transactions_update"  ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete"  ON public.transactions;

-- All authenticated users can read all shared data (no per-user filtering — shared dashboard)
CREATE POLICY "transactions_select"
  ON public.transactions FOR SELECT TO authenticated USING (true);

-- Admin and owner can insert
CREATE POLICY "transactions_insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'owner'));

-- Admin and owner can update
CREATE POLICY "transactions_update"
  ON public.transactions FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'owner'));

-- Owner only can delete
CREATE POLICY "transactions_delete"
  ON public.transactions FOR DELETE
  USING (public.get_my_role() = 'owner');

-- ─── 7. RLS policies — categories ────────────────────────────────────────────

DROP POLICY IF EXISTS "categories_select"  ON public.categories;
DROP POLICY IF EXISTS "categories_insert"  ON public.categories;
DROP POLICY IF EXISTS "categories_update"  ON public.categories;
DROP POLICY IF EXISTS "categories_delete"  ON public.categories;

CREATE POLICY "categories_select"
  ON public.categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "categories_insert"
  ON public.categories FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'owner'));

CREATE POLICY "categories_update"
  ON public.categories FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'owner'));

CREATE POLICY "categories_delete"
  ON public.categories FOR DELETE
  USING (public.get_my_role() = 'owner');

-- ─── 8. RLS policies — accounts ──────────────────────────────────────────────

DROP POLICY IF EXISTS "accounts_select"  ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert"  ON public.accounts;
DROP POLICY IF EXISTS "accounts_update"  ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete"  ON public.accounts;

CREATE POLICY "accounts_select"
  ON public.accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "accounts_insert"
  ON public.accounts FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'owner'));

CREATE POLICY "accounts_update"
  ON public.accounts FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'owner'));

CREATE POLICY "accounts_delete"
  ON public.accounts FOR DELETE
  USING (public.get_my_role() = 'owner');

-- ─── 9. RLS policies — profiles ──────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"  ON public.profiles;

-- All authenticated users can read profiles (needed for team member list)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Users can only update their own profile (name, etc.)
-- Role changes go through the server-side API with service role key
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- =============================================================================
-- End of RBAC setup
-- =============================================================================
