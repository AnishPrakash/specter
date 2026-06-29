import { NextRequest, NextResponse } from 'next/server';
import { explainFindings } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { findings } = await req.json();
    const result = await explainFindings(findings);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}