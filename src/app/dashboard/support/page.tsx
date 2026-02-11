'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupportTicket, TicketMessage } from '@/lib/types/database';

const CATEGORIES = ['Payment Issue', 'Reservation Question', 'Document Help', 'Map / Technical', 'Account Issue', 'Other'];
const FAQ_ARTICLES = [
  { title: 'How to reserve a lot', href: '#' },
  { title: 'Payment methods accepted', href: '#' },
  { title: 'Document requirements', href: '#' },
  { title: 'Using the interactive map', href: '#' },
  { title: 'Account security tips', href: '#' },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [preferredContact, setPreferredContact] = useState('email');
  const [bestTime, setBestTime] = useState('morning');
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const loadTickets = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setTickets(data as unknown as SupportTicket[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function loadMessages(ticketId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at');
    if (data) setMessages(data as unknown as TicketMessage[]);
  }

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: ticket, error } = await supabase.from('support_tickets')
      .insert({
        user_id: user.id,
        category,
        priority,
        subject,
        description,
        preferred_contact: preferredContact,
        best_time: bestTime,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
    } else {
      // Add initial message
      if (description && ticket) {
        await supabase.from('ticket_messages').insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: description,
          is_admin: false,
        });
      }
      setCategory('');
      setSubject('');
      setDescription('');
      setPriority('normal');
      await loadTickets();
    }
    setSubmitting(false);
  }

  async function handleSendMessage() {
    if (!selectedTicket || !newMessage.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: newMessage.trim(),
      is_admin: false,
    });

    setNewMessage('');
    await loadMessages(selectedTicket.id);
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'resolved': case 'closed': return 'bg-slate-100 text-slate-500';
      case 'waiting_on_user': return 'bg-amber-100 text-amber-700';
      case 'open': return 'bg-sky-100 text-sky-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'waiting_on_user': return 'Waiting on You';
      case 'waiting_on_support': return 'In Progress';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  if (loading) return <div className="text-slate-400 py-8">Loading...</div>;

  // Ticket detail view
  if (selectedTicket) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => setSelectedTicket(null)} className="text-sm text-sky-600 hover:underline mb-4">
          &larr; Back to tickets
        </button>
        <h1 className="text-xl font-bold text-slate-800 mb-1">{selectedTicket.subject}</h1>
        <div className="flex gap-2 mb-6">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(selectedTicket.status)}`}>
            {getStatusLabel(selectedTicket.status)}
          </span>
          <span className="text-xs text-slate-400">#{selectedTicket.id.slice(0, 8)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`p-4 rounded-lg ${msg.is_admin ? 'bg-sky-50 border border-sky-200' : 'bg-slate-50'}`}>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">{msg.is_admin ? 'Support Team' : 'You'}</span>
                  <span>{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-700">{msg.message}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No messages yet</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
          />
          <button
            onClick={handleSendMessage}
            className="px-6 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Contact Support</h1>
          <p className="text-sm text-slate-500">
            Get help with reservations, payments, documents, and your account.
            <br />Business hours: Mon-Fri 8AM-6PM PST &bull; Phone: (555) 123-4567
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5">
            📞 Call Us
          </button>
          <button className="px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition">
            Start Live Chat
          </button>
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Available
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Ticket Form */}
        <div className="col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Get Help</h2>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white outline-none focus:border-sky-500"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Priority</label>
                <div className="flex gap-4 mt-1">
                  {(['normal', 'urgent'] as const).map((p) => (
                    <label key={p} className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                      <input type="radio" checked={priority === p} onChange={() => setPriority(p)} className="accent-slate-700" />
                      {p.charAt(0).toUpperCase() + p.slice(1)} {p === 'urgent' && <span className="text-slate-400">(6-hours)</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Brief description of your issue"
                  className="mt-1 w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Describe the issue</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder="Please provide as much detail as possible..."
                  className="mt-1 w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Preferred contact method</label>
                <div className="flex gap-4 mt-1">
                  {['Email', 'Phone', 'WhatsApp'].map((m) => (
                    <label key={m} className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        checked={preferredContact === m.toLowerCase()}
                        onChange={() => setPreferredContact(m.toLowerCase())}
                        className="accent-slate-700"
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Best time to reach you</label>
                <div className="flex gap-2 mt-1">
                  {[
                    { val: 'morning', label: 'Morning (8AM-12PM)' },
                    { val: 'afternoon', label: 'Afternoon (12-5PM)' },
                    { val: 'evening', label: 'Evening (5-8PM)' },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setBestTime(t.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        bestTime === t.val
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 self-center">Pacific Time (PST)</span>
                </div>
              </div>

              {/* Attachments placeholder */}
              <div>
                <label className="text-sm font-semibold text-slate-700">Attachments</label>
                <div className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
                  <p className="text-2xl mb-1">☁️</p>
                  <p className="text-sm">Drag & drop files here or click to browse</p>
                  <p className="text-xs mt-1">PDF, JPG, PNG, MP4. Max 10 MB each.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Create Ticket'}
              </button>
              <p className="text-xs text-slate-400">Typical reply: within 1 business day.</p>
            </form>
          </div>
        </div>

        {/* Sidebar: FAQ & Status */}
        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
            <h3 className="font-bold text-slate-700 mb-3">Suggested Articles</h3>
            <div className="space-y-2">
              {FAQ_ARTICLES.map((article) => (
                <a key={article.title} href={article.href} className="block text-sm text-sky-600 hover:underline">
                  {article.title}
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
            <h3 className="font-bold text-slate-700 mb-3">System Status</h3>
            <div className="text-sm space-y-2">
              {['Payments', 'Map', 'Documents', 'Login'].map((s) => (
                <div key={s} className="flex justify-between">
                  <span className="text-slate-600">{s}</span>
                  <span className="text-green-600">Operational</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-700 mb-3">Business Hours</h3>
            <div className="text-sm text-slate-500 space-y-1">
              <p>Monday - Friday: 8AM - 6PM PST</p>
              <p>Saturday: 9AM - 3PM PST</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Support Requests */}
      {tickets.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Previous Support Requests</h2>
          <div className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between py-4 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                onClick={() => { setSelectedTicket(ticket); loadMessages(ticket.id); }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-700">
                      #{ticket.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{ticket.subject}</p>
                  {ticket.category && (
                    <p className="text-xs text-slate-400 mt-0.5">{ticket.category}</p>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Last update: {new Date(ticket.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
