import { NextResponse } from 'next/server';
import { updatePost, deletePost } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const { content, status } = body;

    if (content !== undefined && content.length > 280) {
      return NextResponse.json({ success: false, error: 'Content exceeds 280 characters' }, { status: 400 });
    }

    const updated = await updatePost(postId, { content, status });
    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    await deletePost(postId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
