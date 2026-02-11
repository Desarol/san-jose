import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────
// Bilinear interpolation (exact copy from index.html)
// ─────────────────────────────────────────────
function bilerp(corners: number[][], u: number, v: number): [number, number] {
  const [tl, tr, br, bl] = corners;
  return [
    (1 - u) * (1 - v) * tl[0] + u * (1 - v) * tr[0] + u * v * br[0] + (1 - u) * v * bl[0],
    (1 - u) * (1 - v) * tl[1] + u * (1 - v) * tr[1] + u * v * br[1] + (1 - u) * v * bl[1],
  ];
}

interface ZoneData {
  id: string;
  name: string;
  zoning: string;
  basePrice: number;
  lotSize: number;
  description: string;
  model3d: string;
  cameraOrbit: string;
  corners: number[][];
  images: string[];
}

interface SublotData {
  id: string;
  zoneId: string;
  label: string;
  status: string;
  price: number;
  sizeSqm: number;
  center: number[];
  coords: number[][];
  gridRow: number;
  gridCol: number;
  featureId: number;
}

function generateSublots(zone: ZoneData, cols: number, rows: number): SublotData[] {
  const corners = zone.corners;
  const gap = 0.07;
  const sublots: SublotData[] = [];
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let idx = 0;
  const seed = zone.id.charCodeAt(0) + zone.id.charCodeAt(zone.id.length - 1);
  const statusPool: string[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const hash = (seed * 31 + i * 17) % 100;
    if (hash < 60) statusPool.push('available');
    else if (hash < 82) statusPool.push('reserved');
    else statusPool.push('sold');
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u0 = (c + gap) / cols,
        u1 = (c + 1 - gap) / cols;
      const v0 = (r + gap) / rows,
        v1 = (r + 1 - gap) / rows;
      const tl = bilerp(corners, u0, v0),
        tr = bilerp(corners, u1, v0);
      const br = bilerp(corners, u1, v1),
        bl = bilerp(corners, u0, v1);
      const center = bilerp(corners, (c + 0.5) / cols, (r + 0.5) / rows);
      const label = `${rowLabels[r]}${c + 1}`;
      const basePrice = zone.basePrice;
      const variation = ((seed * 7 + idx * 13) % 20 - 10) * 1000;
      sublots.push({
        id: `${zone.id}-${label}`,
        zoneId: zone.id,
        label,
        status: statusPool[idx],
        price: basePrice + variation,
        sizeSqm: zone.lotSize,
        center: [center[0], center[1]],
        coords: [tl, tr, br, bl, tl],
        gridRow: r,
        gridCol: c,
        featureId: 0, // will be set later
      });
      idx++;
    }
  }
  return sublots;
}

// ─────────────────────────────────────────────
// Zone definitions (exact copy from index.html lines 850-965)
// ─────────────────────────────────────────────
const zones: ZoneData[] = [
  {
    id: 'loma-poniente',
    name: 'Loma Poniente',
    zoning: 'Residential',
    basePrice: 78000,
    lotSize: 55,
    description:
      'Elevated western parcel above the main dirt road. Gentle slope with panoramic views of the valley and surrounding hills. The road curves along the southern edge providing direct access.',
    model3d: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    cameraOrbit: '45deg 65deg 2.5m',
    corners: [
      [-116.6033, 31.4882],
      [-116.6005, 31.488],
      [-116.6018, 31.4856],
      [-116.6033, 31.4858],
    ],
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=300&h=200&fit=crop',
    ],
  },
  {
    id: 'bajada-sur',
    name: 'Bajada Sur',
    zoning: 'Residential',
    basePrice: 68000,
    lotSize: 52,
    description:
      'Lower western slope following the main access road. Natural desert landscaping with native vegetation. Quiet, south-facing parcels ideal for retreat-style homes with solar exposure.',
    model3d: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    cameraOrbit: '0deg 75deg 2.8m',
    corners: [
      [-116.6033, 31.4858],
      [-116.6018, 31.4856],
      [-116.6003, 31.4824],
      [-116.6033, 31.4824],
    ],
    images: [
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1414609245224-afa02bfb3fda?w=300&h=200&fit=crop',
    ],
  },
  {
    id: 'cruce-arroyo',
    name: 'Cruce del Arroyo',
    zoning: 'Mixed Use',
    basePrice: 85000,
    lotSize: 58,
    description:
      'Central plateau between the road junction and the rocky ridge. Prime location at the crossroads of the main access road and the arroyo branch. Approved for residential and boutique commercial.',
    model3d: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    cameraOrbit: '135deg 70deg 3m',
    corners: [
      [-116.6018, 31.487],
      [-116.5998, 31.4866],
      [-116.5996, 31.4848],
      [-116.6012, 31.4843],
    ],
    images: [
      'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1468413253725-0d5181091126?w=300&h=200&fit=crop',
    ],
  },
  {
    id: 'mesa-norte',
    name: 'Mesa Norte',
    zoning: 'Residential',
    basePrice: 82000,
    lotSize: 60,
    description:
      'Expansive flat plateau east of the rocky ridge. The most buildable terrain in the development with excellent drainage and level grade throughout. Morning sun exposure and cooling Pacific breezes.',
    model3d: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    cameraOrbit: '225deg 60deg 2m',
    corners: [
      [-116.5998, 31.4882],
      [-116.5963, 31.4882],
      [-116.5963, 31.4855],
      [-116.5998, 31.4858],
    ],
    images: [
      'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=200&fit=crop',
    ],
  },
  {
    id: 'valle-central',
    name: 'Valle Central',
    zoning: 'Commercial',
    basePrice: 75000,
    lotSize: 50,
    description:
      'South-central valley floor between the road junction and the seasonal wash. Direct road access on two sides. Zoned for small commercial \u2014 ideal for shops, eco-tourism, or community services.',
    model3d: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    cameraOrbit: '180deg 65deg 3m',
    corners: [
      [-116.6012, 31.4843],
      [-116.5996, 31.4848],
      [-116.5972, 31.4824],
      [-116.6003, 31.4824],
    ],
    images: [
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1520483601560-389dff434fdf?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=300&h=200&fit=crop',
    ],
  },
  {
    id: 'ribera-este',
    name: 'Ribera Este',
    zoning: 'Residential',
    basePrice: 72000,
    lotSize: 55,
    description:
      'Eastern bank beyond the seasonal arroyo wash. Open desert terrain with unobstructed southern views. Generous lot sizes and natural separation from the rest of the development create a private, exclusive feel.',
    model3d: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    cameraOrbit: '315deg 55deg 3.5m',
    corners: [
      [-116.5996, 31.4855],
      [-116.5963, 31.4855],
      [-116.5963, 31.4824],
      [-116.5972, 31.4824],
    ],
    images: [
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1437719417032-8799fd04b926?w=300&h=200&fit=crop',
    ],
  },
];

const COLS = 5;
const ROWS = 4;

async function seed() {
  console.log('🌱 Starting seed...');

  // Clear existing data (order matters for foreign keys)
  console.log('  Clearing existing data...');
  await supabase.from('saved_lots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('support_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('lots').delete().neq('id', '');
  await supabase.from('zones').delete().neq('id', '');

  // Insert zones
  console.log('  Inserting 6 zones...');
  const zoneRows = zones.map((z) => ({
    id: z.id,
    name: z.name,
    zoning_type: z.zoning,
    base_price: z.basePrice,
    lot_size_sqm: z.lotSize,
    description: z.description,
    corners: z.corners,
    images: z.images,
    model_3d_url: z.model3d,
    camera_orbit: z.cameraOrbit,
  }));

  const { error: zoneError } = await supabase.from('zones').insert(zoneRows);
  if (zoneError) {
    console.error('Zone insert error:', zoneError);
    process.exit(1);
  }

  // Generate and insert all lots
  console.log('  Generating 120 lots...');
  let featureIdCounter = 0;
  const allLots: {
    id: string;
    zone_id: string;
    label: string;
    price: number;
    size_sqm: number;
    status: string;
    coordinates: number[][];
    center: number[];
    polygon: number[][];
    grid_row: number;
    grid_col: number;
    feature_id: number;
  }[] = [];

  zones.forEach((zone) => {
    const sublots = generateSublots(zone, COLS, ROWS);
    sublots.forEach((s) => {
      s.featureId = featureIdCounter++;
      allLots.push({
        id: s.id,
        zone_id: s.zoneId,
        label: s.label,
        price: s.price,
        size_sqm: s.sizeSqm,
        status: s.status,
        coordinates: s.coords,
        center: s.center,
        polygon: s.coords,
        grid_row: s.gridRow,
        grid_col: s.gridCol,
        feature_id: s.featureId,
      });
    });
  });

  // Insert in batches of 50
  for (let i = 0; i < allLots.length; i += 50) {
    const batch = allLots.slice(i, i + 50);
    const { error: lotError } = await supabase.from('lots').insert(batch);
    if (lotError) {
      console.error(`Lot insert error (batch ${i}):`, lotError);
      process.exit(1);
    }
  }

  // Verify
  const { count: zoneCount } = await supabase.from('zones').select('*', { count: 'exact', head: true });
  const { count: lotCount } = await supabase.from('lots').select('*', { count: 'exact', head: true });
  const { count: availCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'available');
  const { count: reservedCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'reserved');
  const { count: soldCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');

  console.log(`\n✅ Seed complete!`);
  console.log(`   Zones: ${zoneCount}`);
  console.log(`   Lots:  ${lotCount} (${availCount} available, ${reservedCount} reserved, ${soldCount} sold)`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
