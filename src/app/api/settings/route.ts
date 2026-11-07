import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      success: true,
      settings,
      credentialsConfigured: {
        database: !!process.env.DATABASE_URL,
        xApiKey: !!process.env.X_API_KEY,
        xApiSecret: !!process.env.X_API_SECRET,
        xAccessToken: !!process.env.X_ACCESS_TOKEN,
        xAccessSecret: !!process.env.X_ACCESS_TOKEN_SECRET,
      }
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { is_active, interval_hours, post_mode } = body;

    if (interval_hours !== undefined && (interval_hours < 1 || interval_hours > 72)) {
      return NextResponse.json({ success: false, error: 'Interval must be between 1 and 72 hours' }, { status: 400 });
    }

    if (post_mode && !['random', 'sequential'].includes(post_mode)) {
      return NextResponse.json({ success: false, error: 'Invalid post mode' }, { status: 400 });
    }

    const updated = await updateSettings(
      Boolean(is_active),
      Number(interval_hours || 2),
      post_mode || 'random'
    );

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
