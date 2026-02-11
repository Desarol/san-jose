import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminOverview() {
  const supabase = await createClient();

  const [
    { count: totalLots },
    { count: availableLots },
    { count: reservedLots },
    { count: soldLots },
    { count: totalUsers },
    { count: activeReservations },
    { count: pendingDocs },
    { count: openTickets },
  ] = await Promise.all([
    supabase.from('lots').select('*', { count: 'exact', head: true }),
    supabase.from('lots').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('lots').select('*', { count: 'exact', head: true }).eq('status', 'reserved'),
    supabase.from('lots').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }).in('status', ['pending', 'active']),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'waiting_on_support']),
  ]);

  const cards = [
    { label: 'Total Lots', value: totalLots ?? 0, href: '/admin/lots', color: 'bg-sky-500' },
    { label: 'Available', value: availableLots ?? 0, href: '/admin/lots', color: 'bg-emerald-500' },
    { label: 'Reserved', value: reservedLots ?? 0, href: '/admin/reservations', color: 'bg-amber-500' },
    { label: 'Sold', value: soldLots ?? 0, href: '/admin/lots', color: 'bg-red-500' },
    { label: 'Users', value: totalUsers ?? 0, href: '/admin/users', color: 'bg-violet-500' },
    { label: 'Active Reservations', value: activeReservations ?? 0, href: '/admin/reservations', color: 'bg-orange-500' },
    { label: 'Pending Documents', value: pendingDocs ?? 0, href: '/admin/documents', color: 'bg-cyan-500' },
    { label: 'Open Tickets', value: openTickets ?? 0, href: '/admin/tickets', color: 'bg-pink-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Admin Overview</h1>
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${card.color}`} />
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-2">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
