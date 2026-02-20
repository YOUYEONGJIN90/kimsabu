import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST() {
  revalidateTag('works');
  return NextResponse.json({ ok: true });
}
