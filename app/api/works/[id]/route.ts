import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data } = await supabase
    .from('works')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(data);
}
