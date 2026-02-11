'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { LotWithZone, Zone } from '@/lib/types/database';
import {
  lotsToGeoJSON,
  zonesToGeoJSON,
  zoneLabelPoints,
  lotLabelPoints,
  getZoneCenter,
} from '@/lib/map/helpers';
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_STYLE,
  ORTHO_BOUNDS,
  TERRAIN_FEATURES,
  PHOTO_MARKERS,
  STATUS_COLORS,
} from '@/lib/map/constants';
import MapSidebar from './MapSidebar';
import LotModal from './LotModal';

interface MapContainerProps {
  lots: LotWithZone[];
  zones: Zone[];
  isAuthenticated?: boolean;
}

export default function MapContainer({ lots, zones, isAuthenticated }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [selectedLot, setSelectedLot] = useState<LotWithZone | null>(null);
  const [modalLot, setModalLot] = useState<LotWithZone | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const selectLot = useCallback(
    (lot: LotWithZone) => {
      if (!map.current) return;
      const m = map.current;

      // Deselect previous
      if (selectedLot) {
        m.setFeatureState({ source: 'sublots', id: selectedLot.feature_id ?? 0 }, { selected: false });
      }
      if (popup.current) {
        popup.current.remove();
        popup.current = null;
      }

      setSelectedLot(lot);
      m.setFeatureState({ source: 'sublots', id: lot.feature_id ?? 0 }, { selected: true });

      const center = lot.center as [number, number];
      m.flyTo({ center, zoom: 19, pitch: 0, bearing: 0, duration: 1200, essential: true });

      const zone = lot.zone;
      const statusColor = STATUS_COLORS[lot.status] || '#34d399';

      const popupEl = document.createElement('div');
      popupEl.className = 'popup-content';
      popupEl.innerHTML = `
        <h3 style="font-size:15px;font-weight:600;margin-bottom:4px">${zone.name} — Lot ${lot.label}</h3>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:10px">
          ${lot.size_sqm} m² • ${zone.zoning_type} • <span style="color:${statusColor};font-weight:600">${lot.status.toUpperCase()}</span>
        </div>
        <div style="font-size:16px;font-weight:700;color:#34d399;margin-bottom:10px">$${lot.price.toLocaleString()} USD</div>
        <button class="popup-view-btn" style="width:100%;padding:8px;background:linear-gradient(135deg,#0ea5e9,#06b6d4);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">View Details</button>
        ${
          lot.status === 'available'
            ? `<button class="popup-reserve-btn" style="width:100%;padding:8px;margin-top:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e2e8f0;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Reserve This Lot</button>`
            : ''
        }
      `;

      popupEl.querySelector('.popup-view-btn')?.addEventListener('click', () => {
        setModalLot(lot);
      });

      popupEl.querySelector('.popup-reserve-btn')?.addEventListener('click', () => {
        if (isAuthenticated) {
          window.location.href = `/dashboard/reserve?lot=${lot.id}`;
        } else {
          window.location.href = `/login?redirect=/dashboard/reserve?lot=${lot.id}`;
        }
      });

      popup.current = new mapboxgl.Popup({ offset: 15, closeOnClick: true })
        .setLngLat(center)
        .setDOMContent(popupEl)
        .addTo(m);
    },
    [selectedLot, isAuthenticated]
  );

  const flyToZone = useCallback(
    (zoneId: string) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone || !map.current) return;
      const center = getZoneCenter(zone);
      map.current.flyTo({
        center,
        zoom: 18.2,
        pitch: 0,
        bearing: 0,
        duration: 1400,
        essential: true,
      });
    },
    [zones]
  );

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.current = m;

    m.on('load', () => {
      // 3D terrain
      m.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      m.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      // Orthomosaic tileset
      const tilesetId = process.env.NEXT_PUBLIC_MAPBOX_TILESET;
      if (tilesetId) {
        m.addSource('orthomosaic', {
          type: 'raster',
          url: `mapbox://${tilesetId}`,
          tileSize: 256,
          maxzoom: 22,
        });
        const layers = m.getStyle().layers;
        let firstSymbol: string | undefined;
        for (const layer of layers || []) {
          if (layer.type === 'symbol') {
            firstSymbol = layer.id;
            break;
          }
        }
        m.addLayer(
          {
            id: 'orthomosaic-layer',
            type: 'raster',
            source: 'orthomosaic',
            paint: { 'raster-opacity': 1.0 },
            maxzoom: 22,
          },
          firstSymbol
        );
      }

      // Ortho extent outline
      const extentCoords = [
        [ORTHO_BOUNDS[0], ORTHO_BOUNDS[3]],
        [ORTHO_BOUNDS[2], ORTHO_BOUNDS[3]],
        [ORTHO_BOUNDS[2], ORTHO_BOUNDS[1]],
        [ORTHO_BOUNDS[0], ORTHO_BOUNDS[1]],
        [ORTHO_BOUNDS[0], ORTHO_BOUNDS[3]],
      ];
      m.addSource('ortho-extent', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [extentCoords] },
        },
      });
      m.addLayer({
        id: 'ortho-extent-outline',
        type: 'line',
        source: 'ortho-extent',
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.6,
        },
      });

      // Zone outlines
      m.addSource('zones', { type: 'geojson', data: zonesToGeoJSON(zones) });
      m.addLayer({
        id: 'zones-outline',
        type: 'line',
        source: 'zones',
        paint: {
          'line-color': 'rgba(255,255,255,0.55)',
          'line-width': 1.5,
          'line-dasharray': [4, 3],
        },
      });

      // Terrain features
      m.addSource('terrain-features', { type: 'geojson', data: TERRAIN_FEATURES as GeoJSON.FeatureCollection });
      m.addLayer({
        id: 'terrain-roads',
        type: 'line',
        source: 'terrain-features',
        filter: ['==', ['get', 'type'], 'road'],
        paint: {
          'line-color': 'rgba(210,180,140,0.6)',
          'line-width': 2.5,
          'line-dasharray': [6, 3],
        },
      });
      m.addLayer({
        id: 'terrain-ridge',
        type: 'line',
        source: 'terrain-features',
        filter: ['==', ['get', 'type'], 'ridge'],
        paint: {
          'line-color': 'rgba(180,140,100,0.5)',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
      m.addLayer({
        id: 'terrain-arroyo',
        type: 'line',
        source: 'terrain-features',
        filter: ['==', ['get', 'type'], 'arroyo'],
        paint: {
          'line-color': 'rgba(120,160,200,0.5)',
          'line-width': 3,
          'line-dasharray': [4, 4],
        },
      });

      // Zone labels
      m.addSource('zone-labels', { type: 'geojson', data: zoneLabelPoints(zones) });
      m.addLayer({
        id: 'zone-labels-text',
        type: 'symbol',
        source: 'zone-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 14,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.08,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.85)',
          'text-halo-width': 2,
        },
      });

      // Sublot polygons
      m.addSource('sublots', {
        type: 'geojson',
        data: lotsToGeoJSON(lots),
        promoteId: 'id',
      });
      m.addLayer({
        id: 'sublots-fill',
        type: 'fill',
        source: 'sublots',
        paint: {
          'fill-color': [
            'match',
            ['get', 'status'],
            'available', 'rgba(52,211,153,0.3)',
            'reserved', 'rgba(251,191,36,0.3)',
            'sold', 'rgba(239,68,68,0.25)',
            'rgba(52,211,153,0.3)',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.8,
            0.5,
          ],
        },
      });
      m.addLayer({
        id: 'sublots-outline',
        type: 'line',
        source: 'sublots',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#0ea5e9',
            [
              'match',
              ['get', 'status'],
              'available', '#34d399',
              'reserved', '#fbbf24',
              'sold', '#ef4444',
              '#34d399',
            ],
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3.5,
            ['boolean', ['feature-state', 'hover'], false],
            2.5,
            1.5,
          ],
          'line-opacity': 0.9,
        },
      });

      // Sublot labels
      m.addSource('sublot-labels', { type: 'geojson', data: lotLabelPoints(lots) });
      m.addLayer({
        id: 'sublot-labels-text',
        type: 'symbol',
        source: 'sublot-labels',
        minzoom: 18,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-anchor': 'center',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.2,
        },
      });

      // Hover interactions
      let hoveredId: string | number | null = null;
      m.on('mousemove', 'sublots-fill', (e) => {
        if (e.features && e.features.length > 0) {
          if (hoveredId !== null) {
            m.setFeatureState({ source: 'sublots', id: hoveredId }, { hover: false });
          }
          hoveredId = e.features[0].id!;
          m.setFeatureState({ source: 'sublots', id: hoveredId }, { hover: true });
          m.getCanvas().style.cursor = 'pointer';
        }
      });
      m.on('mouseleave', 'sublots-fill', () => {
        if (hoveredId !== null) {
          m.setFeatureState({ source: 'sublots', id: hoveredId }, { hover: false });
          hoveredId = null;
        }
        m.getCanvas().style.cursor = '';
      });

      // Photo markers
      PHOTO_MARKERS.forEach((pm) => {
        const el = document.createElement('div');
        el.style.cssText = 'width:60px;height:60px;border-radius:10px;border:2px solid rgba(255,255,255,0.6);overflow:hidden;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.5);transition:all 0.25s ease';
        el.innerHTML = `<img src="${pm.image}" alt="${pm.caption}" style="width:100%;height:100%;object-fit:cover" />`;
        el.title = pm.caption;
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.15)';
          el.style.borderColor = '#0ea5e9';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.borderColor = 'rgba(255,255,255,0.6)';
        });
        new mapboxgl.Marker(el).setLngLat(pm.coords).addTo(m);
      });

      setMapReady(true);
    });

    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click handler for sublots (separate effect to access selectLot)
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;

    const handleClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        const lotId = e.features[0].properties?.id;
        const lot = lots.find((l) => l.id === lotId);
        if (lot) selectLot(lot);
      }
    };

    m.on('click', 'sublots-fill', handleClick);
    return () => {
      m.off('click', 'sublots-fill', handleClick);
    };
  }, [mapReady, lots, selectLot]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5 md:px-8 py-5 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-[10px] flex items-center justify-center text-lg font-bold text-white">
              B
            </div>
            <div>
              <h1 className="text-[22px] font-semibold text-white tracking-tight">
                Santo Tomas <span className="text-sky-400">Nuevo</span>
              </h1>
              <div className="text-xs text-white/50 font-normal tracking-[1.5px] uppercase">
                Baja California &bull; Coastal Development
              </div>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-3">
            {isAuthenticated ? (
              <a
                href="/dashboard"
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-medium hover:bg-white/20 transition"
              >
                Dashboard
              </a>
            ) : (
              <a
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg text-white text-sm font-semibold hover:brightness-110 transition"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <MapSidebar
        zones={zones}
        lots={lots}
        selectedLotId={selectedLot?.id ?? null}
        onZoneClick={flyToZone}
      />

      {/* Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-8 right-5 z-10 bg-slate-900/90 backdrop-blur-xl rounded-xl border border-white/10 px-5 py-4">
        <h4 className="text-[11px] text-white/40 uppercase tracking-wider font-medium mb-2.5">
          Lot Status
        </h4>
        {[
          { color: '#34d399', label: 'Available' },
          { color: '#fbbf24', label: 'Reserved' },
          { color: '#ef4444', label: 'Sold' },
          { color: 'rgba(14,165,233,0.3)', label: 'Selected', border: '1px solid #0ea5e9' },
        ].map(({ color, label, border }) => (
          <div key={label} className="flex items-center gap-2 mb-1.5 text-xs text-white/65">
            <div
              className="w-3.5 h-3.5 rounded-[4px]"
              style={{ background: color, border: border || 'none' }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalLot && (
        <LotModal
          lot={modalLot}
          isAuthenticated={isAuthenticated}
          onClose={() => setModalLot(null)}
        />
      )}
    </div>
  );
}
