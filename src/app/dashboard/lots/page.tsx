import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Reservation } from '@/lib/types/database';

interface ResWithLot extends Reservation {
  lot: { id: string; label: string; price: number; zone: { name: string } } | null;
}

export default async function MyLotsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rawReservations } = await supabase
    .from('reservations')
    .select('*, lot:lots(*, zone:zones(*))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const reservations = (rawReservations || []) as unknown as ResWithLot[];
  const active = reservations.filter((r) => r.status === 'active' || r.status === 'pending');
  const completed = reservations.filter((r) => r.status === 'completed');

  function ReservationCard({ res, type }: { res: ResWithLot; type: 'active' | 'completed' }) {
    const lot = res.lot;
    const progress = res.amount_due > 0 ? (Number(res.amount_paid) / Number(res.amount_due)) * 100 : 0;
    const isLate = res.next_payment_due && new Date(res.next_payment_due) < new Date() && res.status !== 'completed';
    const daysLeft = res.expiry_date
      ? Math.max(0, Math.ceil((new Date(res.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <div className="border border-slate-200 rounded-xl p-6 flex gap-6">
        {/* Image placeholder */}
        <div className="w-[200px] h-[180px] bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-400 text-xs">
          Property Photo
          <br />
          <Link href="/" className="text-sky-600 text-xs hover:underline mt-2 block">View details</Link>
        </div>

        {/* Details */}
        <div className="flex-1">
          <h3 className="font-bold text-slate-800">
            Santo Tomas, {lot?.zone?.name}, Lot {lot?.label}
          </h3>
          <div className="flex gap-2 mt-1 text-xs">
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">ID: RES-{res.id.slice(0, 3).toUpperCase()}</span>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
              Reserved: {new Date(res.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              isLate ? 'bg-red-100 text-red-600' :
              res.status === 'completed' ? 'bg-green-100 text-green-600' :
              'bg-sky-100 text-sky-600'
            }`}>
              {isLate ? 'Late' : res.status.charAt(0).toUpperCase() + res.status.slice(1)}
            </span>
          </div>

          <div className="mt-3 text-sm text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Total Price:</span>
              <span className="font-medium">${Number(res.amount_due).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>{type === 'completed' ? 'Total Paid:' : 'Reservation Fee Paid:'}</span>
              <span>${Number(res.amount_paid).toLocaleString()}</span>
            </div>
            {type === 'active' && (
              <>
                <div className="flex justify-between">
                  <span>Balance Due to Purchase:</span>
                  <span>${Number(res.amount_due - res.amount_paid).toLocaleString()}</span>
                </div>
                {res.next_payment_due && (
                  <div className="flex justify-between">
                    <span>Next Payment Due:</span>
                    <span>{new Date(res.next_payment_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Payment Plan:</span>
                  <span>{res.payment_plan || 'Monthly'}</span>
                </div>
              </>
            )}
            {type === 'completed' && res.updated_at && (
              <div className="flex justify-between">
                <span>Final Payment:</span>
                <span>{new Date(res.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {isLate && (
            <p className="mt-3 text-sm text-red-600">
              Your payment is <strong>overdue</strong> and late fees may apply. Please contact support to make a payment as soon as possible.
            </p>
          )}
          {type === 'active' && !isLate && res.expiry_date && (
            <p className="mt-3 text-sm text-green-600">
              ✓ Eligible to withdraw until {new Date(res.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="w-[180px] flex-shrink-0 flex flex-col gap-2">
          <div className="flex justify-between text-sm text-slate-500 mb-1">
            <span>Progress</span>
            <span>{daysLeft !== null && type === 'active' ? `${daysLeft} days remaining` : `$${Number(res.amount_paid).toLocaleString()} of $${Number(res.amount_due).toLocaleString()}`}</span>
          </div>
          <div className="bg-slate-100 rounded-full h-2 mb-2">
            <div className="bg-slate-700 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>

          {type === 'active' && isLate && (
            <button className="py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition">
              Pay Now - Urgent
            </button>
          )}
          {type === 'active' && !isLate && (
            <button className="py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition">
              Purchase Property
            </button>
          )}
          <button className="py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
            View Details
          </button>
          {type === 'active' && (
            <>
              <button className="py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                Payment History
              </button>
              <button className="py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                Withdraw Reservation
              </button>
            </>
          )}
          {type === 'completed' && (
            <button className="py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
              Payment History / Invoice
            </button>
          )}
          <Link href="/dashboard/support" className="py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition text-center">
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Reserved Lots</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your active reservations, payments, and deadlines.</p>

      {active.length === 0 && completed.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-3">You don&apos;t have any reservations yet.</p>
          <Link href="/dashboard/reserve" className="inline-block px-6 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition">
            Reserve a Lot
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-4 mb-8">
          {active.map((res) => (
            <ReservationCard key={res.id} res={res} type="active" />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Purchase Complete</h2>
          <p className="text-sm text-slate-400 mb-4">Purchase completed successfully</p>
          <div className="space-y-4">
            {completed.map((res) => (
              <ReservationCard key={res.id} res={res} type="completed" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
