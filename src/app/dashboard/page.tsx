import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user data
  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, lot:lots(*, zone:zones(*))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user!.id);

  const { data: savedLots } = await supabase
    .from('saved_lots')
    .select('*, lot:lots(*, zone:zones(*))')
    .eq('user_id', user!.id);

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user!.id)
    .in('status', ['open', 'waiting_on_user', 'waiting_on_support']);

  const activeReservations = (reservations || []).filter((r) => r.status === 'active' || r.status === 'pending');
  const completedReservations = (reservations || []).filter((r) => r.status === 'completed');
  const approvedDocs = (documents || []).filter((d) => d.status === 'approved').length;
  const totalDocs = (documents || []).length || 6;

  // Alerts
  const alerts: { text: string; action: string; href: string; type: string }[] = [];
  const pendingPayment = activeReservations.find((r) => r.amount_paid < r.amount_due);
  if (pendingPayment) {
    alerts.push({
      text: `$${Number(pendingPayment.amount_due - pendingPayment.amount_paid).toLocaleString()} due ${pendingPayment.next_payment_due ? `on ${new Date(pendingPayment.next_payment_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'soon'}`,
      action: 'Pay now',
      href: '/dashboard/lots',
      type: 'payment',
    });
  }
  const pendingDocs = (documents || []).filter((d) => d.status === 'required' || d.status === 'pending');
  if (pendingDocs.length > 0) {
    alerts.push({
      text: `${pendingDocs.length} documents required`,
      action: 'Upload',
      href: '/dashboard/documents',
      type: 'document',
    });
  }
  const expiringRes = activeReservations.find((r) => {
    if (!r.expiry_date) return false;
    const daysLeft = Math.ceil((new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  });
  if (expiringRes) {
    const daysLeft = Math.ceil((new Date(expiringRes.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    alerts.push({
      text: `Your property reservation expires in ${daysLeft} days`,
      action: 'Review',
      href: '/dashboard/lots',
      type: 'expiry',
    });
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">User Home</h1>

      {/* Alert banners */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm"
            >
              <span className="text-slate-500">●</span>
              <span className="text-slate-600">{alert.text}</span>
              <Link
                href={alert.href}
                className="bg-slate-700 text-white text-xs font-semibold px-3 py-1 rounded-md hover:bg-slate-600 transition"
              >
                {alert.action}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Required Documents</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div
                className="bg-slate-700 h-2 rounded-full"
                style={{ width: `${(approvedDocs / totalDocs) * 100}%` }}
              />
            </div>
            <span className="text-sm text-slate-400">{approvedDocs}/{totalDocs}</span>
          </div>
          <Link href="/dashboard/documents" className="text-sky-600 text-sm mt-3 inline-block hover:underline">View</Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Messages</p>
          <p className="text-3xl font-bold text-slate-800">{(tickets || []).length}</p>
          <Link href="/dashboard/support" className="text-sky-600 text-sm mt-1 inline-block hover:underline">View</Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Reserved Properties</p>
          <p className="text-3xl font-bold text-slate-800">{activeReservations.length}</p>
          <Link href="/dashboard/lots" className="text-sky-600 text-sm mt-1 inline-block hover:underline">View</Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Purchased Properties</p>
          <p className="text-3xl font-bold text-slate-800">{completedReservations.length}</p>
          <Link href="/dashboard/lots" className="text-sky-600 text-sm mt-1 inline-block hover:underline">View</Link>
        </div>
      </div>

      {/* Reserved Properties */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Reserved Properties</h2>
          <Link href="/dashboard/lots" className="text-sm text-slate-500 hover:underline">
            Manage Reserved Properties
          </Link>
        </div>
        {activeReservations.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No active reservations. <Link href="/dashboard/reserve" className="text-sky-600 hover:underline">Reserve a lot</Link></p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {activeReservations.slice(0, 4).map((res) => {
              const lot = res.lot as unknown as { label: string; zone: { name: string } };
              const daysLeft = res.expiry_date
                ? Math.max(0, Math.ceil((new Date(res.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;
              const progress = res.amount_due > 0 ? (Number(res.amount_paid) / Number(res.amount_due)) * 100 : 0;
              return (
                <div key={res.id} className="border border-slate-200 rounded-xl p-4 flex gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      Santo Tomas, {lot?.zone?.name}, Lot {lot?.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Reservation Expires {res.expiry_date ? new Date(res.expiry_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-slate-700 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      {daysLeft !== null && (
                        <span className="text-xs text-slate-400">{daysLeft} Days Remaining</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link href="/dashboard/lots" className="flex-1 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded-lg text-center hover:bg-slate-600 transition">
                        Purchase property
                      </Link>
                      <button className="flex-1 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition">
                        Cancel reservation
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchased Properties */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Purchased Properties</h2>
          <Link href="/dashboard/lots" className="text-sm text-slate-500 hover:underline">Manage Payments</Link>
        </div>
        {completedReservations.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No purchased properties yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {completedReservations.slice(0, 4).map((res) => {
              const lot = res.lot as unknown as { label: string; zone: { name: string }; price: number };
              return (
                <div key={res.id} className="border border-slate-200 rounded-xl p-4 flex gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      Santo Tomas, {lot?.zone?.name}, Lot {lot?.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ${Number(res.amount_paid).toLocaleString()} of ${Number(res.amount_due).toLocaleString()}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Link href="/dashboard/lots" className="flex-1 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded-lg text-center hover:bg-slate-600 transition">
                        View Details
                      </Link>
                      <button className="flex-1 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition">
                        View details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Properties */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Saved Properties</h2>
          <div className="flex gap-2 text-slate-400">
            <button className="hover:text-slate-600">&lt;</button>
            <span>|</span>
            <button className="hover:text-slate-600">&gt;</button>
          </div>
        </div>
        {(!savedLots || savedLots.length === 0) ? (
          <p className="text-slate-400 text-sm py-4">
            No saved properties. Browse the <Link href="/" className="text-sky-600 hover:underline">map</Link> to save lots you&apos;re interested in.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {savedLots.slice(0, 3).map((saved) => {
              const lot = saved.lot as unknown as { id: string; label: string; zone: { name: string }; status: string };
              return (
                <div key={saved.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                    Property Photo
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      Santo Tomas, {lot?.zone?.name}, Lot {lot?.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{lot?.status === 'available' ? '' : `STATUS: ${lot?.status?.toUpperCase()}`}</p>
                    <div className="flex flex-col gap-2 mt-3">
                      <Link href={`/dashboard/reserve?lot=${lot?.id}`} className="py-2 bg-slate-700 text-white text-xs font-semibold rounded-lg text-center hover:bg-slate-600 transition">
                        Reserve
                      </Link>
                      <button className="py-2 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition">
                        View details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
