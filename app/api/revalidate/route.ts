import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST() {
  revalidatePath('/api/works');
  revalidatePath('/works');
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
