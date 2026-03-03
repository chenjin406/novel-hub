import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/chapters/[id] - Get chapter content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'zh'; // 'zh' or 'en'

    const { data: chapter, error } = await supabase
      .from('chapters')
      .select('*, books(title, author)')
      .eq('id', id)
      .single();

    if (error || !chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Return appropriate language content
    const response = {
      ...chapter,
      displayContent: lang === 'en' && chapter.content_en ? chapter.content_en : chapter.content,
      hasTranslation: !!chapter.content_en,
    };

    return NextResponse.json({ chapter: response });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
