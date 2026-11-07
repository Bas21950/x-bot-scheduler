import { NextResponse } from 'next/server';
import { APP_VERSION, GITHUB_REPO, compareVersions } from '@/lib/version';

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'x-bot-scheduler-app',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (res.status === 404) {
      // No releases yet on GitHub
      return NextResponse.json({
        success: true,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        hasUpdate: false,
        message: 'No releases found on GitHub repository',
      });
    }

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const release = await res.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

    // Look for Windows installer asset (e.g. .exe)
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
    console.error('Error checking for update:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      currentVersion: APP_VERSION,
      hasUpdate: false,
    }, { status: 500 });
  }
}
