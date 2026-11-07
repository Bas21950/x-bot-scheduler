import { NextResponse } from 'next/server';
import { APP_VERSION, GITHUB_REPO, compareVersions } from '@/lib/version';

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'x-bot-scheduler-app-client',
      },
      next: { revalidate: 15 }, // Cache on server for 15s to prevent GitHub rate limits while providing near realtime checks
    });

    if (res.status === 404 || res.status === 403) {
      return NextResponse.json({
        success: true,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        hasUpdate: false,
        message: res.status === 403 ? 'GitHub API rate limited' : 'No releases found on GitHub repository',
      });
    }

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        hasUpdate: false,
      });
    }

    const release = await res.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

    const exeAsset = release.assets?.find((a: any) => a.name?.endsWith('.exe'));
    const downloadUrl = exeAsset?.browser_download_url || release.html_url;

    return NextResponse.json({
      success: true,
      currentVersion: APP_VERSION,
      latestVersion,
      hasUpdate,
      releaseName: release.name || release.tag_name,
      releaseNotes: release.body || 'ไม่มีรายละเอียดเพิ่มเติมสำหรับเวอร์ชันนี้',
      publishedAt: release.published_at,
      downloadUrl,
      releaseUrl: release.html_url,
    });
  } catch (error: any) {
    console.error('Error checking for update:', error.message);
    return NextResponse.json({
      success: true,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      hasUpdate: false,
    });
  }
}
