import { NextResponse } from 'next/server';
import { getAllPosts, createPost } from '@/lib/db';

export async function GET() {
  try {
    const posts = await getAllPosts();
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, status = 'pending' } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Content cannot be empty' }, { status: 400 });
    }

    if (content.length > 280) {
      return NextResponse.json({ success: false, error: 'Content exceeds 280 characters' }, { status: 400 });
    }

    const newPost = await createPost(content.trim(), status);
    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
