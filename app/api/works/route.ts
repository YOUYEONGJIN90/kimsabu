import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 600; // 10분마다 자동 갱신

export async function GET() {
  const { data, error } = await supabase
    .from('works')
    .select('id, title, category, summary, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data ?? []);
}
