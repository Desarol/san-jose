'use client';

import type { LotWithZone, Zone } from '@/lib/types/database';

interface MapSidebarProps {
  zones: Zone[];
  lots: LotWithZone[];
  selectedLotId: string | null;
  onZoneClick: (zoneId: string) => void;
}

export default function MapSidebar({ zones, lots, selectedLotId, onZoneClick }: MapSidebarProps) {
  return (
    <div className="hidden md:block absolute top-[90px] left-5 w-80 max-h-[calc(100vh-120px)] z-10 bg-slate-900/[0.92] backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-y-auto scrollbar-thin">
      <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
        <h2 className="text-[15px] font-semibold text-slate-200">Available Lots</h2>
        <p className="text-xs text-white/40 mt-1">Click a lot on the map or below to view details</p>
      </div>
      <div className="p-2">
        {zones.map((zone) => {
          const zoneLots = lots.filter((l) => l.zone_id === zone.id);
          const avail = zoneLots.filter((l) => l.status === 'available').length;
          const resv = zoneLots.filter((l) => l.status === 'reserved').length;
          const sold = zoneLots.filter((l) => l.status === 'sold').length;
          const total = zoneLots.length;
          const isActive = zoneLots.some((l) => l.id === selectedLotId);

          return (
            <div
              key={zone.id}
              onClick={() => onZoneClick(zone.id)}
              className={`p-3.5 rounded-xl cursor-pointer transition-all mb-1 ${
                isActive
                  ? 'bg-sky-500/15 border border-sky-500/30'
                  : 'hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <h3 className="text-sm font-semibold text-slate-100">{zone.name}</h3>
              <div className="text-[11px] text-white/45 mt-0.5 leading-relaxed">
                {zone.zoning_type} &bull; {total} lots &bull; {zone.lot_size_sqm} m&sup2; each
              </div>
              <div className="text-[13px] font-semibold text-emerald-400 mt-1.5">
                From ${(zone.base_price - 10000).toLocaleString()} USD
              </div>
              {/* Progress bar */}
              <div className="flex gap-1 mt-1.5 h-1 rounded overflow-hidden">
                {avail > 0 && (
                  <div
                    className="bg-emerald-400 rounded"
                    style={{ width: `${(avail / total) * 100}%` }}
                  />
                )}
                {resv > 0 && (
                  <div
                    className="bg-amber-400 rounded"
                    style={{ width: `${(resv / total) * 100}%` }}
                  />
                )}
                {sold > 0 && (
                  <div
                    className="bg-red-400 rounded"
                    style={{ width: `${(sold / total) * 100}%` }}
                  />
                )}
              </div>
              <div className="text-[10px] text-white/35 mt-1">
                {avail} avail &bull; {resv} resv &bull; {sold} sold
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
