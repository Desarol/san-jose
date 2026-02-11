'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ReservationRow {
  id: string;
  user_id: string;
  lot_id: string;
  status: string;
  amount_due: number;
  amount_paid: number;
  payment_plan: string | null;
  created_at: string;
  lot: { label: string; zone: { name: string } } | null;
  profile: { full_name: string | null; email: string | null } | null;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadReservations = useCallback(async () => {
    const supabase = createClient();
    const { data } = filter !== 'all'
      ? await supabase.from('reservations').select('*, lot:lots(label, zone:zones(name))').eq('status', filter).order('created_at', { ascending: false })
      : await supabase.from('reservations').select('*, lot:lots(label, zone:zones(name))').order('created_at', { ascending: false });

    if (data) {
      const rows = data as unknown as ReservationRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profileMap = new Map<string, ReservationRow['profile']>((profiles || []).map((p: unknown) => {
        const prof = p as { id: string; full_name: string | null; email: string | null };
        return [prof.id, prof];
      }));
      setReservations(rows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) || null })));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else await loadReservations();
  }

  if (loading) return <div className="text-slate-400 py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reservations</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lot</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Paid / Due</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reservations.map((res) => (
              <tr key={res.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{res.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{res.profile?.full_name || res.profile?.email || res.user_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{res.lot?.zone?.name} - {res.lot?.label}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    res.status === 'active' ? 'bg-sky-100 text-sky-700' :
                    res.status === 'completed' ? 'bg-green-100 text-green-700' :
                    res.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{res.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">${Number(res.amount_paid).toLocaleString()} / ${Number(res.amount_due).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{new Date(res.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {res.status === 'pending' && <button onClick={() => updateStatus(res.id, 'active')} className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded">Approve</button>}
                    {res.status === 'active' && <button onClick={() => updateStatus(res.id, 'completed')} className="px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 rounded">Complete</button>}
                    {['pending', 'active'].includes(res.status) && <button onClick={() => updateStatus(res.id, 'cancelled')} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Cancel</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reservations.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No reservations found</div>}
      </div>
    </div>
  );
}
