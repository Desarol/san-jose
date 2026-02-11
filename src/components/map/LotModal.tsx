'use client';

import { useEffect } from 'react';
import type { LotWithZone } from '@/lib/types/database';

interface LotModalProps {
  lot: LotWithZone;
  isAuthenticated?: boolean;
  onClose: () => void;
}

export default function LotModal({ lot, isAuthenticated, onClose }: LotModalProps) {
  const zone = lot.zone;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const statusLabel = lot.status.charAt(0).toUpperCase() + lot.status.slice(1);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[90%] max-w-[900px] max-h-[90vh] bg-slate-900 rounded-2xl border border-white/10 overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex justify-between items-start px-7 pt-6 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[22px] font-bold text-slate-50">
              {zone.name} — Lot {lot.label}
            </h2>
            <div className="text-[13px] text-white/40 mt-1">
              Santo Tomas Nuevo, B.C. &bull; {zone.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[10px] border border-white/10 bg-white/5 text-white text-lg flex items-center justify-center hover:bg-white/10 transition"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
          {/* 3D viewer placeholder */}
          <div className="bg-slate-800 flex items-center justify-center min-h-[380px] relative">
            <div className="text-center text-white/40">
              <div className="text-4xl mb-3">🏗️</div>
              <p className="text-sm">3D Model Preview</p>
              <p className="text-xs text-white/25 mt-1">Interactive 3D view coming soon</p>
            </div>
            <div className="absolute bottom-3 left-3 text-[10px] text-white/35 bg-black/50 px-2.5 py-1 rounded-md tracking-wider uppercase">
              Interactive 3D View
            </div>
          </div>

          {/* Details */}
          <div className="px-7 py-6 overflow-y-auto">
            <div className="mb-5">
              <h3 className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-2.5">
                Property Details
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/[0.04] p-3 rounded-[10px]">
                  <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">
                    Lot Size
                  </label>
                  <span className="text-[15px] font-semibold text-slate-200">
                    {lot.size_sqm} m²
                  </span>
                </div>
                <div className="bg-white/[0.04] p-3 rounded-[10px]">
                  <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">
                    Price
                  </label>
                  <span className="text-[15px] font-semibold text-emerald-400">
                    ${lot.price.toLocaleString()} USD
                  </span>
                </div>
                <div className="bg-white/[0.04] p-3 rounded-[10px]">
                  <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">
                    Zoning
                  </label>
                  <span className="text-[15px] font-semibold text-slate-200">
                    {zone.zoning_type}
                  </span>
                </div>
                <div className="bg-white/[0.04] p-3 rounded-[10px]">
                  <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <span className="text-[15px] font-semibold text-slate-200">{statusLabel}</span>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <h3 className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-2.5">
                Description
              </h3>
              <p className="text-[13px] leading-relaxed text-white/60">{zone.description}</p>
            </div>

            <div>
              <h3 className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-2.5">
                Gallery
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(zone.images as string[]).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img}
                    alt={zone.name}
                    className="w-full aspect-[4/3] object-cover rounded-lg hover:scale-[1.03] transition-transform cursor-pointer"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-7 py-5 border-t border-white/[0.06] flex gap-2.5">
          {lot.status === 'available' ? (
            <a
              href={
                isAuthenticated
                  ? `/dashboard/reserve?lot=${lot.id}`
                  : `/login?redirect=/dashboard/reserve?lot=${lot.id}`
              }
              className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-[10px] text-white text-sm font-semibold text-center hover:brightness-110 hover:-translate-y-0.5 transition-all"
            >
              Reserve This Lot
            </a>
          ) : (
            <button className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-[10px] text-white text-sm font-semibold hover:brightness-110 hover:-translate-y-0.5 transition-all">
              Request More Information
            </button>
          )}
          <button
            onClick={onClose}
            className="py-3 px-5 bg-white/[0.06] border border-white/10 rounded-[10px] text-slate-200 text-sm font-medium hover:bg-white/10 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
