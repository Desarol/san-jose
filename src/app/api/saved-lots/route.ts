import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lot_id } = await request.json();
  const { error } = await supabase.from('saved_lots').insert({ user_id: user.id, lot_id });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Already saved' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: 'Saved' });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lot_id } = await request.json();
  const { error } = await supabase.from('saved_lots').delete().eq('user_id', user.id).eq('lot_id', lot_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Removed' });
}
