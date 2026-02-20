import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const fetchWork = unstable_cache(
    async () => {
      const { data } = await supabase
        .from('works')
        .select('*')
        .eq('id', id)
        .single();
      return data ?? null;
    },
    [`work-${id}`],
    { tags: ['works'] }
  );

  const data = await fetchWork();
  if (!data) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(data);
}
