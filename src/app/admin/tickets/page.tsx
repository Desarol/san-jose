'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TicketMessage } from '@/lib/types/database';

interface TicketRow {
  id: string;
  user_id: string;
  category: string | null;
  priority: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile: { full_name: string | null; email: string | null } | null;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState('');

  const loadTickets = useCallback(async () => {
    const supabase = createClient();
    const { data } = filter !== 'all'
      ? await supabase.from('support_tickets').select('*').eq('status', filter).order('created_at', { ascending: false })
      : await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (data) {
      const rows = data as unknown as TicketRow[];
      const userIds = [...new Set(rows.map((t) => t.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profileMap = new Map<string, TicketRow['profile']>((profiles || []).map((p: unknown) => {
        const prof = p as { id: string; full_name: string | null; email: string | null };
        return [prof.id, prof];
      }));
      setTickets(rows.map((t) => ({ ...t, profile: profileMap.get(t.user_id) || null })));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  async function loadMessages(ticketId: string) {
    const supabase = createClient();
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at');
    if (data) setMessages(data as unknown as TicketMessage[]);
  }

  async function handleReply() {
    if (!selectedTicket || !reply.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('ticket_messages').insert({ ticket_id: selectedTicket.id, sender_id: user.id, message: reply.trim(), is_admin: true });
    await supabase.from('support_tickets').update({ status: 'waiting_on_user' }).eq('id', selectedTicket.id);
    setReply('');
    await loadMessages(selectedTicket.id);
    await loadTickets();
  }

  async function updateTicketStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from('support_tickets').update({ status }).eq('id', id);
    await loadTickets();
    if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status });
  }

  if (loading) return <div className="text-slate-400 py-8">Loading...</div>;

  if (selectedTicket) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => setSelectedTicket(null)} className="text-sm text-sky-600 hover:underline mb-4">&larr; Back</button>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{selectedTicket.subject}</h1>
            <p className="text-sm text-slate-500 mt-1">
              By: {selectedTicket.profile?.full_name || selectedTicket.profile?.email} &bull; {selectedTicket.category} &bull; {selectedTicket.priority}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedTicket.status}
              onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="open">Open</option>
              <option value="waiting_on_user">Waiting on User</option>
              <option value="waiting_on_support">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`p-4 rounded-lg mb-3 ${msg.is_admin ? 'bg-sky-50 border border-sky-200' : 'bg-slate-50'}`}>
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">{msg.is_admin ? 'Admin' : 'User'}</span>
                <span>{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-700">{msg.message}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No messages</p>}
        </div>

        <div className="flex gap-2">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type admin reply..." rows={2} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500 resize-none" />
          <button onClick={handleReply} className="px-6 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-600 self-end py-2.5">Reply</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="waiting_on_user">Waiting on User</option>
          <option value="waiting_on_support">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedTicket(ticket); loadMessages(ticket.id); }}>
                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{ticket.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{ticket.profile?.full_name || ticket.profile?.email}</td>
                <td className="px-4 py-3 text-sm text-slate-800 font-medium">{ticket.subject}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{ticket.category}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{ticket.priority}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  ticket.status === 'open' ? 'bg-sky-100 text-sky-700' :
                  ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{ticket.status}</span></td>
                <td className="px-4 py-3 text-sm text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No tickets found</div>}
      </div>
    </div>
  );
}
