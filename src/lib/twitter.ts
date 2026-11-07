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

  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  return client.readWrite;
}

export async function sendTweet(text: string): Promise<{ id: string; text: string }> {
  const client = getTwitterClient();
  const res = await client.v2.tweet(text);
  return {
    id: res.data.id,
    text: res.data.text,
  };
}
