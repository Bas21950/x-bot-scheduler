import { NextResponse } from 'next/server';
import { getSettings, getNextPost, addLog, incrementPostCount, updateLastRun } from '@/lib/db';
import { sendTweet, isTwitterConfigured } from '@/lib/twitter';

export async function GET(req: Request) {
  return handleAutoPost(req);
}

export async function POST(req: Request) {
  return handleAutoPost(req);
}

async function handleAutoPost(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    // Verify Vercel Cron authorization if CRON_SECRET is set
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && !force) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
      }
    }

    // 1. Check Bot Settings
    const settings = await getSettings();
    if (!settings.is_active && !force) {
      return NextResponse.json({
        success: true,
        message: 'บอทถูกหยุดชั่วคราว (Paused) กรุณาเปิดสวิตช์ในหน้าตั้งค่า',
      });
    }

    // 2. Check Interval (unless force = true)
    if (!force && settings.last_run_at) {
      const lastRun = new Date(settings.last_run_at).getTime();
      const now = Date.now();
      const elapsedHours = (now - lastRun) / (1000 * 60 * 60);

      if (elapsedHours < settings.interval_hours) {
        return NextResponse.json({
          success: true,
          message: `ยังไม่ถึงรอบเวลา (ผ่านไป ${elapsedHours.toFixed(2)} ชม. จากที่ตั้งไว้ ${settings.interval_hours} ชม.)`,
          nextEligibleAt: new Date(lastRun + settings.interval_hours * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    // 3. Select next post from DB
    const post = await getNextPost(settings.post_mode);
    if (!post) {
      return NextResponse.json({
        success: false,
        message: 'ไม่มีข้อความในคลังที่พร้อมโพสต์ กรุณาเพิ่มข้อความในหน้าคลังโพสต์',
      });
    }

    if (!isTwitterConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'ยังไม่ได้ระบุ X API Keys & Tokens ใน .env.local หรือ Vercel Environment Variables',
      }, { status: 400 });
    }

    // 4. Send tweet to X
    try {
      const tweetResult = await sendTweet(post.content);

      // 5. Update DB
      await addLog(post.id, post.content, tweetResult.id, 'success');
      await incrementPostCount(post.id);
      await updateLastRun();

      return NextResponse.json({
        success: true,
        message: 'โพสต์ทวีตสำเร็จเรียบร้อย!',
        postId: post.id,
        tweetId: tweetResult.id,
        tweetUrl: `https://x.com/user/status/${tweetResult.id}`,
        content: post.content,
      });
    } catch (twitterErr: any) {
      console.error('Twitter API execution error in cron:', twitterErr);
      const errMsg = twitterErr?.data?.detail || twitterErr?.message || 'ไม่สามารถส่งโพสต์ขึ้น X ได้';
      
      await addLog(post.id, post.content, null, 'failed', errMsg);

      return NextResponse.json({
        success: false,
        error: errMsg,
        postId: post.id,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Auto-post handler error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
