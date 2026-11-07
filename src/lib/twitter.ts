import { TwitterApi } from 'twitter-api-v2';

function cleanSecret(val?: string | null): string {
  if (!val) return '';
  return val
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replaceAll('\\r', '')
    .replaceAll('\\n', '')
    .replaceAll('\r', '')
    .replaceAll('\n', '')
    .trim();
}

export function isTwitterConfigured(): boolean {
  const hasOAuth1 = Boolean(
    cleanSecret(process.env.X_API_KEY) &&
    cleanSecret(process.env.X_API_SECRET) &&
    cleanSecret(process.env.X_ACCESS_TOKEN) &&
    cleanSecret(process.env.X_ACCESS_TOKEN_SECRET)
  );
  const hasOAuth2 = Boolean(cleanSecret(process.env.X_OAUTH2_ACCESS_TOKEN));
  return hasOAuth1 || hasOAuth2;
}

export function getTwitterClient() {
  const appKey = cleanSecret(process.env.X_API_KEY);
  const appSecret = cleanSecret(process.env.X_API_SECRET);
  const accessToken = cleanSecret(process.env.X_ACCESS_TOKEN);
  const accessSecret = cleanSecret(process.env.X_ACCESS_TOKEN_SECRET);

  if (appKey && appSecret && accessToken && accessSecret) {
    return new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });
  }

  const oauth2 = cleanSecret(process.env.X_OAUTH2_ACCESS_TOKEN);
  if (oauth2) {
    return new TwitterApi(oauth2);
  }

  throw new Error('กรุณากรอก X API Keys & Access Tokens ในไฟล์ .env.local ให้ครบถ้วนก่อน');
}

export async function sendTweet(
  text: string,
  imageUrl?: string | null
): Promise<{ id: string; text: string }> {
  const client = getTwitterClient();

  let mediaId: string | undefined = undefined;

  if (imageUrl && imageUrl.trim().length > 0) {
    if (!cleanSecret(process.env.X_ACCESS_TOKEN) || !cleanSecret(process.env.X_ACCESS_TOKEN_SECRET)) {
      throw new Error(
        'การโพสต์พร้อมรูปภาพจำเป็นต้องใช้ Access Token & Secret จากหัวข้อ OAuth 1.0 Keys ในหน้า Developer Console (เนื่องจาก X กำหนดว่า media upload ต้องใช้ OAuth 1.0a)'
      );
    }

    try {
      let buffer: Buffer;
      let mimeType = 'image/jpeg';

      if (imageUrl.startsWith('data:')) {
        const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(imageUrl.split(',')[1] || imageUrl, 'base64');
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const res = await fetch(imageUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch image: ${res.statusText}`);
        }
        const contentType = res.headers.get('content-type');
        if (contentType) mimeType = contentType;
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        buffer = Buffer.from(imageUrl, 'base64');
      }

      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

      mediaId = await client.v1.uploadMedia(buffer, { mimeType });
    } catch (uploadErr: any) {
      console.error('Error uploading media to X:', uploadErr);
      throw new Error(`ไม่สามารถอัปโหลดรูปภาพไปยัง X ได้: ${uploadErr.message}`);
    }
  }

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
