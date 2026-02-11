'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/database';

interface AddressData {
  country?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface EmergencyContactData {
  full_name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data as unknown as Profile);
    setLoading(false);
  }

  async function saveProfile(updates: Partial<Profile>) {
    setSaving(true);
    setMessage('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) {
      setMessage('Error saving: ' + error.message);
    } else {
      setMessage('Profile updated successfully');
      setEditSection(null);
      await loadProfile();
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  }

  function Field({ label, value, required }: { label: string; value?: string | null; required?: boolean }) {
    return (
      <div>
        <label className="text-sm font-medium text-slate-600">
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
        <div className="mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 min-h-[40px]">
          {value || '—'}
        </div>
      </div>
    );
  }

  if (loading) return <div className="text-slate-400 py-8">Loading profile...</div>;
  if (!profile) return <div className="text-slate-400 py-8">Profile not found</div>;

  const address = (profile.address || {}) as AddressData;
  const emergency = (profile.emergency_contact || {}) as EmergencyContactData;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Profile Info</h1>
      <p className="text-sm text-slate-500 mb-6">
        Your legal details are used for reservations, purchase contracts, and payment schedules.
      </p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {/* Personal & Legal Details */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Personal & Legal Details</h2>
            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500">
              Identity Status: {profile.kyc_status === 'approved' ? 'Approved' : 'Pending'}
            </span>
          </div>
          <button
            onClick={() => setEditSection(editSection === 'personal' ? null : 'personal')}
            className="text-sm text-slate-500 hover:text-sky-600 transition"
          >
            Edit
          </button>
        </div>
        {editSection === 'personal' ? (
          <PersonalEditForm profile={profile} onSave={saveProfile} saving={saving} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Legal First Name" value={profile.full_name?.split(' ')[0]} required />
            <Field label="Legal Last Name" value={profile.full_name?.split(' ').slice(1).join(' ')} required />
            <Field label="Date of Birth" value={profile.date_of_birth} required />
            <Field label="Country of Citizenship" value={profile.citizenship} required />
            <Field label="Government ID Type" value={profile.government_id_type} />
            <Field label="Government ID Number" value={profile.government_id_number ? '••••••' + profile.government_id_number.slice(-4) : undefined} />
            <Field label="Issuing Country" value={profile.government_id_country} />
            <Field label="Expiry Date" value={profile.government_id_expiry} />
          </div>
        )}
      </section>

      {/* Contact Information */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Contact Information</h2>
          <button
            onClick={() => setEditSection(editSection === 'contact' ? null : 'contact')}
            className="text-sm text-slate-500 hover:text-sky-600 transition"
          >
            Edit
          </button>
        </div>
        {editSection === 'contact' ? (
          <ContactEditForm profile={profile} onSave={saveProfile} saving={saving} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Field label="Primary Email" value={profile.email} required />
              </div>
              <Field label="Primary Phone" value={profile.phone} required />
              <Field label="Secondary Phone" value={profile.secondary_phone} />
              <Field label="Time Zone" value={profile.timezone} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Preferred Contact Method</p>
              <div className="flex gap-4 text-sm text-slate-600">
                {['email', 'phone', 'whatsapp'].map((m) => (
                  <label key={m} className="flex items-center gap-1.5">
                    <input type="radio" checked={profile.preferred_contact_method === m} readOnly className="accent-slate-700" />
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Address */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Address</h2>
          <button
            onClick={() => setEditSection(editSection === 'address' ? null : 'address')}
            className="text-sm text-slate-500 hover:text-sky-600 transition"
          >
            Edit
          </button>
        </div>
        {editSection === 'address' ? (
          <AddressEditForm profile={profile} onSave={saveProfile} saving={saving} />
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700 mb-3">Residential Address</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Field label="Country" value={address.country} required />
              <Field label="Street Address" value={address.street} required />
              <Field label="City" value={address.city} required />
              <Field label="State/Province" value={address.state} required />
              <Field label="ZIP/Postal Code" value={address.zip} required />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={profile.mailing_same_as_residential} readOnly className="accent-slate-700" />
              Mailing address is the same
            </label>
          </>
        )}
      </section>

      {/* Residency & Tax */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Residency & Tax</h2>
            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500">
              KYC/AML Status: {profile.kyc_status === 'approved' ? 'Approved' : 'Pending'}
            </span>
          </div>
          <button onClick={() => setEditSection(editSection === 'tax' ? null : 'tax')} className="text-sm text-slate-500 hover:text-sky-600 transition">Edit</button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <Field label="Country of Tax Residency" value={profile.tax_residency} required />
          <Field label="Tax Identification Number" value={profile.tax_id ? '••••••' + profile.tax_id.slice(-4) : undefined} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">Purchasing as:</p>
          <div className="flex gap-4 text-sm text-slate-600">
            {['individual', 'company'].map((v) => (
              <label key={v} className="flex items-center gap-1.5">
                <input type="radio" checked={profile.purchasing_as === v} readOnly className="accent-slate-700" />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Preferences */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Payment Preferences & Billing</h2>
          <button onClick={() => setEditSection(editSection === 'payment' ? null : 'payment')} className="text-sm text-slate-500 hover:text-sky-600 transition">Edit</button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <Field label="Payment Plan" value={profile.payment_plan} />
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-600 mt-6">
              <input type="checkbox" checked={profile.autopay} readOnly className="accent-slate-700" />
              Autopay Enabled
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Preferred Payment Method</p>
            <p className="text-sm text-slate-700 mt-1">● {profile.preferred_payment_method || 'Card'}</p>
          </div>
          <Field label="Billing Email" value={profile.billing_email || profile.email} />
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Emergency Contact</h2>
          <button onClick={() => setEditSection(editSection === 'emergency' ? null : 'emergency')} className="text-sm text-slate-500 hover:text-sky-600 transition">Edit</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={emergency.full_name} />
          <Field label="Relationship" value={emergency.relationship} />
          <Field label="Phone" value={emergency.phone} />
          <Field label="Email" value={emergency.email} />
        </div>
      </section>

      {/* Security */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Security</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Password</p>
              <p className="text-sm text-slate-400">••••••••</p>
            </div>
            <button className="text-sm text-slate-500 hover:text-sky-600">Change</button>
          </div>
          <div className="flex justify-between items-center border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Two-Factor Authentication</p>
              <p className="text-sm text-slate-400">Off</p>
            </div>
            <button className="text-sm text-slate-500 hover:text-sky-600">Manage</button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">We never display full passwords.</p>
      </section>

      {/* Account Actions */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Account Actions</h2>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">
            Download My Data
          </button>
          <button className="px-4 py-2 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-50 transition">
            Deactivate Account
          </button>
        </div>
      </section>
    </div>
  );
}

// ──── Edit sub-forms ────

function PersonalEditForm({ profile, onSave, saving }: { profile: Profile; onSave: (u: Partial<Profile>) => Promise<void>; saving: boolean }) {
  const [firstName, setFirstName] = useState(profile.full_name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(profile.full_name?.split(' ').slice(1).join(' ') || '');
  const [dob, setDob] = useState(profile.date_of_birth || '');
  const [citizenship, setCitizenship] = useState(profile.citizenship || '');
  const [idType, setIdType] = useState(profile.government_id_type || '');
  const [idNumber, setIdNumber] = useState(profile.government_id_number || '');
  const [idCountry, setIdCountry] = useState(profile.government_id_country || '');
  const [idExpiry, setIdExpiry] = useState(profile.government_id_expiry || '');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Legal First Name" value={firstName} onChange={setFirstName} required />
        <Input label="Legal Last Name" value={lastName} onChange={setLastName} required />
        <Input label="Date of Birth" value={dob} onChange={setDob} type="date" required />
        <Input label="Country of Citizenship" value={citizenship} onChange={setCitizenship} required />
        <Input label="Government ID Type" value={idType} onChange={setIdType} />
        <Input label="Government ID Number" value={idNumber} onChange={setIdNumber} />
        <Input label="Issuing Country" value={idCountry} onChange={setIdCountry} />
        <Input label="Expiry Date" value={idExpiry} onChange={setIdExpiry} type="date" />
      </div>
      <button
        onClick={() => onSave({
          full_name: `${firstName} ${lastName}`.trim(),
          date_of_birth: dob || null,
          citizenship: citizenship || null,
          government_id_type: idType || null,
          government_id_number: idNumber || null,
          government_id_country: idCountry || null,
          government_id_expiry: idExpiry || null,
        })}
        disabled={saving}
        className="px-6 py-2 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function ContactEditForm({ profile, onSave, saving }: { profile: Profile; onSave: (u: Partial<Profile>) => Promise<void>; saving: boolean }) {
  const [phone, setPhone] = useState(profile.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(profile.secondary_phone || '');
  const [timezone, setTimezone] = useState(profile.timezone || '');
  const [contactMethod, setContactMethod] = useState(profile.preferred_contact_method || 'email');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Primary Phone" value={phone} onChange={setPhone} required />
        <Input label="Secondary Phone" value={secondaryPhone} onChange={setSecondaryPhone} />
        <Input label="Time Zone" value={timezone} onChange={setTimezone} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600 mb-2">Preferred Contact Method</p>
        <div className="flex gap-4 text-sm text-slate-600">
          {(['email', 'phone', 'whatsapp'] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={contactMethod === m} onChange={() => setContactMethod(m)} className="accent-slate-700" />
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </label>
          ))}
        </div>
      </div>
      <button
        onClick={() => onSave({ phone, secondary_phone: secondaryPhone || null, timezone: timezone || null, preferred_contact_method: contactMethod })}
        disabled={saving}
        className="px-6 py-2 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function AddressEditForm({ profile, onSave, saving }: { profile: Profile; onSave: (u: Partial<Profile>) => Promise<void>; saving: boolean }) {
  const addr = (profile.address || {}) as AddressData;
  const [country, setCountry] = useState(addr.country || '');
  const [street, setStreet] = useState(addr.street || '');
  const [city, setCity] = useState(addr.city || '');
  const [state, setState] = useState(addr.state || '');
  const [zip, setZip] = useState(addr.zip || '');
  const [mailingSame, setMailingSame] = useState(profile.mailing_same_as_residential);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Country" value={country} onChange={setCountry} required />
        <Input label="Street Address" value={street} onChange={setStreet} required />
        <Input label="City" value={city} onChange={setCity} required />
        <Input label="State/Province" value={state} onChange={setState} required />
        <Input label="ZIP/Postal Code" value={zip} onChange={setZip} required />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input type="checkbox" checked={mailingSame} onChange={(e) => setMailingSame(e.target.checked)} className="accent-slate-700" />
        Mailing address is the same
      </label>
      <button
        onClick={() => onSave({
          address: { country, street, city, state, zip },
          mailing_same_as_residential: mailingSame,
        })}
        disabled={saving}
        className="px-6 py-2 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-sky-500 transition"
      />
    </div>
  );
}
