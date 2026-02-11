import { createClient } from '@/lib/supabase/server';
import MapWrapper from '@/components/map/MapWrapper';
import type { LotWithZone, Zone } from '@/lib/types/database';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: lotsData } = await supabase
    .from('lots')
    .select('*, zone:zones(*)')
    .order('feature_id', { ascending: true });

  const { data: zonesData } = await supabase
    .from('zones')
    .select('*')
    .order('id');

  const { data: { user } } = await supabase.auth.getUser();

  const lots = (lotsData ?? []) as unknown as LotWithZone[];
  const zones = (zonesData ?? []) as Zone[];

  return <MapWrapper lots={lots} zones={zones} isAuthenticated={!!user} />;
}
