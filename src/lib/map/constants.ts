export const MAP_CENTER: [number, number] = [-116.5998, 31.4853];
export const MAP_ZOOM = 16.2;
export const MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

export const ORTHO_BOUNDS: [number, number, number, number] = [-116.6036, 31.4821, -116.5960, 31.4885];

export const TERRAIN_FEATURES = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Main Access Road', type: 'road' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-116.6033, 31.4870], [-116.6026, 31.4862], [-116.6018, 31.4856],
          [-116.6012, 31.4843], [-116.6008, 31.4836], [-116.6003, 31.4824],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Branch Road', type: 'road' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-116.6012, 31.4843], [-116.6002, 31.4846], [-116.5996, 31.4848],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Rocky Ridge', type: 'ridge' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-116.6005, 31.488], [-116.6002, 31.4872], [-116.5998, 31.4862],
          [-116.5996, 31.4853], [-116.5996, 31.4848],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Seasonal Wash', type: 'arroyo' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-116.5996, 31.4848], [-116.5988, 31.484], [-116.598, 31.4834],
          [-116.5972, 31.4828], [-116.5968, 31.4824],
        ],
      },
    },
  ],
};

export const PHOTO_MARKERS = [
  { coords: [-116.6042, 31.4888] as [number, number], image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&h=120&fit=crop', caption: 'Baja coastline near Santo Tomas' },
  { coords: [-116.5950, 31.4888] as [number, number], image: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=120&h=120&fit=crop', caption: 'Valley overlook' },
  { coords: [-116.5950, 31.4818] as [number, number], image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=120&h=120&fit=crop', caption: 'Desert terrain' },
  { coords: [-116.6042, 31.4818] as [number, number], image: 'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=120&h=120&fit=crop', caption: 'Pacific sunset' },
];

export const STATUS_COLORS: Record<string, string> = {
  available: '#34d399',
  reserved: '#fbbf24',
  sold: '#ef4444',
};
