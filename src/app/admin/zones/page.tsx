'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Zone } from '@/lib/types/database';

export default function AdminZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', zoning_type: '', base_price: '', lot_size_sqm: '', description: '' });

  const loadZones = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('zones').select('*').order('name');
    if (data) setZones(data as unknown as Zone[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadZones(); }, [loadZones]);

  async function handleSave(zoneId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('zones').update({
      name: form.name,
      zoning_type: form.zoning_type,
      base_price: parseInt(form.base_price),
      lot_size_sqm: parseInt(form.lot_size_sqm),
      description: form.description,
    }).eq('id', zoneId);
    if (error) alert('Error: ' + error.message);
    else { setEditingId(null); await loadZones(); }
  }

  if (loading) return <div className="text-slate-400 py-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Zone Management</h1>
      <div className="grid gap-4">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-white border border-slate-200 rounded-xl p-6">
            {editingId === zone.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Zoning Type</label>
                    <input value={form.zoning_type} onChange={(e) => setForm({ ...form, zoning_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Base Price ($)</label>
                    <input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Lot Size (m²)</label>
                    <input type="number" value={form.lot_size_sqm} onChange={(e) => setForm({ ...form, lot_size_sqm: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(zone.id)} className="px-4 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{zone.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {zone.zoning_type} &bull; {zone.lot_size_sqm} m² &bull; Base: ${zone.base_price.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-400 mt-2 max-w-xl">{zone.description}</p>
                </div>
                <button
                  onClick={() => { setEditingId(zone.id); setForm({ name: zone.name, zoning_type: zone.zoning_type, base_price: String(zone.base_price), lot_size_sqm: String(zone.lot_size_sqm), description: zone.description || '' }); }}
                  className="px-4 py-2 text-sky-600 text-sm font-medium hover:bg-sky-50 rounded-lg transition"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
