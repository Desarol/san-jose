import type { Zone, LotWithZone } from '@/lib/types/database';

export interface SublotFeature {
  type: 'Feature';
  id: number;
  properties: {
    id: string;
    zoneId: string;
    zoneName: string;
    label: string;
    status: string;
    price: string;
    size: string;
    zoning: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface ZoneFeature {
  type: 'Feature';
  properties: { id: string; name: string };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export function lotsToGeoJSON(lots: LotWithZone[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lots.map((lot) => ({
      type: 'Feature' as const,
      id: lot.feature_id ?? 0,
      properties: {
        id: lot.id,
        zoneId: lot.zone_id,
        zoneName: lot.zone?.name ?? '',
        label: lot.label,
        status: lot.status,
        price: `$${lot.price.toLocaleString()} USD`,
        size: `${lot.size_sqm} m²`,
        zoning: lot.zone?.zoning_type ?? '',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [lot.coordinates as number[][]],
      },
    })),
  };
}

export function zonesToGeoJSON(zones: Zone[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature' as const,
      properties: { id: zone.id, name: zone.name },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...zone.corners, zone.corners[0]]],
      },
    })),
  };
}

export function zoneLabelPoints(zones: Zone[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => {
      const c = zone.corners;
      return {
        type: 'Feature' as const,
        properties: { name: zone.name },
        geometry: {
          type: 'Point' as const,
          coordinates: [
            (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4,
            (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4,
          ],
        },
      };
    }),
  };
}

export function lotLabelPoints(lots: LotWithZone[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lots.map((lot) => ({
      type: 'Feature' as const,
      properties: { label: lot.label },
      geometry: {
        type: 'Point' as const,
        coordinates: lot.center as number[],
      },
    })),
  };
}

export function getZoneCenter(zone: Zone): [number, number] {
  const c = zone.corners;
  return [
    (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4,
    (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4,
  ];
}

export function getStatusBadge(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'available':
      return { label: 'Available', color: '#34d399', bg: 'rgba(52,211,153,0.15)' };
    case 'reserved':
      return { label: 'Reserved', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
    case 'sold':
      return { label: 'Sold', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    default:
      return { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
  }
}
