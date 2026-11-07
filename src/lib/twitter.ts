import { TwitterApi } from 'twitter-api-v2';

export function isTwitterConfigured(): boolean {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  return Boolean(appKey && appSecret && accessToken && accessSecret);
}

export function getTwitterClient() {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error('กรุณากรอก X API Keys & Access Tokens ในไฟล์ .env.local ให้ครบถ้วนก่อน');
  }

  return new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
}

export async function sendTweet(
  text: string,
  imageUrl?: string | null
): Promise<{ id: string; text: string }> {
  const client = getTwitterClient();

  let mediaId: string | undefined = undefined;

  if (imageUrl && imageUrl.trim().length > 0) {
    try {
      let buffer: Buffer;
      let mimeType = 'image/jpeg';

      if (imageUrl.startsWith('data:')) {
        // Base64 Data URI (e.g. data:image/png;base64,....)
        const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(imageUrl.split(',')[1] || imageUrl, 'base64');
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Remote Image URL
        const res = await fetch(imageUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch image from URL: ${res.statusText}`);
        }
        const contentType = res.headers.get('content-type');
        if (contentType) mimeType = contentType;
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        // Plain base64
        buffer = Buffer.from(imageUrl, 'base64');
      }

      // Upload media using client.v1.uploadMedia
      mediaId = await client.v1.uploadMedia(buffer, { mimeType });
    } catch (uploadErr: any) {
      console.error('Error uploading media to X:', uploadErr);
      throw new Error(`ไม่สามารถอัปโหลดรูปภาพไปยัง X ได้: ${uploadErr.message}`);
    }
  }

  // Post Tweet using v2
  const tweetPayload: any = { text };
  if (mediaId) {
    tweetPayload.media = { media_ids: [mediaId] };
  }

  const res = await client.v2.tweet(tweetPayload);
  return {
    id: res.data.id,
    text: res.data.text,
  };
}
