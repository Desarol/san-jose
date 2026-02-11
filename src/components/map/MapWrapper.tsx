'use client';

import dynamic from 'next/dynamic';
import type { LotWithZone, Zone } from '@/lib/types/database';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white/40 text-center">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-lg flex items-center justify-center text-lg font-bold mx-auto mb-4">
          ST
        </div>
        <p>Loading map...</p>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  lots: LotWithZone[];
  zones: Zone[];
  isAuthenticated?: boolean;
}

export default function MapWrapper({ lots, zones, isAuthenticated }: MapWrapperProps) {
  return <MapContainer lots={lots} zones={zones} isAuthenticated={isAuthenticated} />;
}
