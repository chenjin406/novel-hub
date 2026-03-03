import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET /api/books - List all books
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('books')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      books: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/books - Create a new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, author, language, source, source_url, cover_url, description } = body;

    if (!title || !author || !source || !source_url) {
      return NextResponse.json(
        { error: 'Missing required fields: title, author, source, source_url' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('books')
      .insert({
        title,
        author,
        language: language || 'zh',
        source,
        source_url,
        cover_url,
        description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ book: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
