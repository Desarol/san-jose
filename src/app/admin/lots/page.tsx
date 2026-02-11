'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LotWithZone } from '@/lib/types/database';

export default function AdminLotsPage() {
  const [lots, setLots] = useState<LotWithZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadLots = useCallback(async () => {
    const supabase = createClient();
    const { data } = filter !== 'all'
      ? await supabase.from('lots').select('*, zone:zones(*)').eq('status', filter).order('feature_id')
      : await supabase.from('lots').select('*, zone:zones(*)').order('feature_id');
    if (data) setLots(data as unknown as LotWithZone[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  async function handleSave(lotId: string) {
    const supabase = createClient();
    const updates: Record<string, unknown> = {};
    if (editPrice) updates.price = parseInt(editPrice);
    if (editStatus) updates.status = editStatus;

    const { error } = await supabase.from('lots').update(updates).eq('id', lotId);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setEditingId(null);
      await loadLots();
    }
  }

  const filtered = lots.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.id.toLowerCase().includes(q) || l.label.toLowerCase().includes(q) || l.zone?.name.toLowerCase().includes(q);
  });

  if (loading) return <div className="text-slate-400 py-8">Loading lots...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Lot Management</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search lots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500 w-48"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Zone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Label</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Size</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((lot) => (
              <tr key={lot.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{lot.id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{lot.zone?.name}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{lot.label}</td>
                <td className="px-4 py-3 text-sm">
                  {editingId === lot.id ? (
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-200 rounded text-sm"
                    />
                  ) : (
                    <span className="text-emerald-600 font-medium">${lot.price.toLocaleString()}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{lot.size_sqm} m²</td>
                <td className="px-4 py-3">
                  {editingId === lot.id ? (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-sm bg-white"
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      lot.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                      lot.status === 'reserved' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {lot.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === lot.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleSave(lot.id)} className="px-3 py-1 bg-sky-500 text-white text-xs rounded hover:bg-sky-600">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-200 text-slate-600 text-xs rounded hover:bg-slate-300">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(lot.id); setEditPrice(String(lot.price)); setEditStatus(lot.status); }}
                      className="px-3 py-1 text-sky-600 text-xs font-medium hover:bg-sky-50 rounded transition"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No lots found</div>
        )}
      </div>
    </div>
  );
}
