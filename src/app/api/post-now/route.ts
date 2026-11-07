import { NextResponse } from 'next/server';
import { sendTweet, isTwitterConfigured } from '@/lib/twitter';
import { addLog, incrementPostCount, updateLastRun } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, postId } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'ข้อความต้องไม่ว่างเปล่า' }, { status: 400 });
    }

    const trimmed = text.trim();
    if (trimmed.length > 280) {
      return NextResponse.json({ success: false, error: 'ข้อความมีความยาวเกิน 280 ตัวอักษร' }, { status: 400 });
    }

    if (!isTwitterConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'ยังไม่ได้ระบุ X API Keys ใน .env.local (ต้องการ X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)',
      }, { status: 400 });
    }

    try {
      // Send to X API v2
      const tweetResult = await sendTweet(trimmed);

      // Record log in DB
      await addLog(postId ? Number(postId) : null, trimmed, tweetResult.id, 'success');

      // Update post count if associated with a post in database
      if (postId) {
        await incrementPostCount(Number(postId));
      }

      await updateLastRun();

      return NextResponse.json({
        success: true,
        tweetId: tweetResult.id,
        tweetUrl: `https://x.com/user/status/${tweetResult.id}`,
      });
    } catch (twitterErr: any) {
      console.error('Twitter API execution error:', twitterErr);
      const errMsg = twitterErr?.data?.detail || twitterErr?.message || 'ไม่สามารถส่งโพสต์ขึ้น X ได้';
      
      // Save failure to log
      await addLog(postId ? Number(postId) : null, trimmed, null, 'failed', errMsg);

      return NextResponse.json({
        success: false,
        error: errMsg,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Post-now route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
