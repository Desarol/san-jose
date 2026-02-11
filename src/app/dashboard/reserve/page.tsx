'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { LotWithZone } from '@/lib/types/database';

function ReserveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedLotId = searchParams.get('lot');
  const [lots, setLots] = useState<LotWithZone[]>([]);
  const [selectedLot, setSelectedLot] = useState<LotWithZone | null>(null);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLots = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('lots')
      .select('*, zone:zones(*)')
      .eq('status', 'available')
      .order('feature_id');
    if (data) {
      const typedData = data as unknown as LotWithZone[];
      setLots(typedData);
      if (preselectedLotId) {
        const lot = typedData.find((l) => l.id === preselectedLotId);
        if (lot) {
          setSelectedLot(lot);
          setStep(2);
        }
      }
    }
  }, [preselectedLotId]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  async function handleReserve() {
    if (!selectedLot || !confirmed) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const reservationFee = 5000;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 15);

    const { error } = await supabase.from('reservations').insert({
      user_id: user.id,
      lot_id: selectedLot.id,
      status: 'active',
      amount_due: selectedLot.price,
      amount_paid: reservationFee,
      reservation_fee: reservationFee,
      payment_plan: paymentMethod === 'financing' ? 'monthly' : 'one-time',
      next_payment_due: nextPaymentDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString(),
    });

    if (error) {
      alert('Error creating reservation: ' + error.message);
      setLoading(false);
    } else {
      router.push('/dashboard/lots');
      router.refresh();
    }
  }

  const filteredLots = lots.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.id.toLowerCase().includes(q) || l.label.toLowerCase().includes(q) ||
      l.zone?.name.toLowerCase().includes(q);
  });

  const reservationFee = 5000;
  const balanceDue = selectedLot ? selectedLot.price - reservationFee : 0;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Reserve a Lot</h1>
      <p className="text-sm text-slate-500 mb-6">Select and reserve your ideal lot with our interactive map interface.</p>

      {/* Interactive Map placeholder */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-700">Interactive Map</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-500">Legend ▾</button>
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-500">Filters ▾</button>
            <input
              type="text"
              placeholder="Search lot #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500 w-32"
            />
            <button onClick={() => { setSearchQuery(''); setSelectedLot(null); setStep(1); }} className="text-sm text-slate-500 hover:text-slate-700">Reset</button>
          </div>
        </div>

        {/* Lot grid as map substitute */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-5 gap-2">
            {filteredLots.slice(0, 40).map((lot) => (
              <button
                key={lot.id}
                onClick={() => { setSelectedLot(lot); setStep(2); }}
                className={`p-3 rounded-lg border text-left text-xs transition ${
                  selectedLot?.id === lot.id
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 bg-white hover:border-sky-300'
                }`}
              >
                <span className="font-semibold text-slate-700">{lot.zone?.name}</span>
                <br />
                <span className="text-slate-500">Lot {lot.label}</span>
                <br />
                <span className="text-emerald-600 font-semibold">${lot.price.toLocaleString()}</span>
              </button>
            ))}
          </div>
          {filteredLots.length === 0 && (
            <p className="text-center text-slate-400 py-8">No available lots matching your search</p>
          )}
        </div>
      </div>

      {/* Reserve Your Lot - 3 Step Wizard */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Reserve Your Lot</h2>

        {/* Steps */}
        <div className="flex items-center gap-0 mb-8">
          {[
            { num: 1, label: 'Select' },
            { num: 2, label: 'Choose Payment' },
            { num: 3, label: 'Confirm & Pay' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s.num ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`ml-2 text-sm ${step >= s.num ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                {s.label}
              </span>
              {i < 2 && <div className={`flex-1 h-0.5 mx-4 ${step > s.num ? 'bg-slate-700' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Lot Summary */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3">Lot Summary</h3>
            {selectedLot ? (
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800">{selectedLot.zone?.name} — Lot {selectedLot.label}</h4>
                <p className="text-lg font-bold text-slate-800 mt-1">${selectedLot.price.toLocaleString()} USD</p>
                <div className="mt-3 text-sm text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{selectedLot.size_sqm} m² ({Math.round(selectedLot.size_sqm * 10.7639).toLocaleString()} ft²)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoning:</span>
                    <span>{selectedLot.zone?.zoning_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-emerald-600">Available</span>
                  </div>
                </div>
                <Link href="/" className="text-sky-600 text-sm hover:underline mt-3 inline-block">View on Map</Link>
              </div>
            ) : (
              <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                Select a lot from the map above
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3">Payment Method</h3>
            <div className="space-y-3">
              <button
                onClick={() => { setPaymentMethod('financing'); setStep(Math.max(step, 3)); }}
                className={`w-full p-4 border rounded-xl text-left transition ${
                  paymentMethod === 'financing' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'financing' ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`} />
                  <span className="font-semibold text-slate-700">BAJA Special Financing</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 ml-6">Flexible payment plans available</p>
              </button>
              <button
                onClick={() => { setPaymentMethod('outright'); setStep(Math.max(step, 3)); }}
                className={`w-full p-4 border rounded-xl text-left transition ${
                  paymentMethod === 'outright' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'outright' ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`} />
                  <span className="font-semibold text-slate-700">Purchase Outright (Cash/Wire)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 ml-6">Full payment at closing</p>
              </button>
            </div>
          </div>

          {/* Costs & Deadlines */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3">Costs & Deadlines</h3>
            {selectedLot ? (
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="text-sm text-slate-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Price:</span>
                    <span className="font-medium">${selectedLot.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reservation Fee:</span>
                    <span className="font-medium">${reservationFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Balance Due:</span>
                    <span className="font-medium">${balanceDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Payment Due:</span>
                    <span className="font-medium">
                      {new Date(Date.now() + 15 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-green-600">
                  ✓ You can withdraw until {new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                    Closes in 3 days
                  </span>
                </div>

                <div className="mt-3 flex justify-between text-xs text-slate-400">
                  <span>Progress</span>
                  <span>$0 of ${selectedLot.price.toLocaleString()}</span>
                </div>
                <div className="bg-slate-100 rounded-full h-1.5 mt-1">
                  <div className="bg-slate-300 h-1.5 rounded-full" style={{ width: '0%' }} />
                </div>

                <label className="flex items-center gap-2 mt-4 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="accent-slate-700"
                  />
                  Yes, this is my lot.
                </label>

                <button
                  onClick={handleReserve}
                  disabled={!confirmed || !paymentMethod || loading}
                  className="w-full mt-3 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Reserve & Continue'}
                </button>
                <button className="w-full mt-2 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                  Withdraw Reservation
                </button>

                <p className="text-xs text-slate-400 mt-3">
                  Payments processed securely. You will review and sign purchase documents before closing.
                </p>
                <a href="/dashboard/support" className="text-xs text-sky-600 hover:underline">Contact Support</a>
              </div>
            ) : (
              <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                Select a lot and payment method
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReserveLotPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 py-8">Loading...</div>}>
      <ReserveContent />
    </Suspense>
  );
}
