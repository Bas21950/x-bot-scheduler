import { neon } from '@neondatabase/serverless';

export interface Post {
  id: number;
  content: string;
  status: 'pending' | 'posted' | 'draft' | 'archived';
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostLog {
  id: number;
  post_id: number | null;
  content: string;
  tweet_id: string | null;
  status: 'success' | 'failed';
  error_message: string | null;
  posted_at: string;
}

export interface BotSettings {
  id: number;
  is_active: boolean;
  interval_hours: number;
  post_mode: 'random' | 'sequential';
  last_run_at: string | null;
  updated_at: string;
}

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  return neon(databaseUrl);
}

export async function getAllPosts(): Promise<Post[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, content, status, post_count, created_at, updated_at
    FROM x_posts
    ORDER BY id DESC
  `;
  return rows as Post[];
}

export async function createPost(content: string, status: string = 'pending'): Promise<Post> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO x_posts (content, status)
    VALUES (${content}, ${status})
    RETURNING id, content, status, post_count, created_at, updated_at
  `;
  return rows[0] as Post;
}

export async function updatePost(
  id: number,
  updates: { content?: string; status?: string }
): Promise<Post | null> {
  const sql = getDb();
  if (updates.content !== undefined && updates.status !== undefined) {
    const rows = await sql`
      UPDATE x_posts
      SET content = ${updates.content}, status = ${updates.status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, content, status, post_count, created_at, updated_at
    `;
    return (rows[0] as Post) || null;
  } else if (updates.content !== undefined) {
    const rows = await sql`
      UPDATE x_posts
      SET content = ${updates.content}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, content, status, post_count, created_at, updated_at
    `;
    return (rows[0] as Post) || null;
  } else if (updates.status !== undefined) {
    const rows = await sql`
      UPDATE x_posts
      SET status = ${updates.status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, content, status, post_count, created_at, updated_at
    `;
    return (rows[0] as Post) || null;
  }
  return null;
}

export async function deletePost(id: number): Promise<boolean> {
  const sql = getDb();
  const res = await sql`DELETE FROM x_posts WHERE id = ${id}`;
  return true;
}

export async function incrementPostCount(id: number): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE x_posts
    SET post_count = post_count + 1, status = 'posted', updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function getSettings(): Promise<BotSettings> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, is_active, interval_hours, post_mode, last_run_at, updated_at
    FROM x_bot_settings
    WHERE id = 1
  `;
  if (rows.length === 0) {
    const inserted = await sql`
      INSERT INTO x_bot_settings (id, is_active, interval_hours, post_mode)
      VALUES (1, false, 2, 'random')
      RETURNING id, is_active, interval_hours, post_mode, last_run_at, updated_at
    `;
    return inserted[0] as BotSettings;
  }
  return rows[0] as BotSettings;
}

export async function updateSettings(
  is_active: boolean,
  interval_hours: number,
  post_mode: 'random' | 'sequential'
): Promise<BotSettings> {
  const sql = getDb();
  const rows = await sql`
    UPDATE x_bot_settings
    SET is_active = ${is_active}, interval_hours = ${interval_hours}, post_mode = ${post_mode}, updated_at = NOW()
    WHERE id = 1
    RETURNING id, is_active, interval_hours, post_mode, last_run_at, updated_at
  `;
  return rows[0] as BotSettings;
}

export async function updateLastRun(): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE x_bot_settings
    SET last_run_at = NOW()
    WHERE id = 1
  `;
}

export async function getLogs(limit: number = 30): Promise<PostLog[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, post_id, content, tweet_id, status, error_message, posted_at
    FROM x_post_logs
    ORDER BY posted_at DESC
    LIMIT ${limit}
  `;
  return rows as PostLog[];
}

export async function addLog(
  postId: number | null,
  content: string,
  tweetId: string | null,
  status: 'success' | 'failed',
  errorMessage: string | null = null
): Promise<PostLog> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO x_post_logs (post_id, content, tweet_id, status, error_message)
    VALUES (${postId}, ${content}, ${tweetId}, ${status}, ${errorMessage})
    RETURNING id, post_id, content, tweet_id, status, error_message, posted_at
  `;
  return rows[0] as PostLog;
}

export async function getNextPost(mode: 'random' | 'sequential'): Promise<Post | null> {
  const sql = getDb();
  
  if (mode === 'random') {
    // Pick randomly from posts that are not archived or draft (pending or posted)
    const rows = await sql`
      SELECT id, content, status, post_count, created_at, updated_at
      FROM x_posts
      WHERE status IN ('pending', 'posted')
      ORDER BY RANDOM()
      LIMIT 1
    `;
    return (rows[0] as Post) || null;
  } else {
    // Sequential: prioritize pending posts first (FIFO), then least posted
    const pendingRows = await sql`
      SELECT id, content, status, post_count, created_at, updated_at
      FROM x_posts
      WHERE status = 'pending'
      ORDER BY id ASC
      LIMIT 1
    `;
    if (pendingRows.length > 0) {
      return pendingRows[0] as Post;
    }

    // If no pending, cycle through posts with lowest post_count
    const rows = await sql`
      SELECT id, content, status, post_count, created_at, updated_at
      FROM x_posts
      WHERE status = 'posted'
      ORDER BY post_count ASC, updated_at ASC
      LIMIT 1
    `;
    return (rows[0] as Post) || null;
  }
}
