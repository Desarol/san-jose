-- ============================================================
-- Santo Tomas Nuevo - Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. ZONES
-- ────────────────────────────────────────────────────────────
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zoning_type TEXT NOT NULL DEFAULT 'Residential',
  base_price INTEGER NOT NULL DEFAULT 0,
  lot_size_sqm INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  corners JSONB NOT NULL DEFAULT '[]',
  images JSONB NOT NULL DEFAULT '[]',
  model_3d_url TEXT,
  camera_orbit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. LOTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE lots (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  size_sqm INTEGER NOT NULL DEFAULT 0,
  size_sqft NUMERIC GENERATED ALWAYS AS (size_sqm * 10.7639) STORED,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  coordinates JSONB NOT NULL DEFAULT '[]',
  center JSONB NOT NULL DEFAULT '[]',
  polygon JSONB NOT NULL DEFAULT '[]',
  grid_row INTEGER NOT NULL DEFAULT 0,
  grid_col INTEGER NOT NULL DEFAULT 0,
  feature_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lots_zone_id ON lots(zone_id);
CREATE INDEX idx_lots_status ON lots(status);

-- ────────────────────────────────────────────────────────────
-- 3. PROFILES (extends auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  date_of_birth DATE,
  citizenship TEXT,
  government_id_type TEXT,
  government_id_number TEXT,
  government_id_country TEXT,
  government_id_expiry DATE,
  address JSONB DEFAULT '{}',
  mailing_address JSONB DEFAULT '{}',
  mailing_same_as_residential BOOLEAN DEFAULT true,
  tax_residency TEXT,
  tax_id TEXT,
  purchasing_as TEXT DEFAULT 'individual' CHECK (purchasing_as IN ('individual', 'company')),
  payment_plan TEXT DEFAULT 'monthly',
  autopay BOOLEAN DEFAULT false,
  preferred_payment_method TEXT DEFAULT 'card',
  billing_email TEXT,
  emergency_contact JSONB DEFAULT '{}',
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'whatsapp')),
  secondary_phone TEXT,
  timezone TEXT DEFAULT 'America/Tijuana',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. RESERVATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired')),
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  reservation_fee NUMERIC NOT NULL DEFAULT 0,
  payment_plan TEXT DEFAULT 'monthly',
  next_payment_due DATE,
  expiry_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_lot_id ON reservations(lot_id);
CREATE INDEX idx_reservations_status ON reservations(status);

-- ────────────────────────────────────────────────────────────
-- 5. PAYMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT DEFAULT 'card',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);

-- ────────────────────────────────────────────────────────────
-- 6. DOCUMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'required')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);

-- ────────────────────────────────────────────────────────────
-- 7. SUPPORT TICKETS
-- ────────────────────────────────────────────────────────────
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting_on_user', 'waiting_on_support', 'resolved', 'closed')),
  lot_id TEXT REFERENCES lots(id),
  reservation_id UUID REFERENCES reservations(id),
  preferred_contact TEXT DEFAULT 'email',
  best_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- ────────────────────────────────────────────────────────────
-- 8. TICKET MESSAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- ────────────────────────────────────────────────────────────
-- 9. SAVED LOTS (favorites)
-- ────────────────────────────────────────────────────────────
CREATE TABLE saved_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lot_id)
);

CREATE INDEX idx_saved_lots_user_id ON saved_lots(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_lots_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Sync lot status when reservation changes
CREATE OR REPLACE FUNCTION sync_lot_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE lots SET status = 'reserved' WHERE id = NEW.lot_id;
  ELSIF NEW.status = 'completed' THEN
    UPDATE lots SET status = 'sold' WHERE id = NEW.lot_id;
  ELSIF NEW.status IN ('cancelled', 'expired') THEN
    -- Only set back to available if no other active reservations exist
    IF NOT EXISTS (
      SELECT 1 FROM reservations
      WHERE lot_id = NEW.lot_id
        AND id != NEW.id
        AND status IN ('pending', 'active')
    ) THEN
      UPDATE lots SET status = 'available' WHERE id = NEW.lot_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_reservation_status_change
  AFTER INSERT OR UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION sync_lot_status();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_lots ENABLE ROW LEVEL SECURITY;

-- Zones: publicly readable
CREATE POLICY "Zones are publicly readable" ON zones FOR SELECT USING (true);
CREATE POLICY "Admins can manage zones" ON zones FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Lots: publicly readable
CREATE POLICY "Lots are publicly readable" ON lots FOR SELECT USING (true);
CREATE POLICY "Admins can manage lots" ON lots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Profiles: users can read/update own, admins can read all
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Reservations: users see own, admins see all
CREATE POLICY "Users can read own reservations" ON reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reservations" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage reservations" ON reservations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Payments: users see own (via reservation), admins see all
CREATE POLICY "Users can read own payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM reservations WHERE id = payments.reservation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create payments" ON payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM reservations WHERE id = payments.reservation_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage payments" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Documents: users see own, admins see all
CREATE POLICY "Users can read own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage documents" ON documents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Support tickets: users see own, admins see all
CREATE POLICY "Users can read own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON support_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage tickets" ON support_tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Ticket messages: users see own ticket messages, admins see all
CREATE POLICY "Users can read own ticket messages" ON ticket_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create ticket messages" ON ticket_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage ticket messages" ON ticket_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Saved lots: users manage own
CREATE POLICY "Users can read own saved lots" ON saved_lots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save lots" ON saved_lots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave lots" ON saved_lots FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage saved lots" ON saved_lots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- STORAGE BUCKET for documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can read all documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
