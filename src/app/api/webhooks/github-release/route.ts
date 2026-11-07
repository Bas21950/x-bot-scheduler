import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const event = req.headers.get('x-github-event');
    const body = await req.json();

    console.log(`Received GitHub Webhook Event: ${event}, Action: ${body?.action}`);

    // When a release is published
    if (event === 'release' && (body.action === 'published' || body.action === 'created')) {
      const release = body.release;
      const latestVersion = (release.tag_name || '').replace(/^v/, '');
      const releaseNotes = release.body || '';
      const releaseName = release.name || release.tag_name;

      console.log(`🚀 New Release Event via Webhook: ${latestVersion} - ${releaseName}`);

      // Here you can broadcast or trigger notification services
      return NextResponse.json({
        success: true,
        message: `Release ${latestVersion} processed successfully`,
        release: {
          version: latestVersion,
          name: releaseName,
          notes: releaseNotes,
          publishedAt: release.published_at,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Event ignored (not a published release)' });
  } catch (error: any) {
    console.error('Error handling GitHub webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
