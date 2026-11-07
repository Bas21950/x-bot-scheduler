import { NextResponse } from 'next/server';
import { getLogs } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const logs = await getLogs(limit);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
