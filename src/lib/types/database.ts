export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type LotStatus = 'available' | 'reserved' | 'sold';
export type UserRole = 'user' | 'admin';
export type ReservationStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'required';
export type TicketStatus = 'open' | 'waiting_on_user' | 'waiting_on_support' | 'resolved' | 'closed';
export type TicketPriority = 'normal' | 'urgent';
export type KycStatus = 'pending' | 'approved' | 'rejected';
export type ContactMethod = 'email' | 'phone' | 'whatsapp';
export type PurchasingAs = 'individual' | 'company';

export interface Zone {
  id: string;
  name: string;
  zoning_type: string;
  base_price: number;
  lot_size_sqm: number;
  description: string | null;
  corners: number[][];
  images: string[];
  model_3d_url: string | null;
  camera_orbit: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lot {
  id: string;
  zone_id: string;
  label: string;
  price: number;
  size_sqm: number;
  size_sqft: number;
  status: LotStatus;
  coordinates: number[][];
  center: number[];
  polygon: number[][];
  grid_row: number;
  grid_col: number;
  feature_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface LotWithZone extends Lot {
  zone: Zone;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  date_of_birth: string | null;
  citizenship: string | null;
  government_id_type: string | null;
  government_id_number: string | null;
  government_id_country: string | null;
  government_id_expiry: string | null;
  address: Json;
  mailing_address: Json;
  mailing_same_as_residential: boolean;
  tax_residency: string | null;
  tax_id: string | null;
  purchasing_as: PurchasingAs;
  payment_plan: string | null;
  autopay: boolean;
  preferred_payment_method: string | null;
  billing_email: string | null;
  emergency_contact: Json;
  preferred_contact_method: ContactMethod;
  secondary_phone: string | null;
  timezone: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  lot_id: string;
  status: ReservationStatus;
  amount_due: number;
  amount_paid: number;
  reservation_fee: number;
  payment_plan: string | null;
  next_payment_due: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithLot extends Reservation {
  lot: LotWithZone;
}

export interface Payment {
  id: string;
  reservation_id: string;
  amount: number;
  method: string | null;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  type: string;
  status: DocumentStatus;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category: string | null;
  priority: TicketPriority;
  subject: string;
  description: string | null;
  status: TicketStatus;
  lot_id: string | null;
  reservation_id: string | null;
  preferred_contact: string | null;
  best_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  attachments: Json;
  created_at: string;
}

export interface SavedLot {
  id: string;
  user_id: string;
  lot_id: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      zones: {
        Row: Zone;
        Insert: Partial<Zone> & { id: string; name: string };
        Update: Partial<Zone>;
        Relationships: [];
      };
      lots: {
        Row: Lot;
        Insert: Partial<Lot> & { id: string; zone_id: string; label: string };
        Update: Partial<Lot>;
        Relationships: [{ foreignKeyName: 'lots_zone_id_fkey'; columns: ['zone_id']; isOneToOne: false; referencedRelation: 'zones'; referencedColumns: ['id'] }];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      reservations: {
        Row: Reservation;
        Insert: Partial<Reservation> & { user_id: string; lot_id: string };
        Update: Partial<Reservation>;
        Relationships: [
          { foreignKeyName: 'reservations_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'reservations_lot_id_fkey'; columns: ['lot_id']; isOneToOne: false; referencedRelation: 'lots'; referencedColumns: ['id'] },
        ];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment> & { reservation_id: string; amount: number };
        Update: Partial<Payment>;
        Relationships: [{ foreignKeyName: 'payments_reservation_id_fkey'; columns: ['reservation_id']; isOneToOne: false; referencedRelation: 'reservations'; referencedColumns: ['id'] }];
      };
      documents: {
        Row: Document;
        Insert: Partial<Document> & { user_id: string; type: string };
        Update: Partial<Document>;
        Relationships: [{ foreignKeyName: 'documents_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
      };
      support_tickets: {
        Row: SupportTicket;
        Insert: Partial<SupportTicket> & { user_id: string; subject: string };
        Update: Partial<SupportTicket>;
        Relationships: [{ foreignKeyName: 'support_tickets_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
      };
      ticket_messages: {
        Row: TicketMessage;
        Insert: Partial<TicketMessage> & { ticket_id: string; sender_id: string; message: string };
        Update: Partial<TicketMessage>;
        Relationships: [
          { foreignKeyName: 'ticket_messages_ticket_id_fkey'; columns: ['ticket_id']; isOneToOne: false; referencedRelation: 'support_tickets'; referencedColumns: ['id'] },
          { foreignKeyName: 'ticket_messages_sender_id_fkey'; columns: ['sender_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      saved_lots: {
        Row: SavedLot;
        Insert: Partial<SavedLot> & { user_id: string; lot_id: string };
        Update: Partial<SavedLot>;
        Relationships: [
          { foreignKeyName: 'saved_lots_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'saved_lots_lot_id_fkey'; columns: ['lot_id']; isOneToOne: false; referencedRelation: 'lots'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
