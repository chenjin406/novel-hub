import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/books/[id] - Get book details with chapters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Get chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, chapter_number, title')
      .eq('book_id', id)
      .order('chapter_number', { ascending: true });

    if (chaptersError) {
      return NextResponse.json({ error: chaptersError.message }, { status: 500 });
    }

    return NextResponse.json({ book, chapters });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/books/[id] - Delete a book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase.from('books').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
