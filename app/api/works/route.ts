import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const fetchWorks = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from('works')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  ['works-list'],
  { tags: ['works'] }
);

export async function GET() {
  try {
    const data = await fetchWorks();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
