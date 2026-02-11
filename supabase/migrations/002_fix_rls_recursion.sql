-- ============================================================
-- Fix RLS infinite recursion on profiles table
-- The admin check policies query profiles from within profiles,
-- causing infinite recursion. Use a SECURITY DEFINER function
-- that bypasses RLS to check admin role.
-- ============================================================

-- Create a helper function that checks if the current user is an admin
-- SECURITY DEFINER means it runs with the privileges of the function creator,
-- bypassing RLS on the profiles table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Drop old recursive policies ──────────────────────────────

-- Profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

-- Zones
DROP POLICY IF EXISTS "Admins can manage zones" ON zones;

-- Lots
DROP POLICY IF EXISTS "Admins can manage lots" ON lots;

-- Reservations
DROP POLICY IF EXISTS "Admins can manage reservations" ON reservations;

-- Payments
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;

-- Documents
DROP POLICY IF EXISTS "Admins can manage documents" ON documents;

-- Support tickets
DROP POLICY IF EXISTS "Admins can manage tickets" ON support_tickets;

-- Ticket messages
DROP POLICY IF EXISTS "Admins can manage ticket messages" ON ticket_messages;

-- Saved lots
DROP POLICY IF EXISTS "Admins can manage saved lots" ON saved_lots;

-- Storage
DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;

-- ── Recreate policies using is_admin() function ──────────────

-- Profiles: admins can read all and manage
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (public.is_admin());

-- Zones: admins can manage
CREATE POLICY "Admins can manage zones" ON zones FOR ALL USING (public.is_admin());

-- Lots: admins can manage
CREATE POLICY "Admins can manage lots" ON lots FOR ALL USING (public.is_admin());

-- Reservations: admins can manage
CREATE POLICY "Admins can manage reservations" ON reservations FOR ALL USING (public.is_admin());

-- Payments: admins can manage
CREATE POLICY "Admins can manage payments" ON payments FOR ALL USING (public.is_admin());

-- Documents: admins can manage
CREATE POLICY "Admins can manage documents" ON documents FOR ALL USING (public.is_admin());

-- Support tickets: admins can manage
CREATE POLICY "Admins can manage tickets" ON support_tickets FOR ALL USING (public.is_admin());

-- Ticket messages: admins can manage
CREATE POLICY "Admins can manage ticket messages" ON ticket_messages FOR ALL USING (public.is_admin());

-- Saved lots: admins can manage
CREATE POLICY "Admins can manage saved lots" ON saved_lots FOR ALL USING (public.is_admin());

-- Storage: admins can read all documents
CREATE POLICY "Admins can read all documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND public.is_admin());
