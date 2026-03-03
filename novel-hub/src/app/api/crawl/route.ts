import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  searchChineseBooks,
  getBookDetails,
  downloadBookContent,
  downloadTextContent,
  parseTextToChapters,
} from '@/lib/gutenberg';
import { translateToEnglish, needsTranslation } from '@/lib/translator';

// POST /api/crawl - Start a crawl job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'search':
        return await handleSearch(params);
      case 'import':
        return await handleImport(params);
      case 'status':
        return await handleStatus(params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Search for books on Gutenberg
async function handleSearch(params: { query?: string }) {
  const books = await searchChineseBooks(params.query);
  return NextResponse.json({ books, total: books.length });
}

// Import a book from Gutenberg
async function handleImport(params: { gutenbergId: number; translate?: boolean }) {
  const { gutenbergId, translate = false } = params;

  // Get book details
  const details = await getBookDetails(gutenbergId);
  if (!details) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  // Check if already imported
  const { data: existing } = await supabaseAdmin
    .from('books')
    .select('id')
    .eq('source', 'gutenberg')
    .eq('source_url', `https://www.gutenberg.org/ebooks/${gutenbergId}`)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Book already imported', bookId: existing.id }, { status: 409 });
  }

  // Create book record
  const { data: book, error: bookError } = await supabaseAdmin
    .from('books')
    .insert({
      title: details.title,
      author: details.author || 'Unknown',
      language: 'zh',
      source: 'gutenberg',
      source_url: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
      description: details.description,
    })
    .select()
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }

  // Create crawl job
  const { data: crawlJob } = await supabaseAdmin
    .from('crawl_jobs')
    .insert({
      book_id: book.id,
      status: 'running',
    })
    .select()
    .single();

  // Start async import process
  importChapters(book.id, details.formats, translate).catch(console.error);

  return NextResponse.json({
    message: 'Import started',
    book,
    crawlJob,
  });
}

// Async chapter import process
async function importChapters(
  bookId: string,
  formats: { [key: string]: string },
  translate: boolean
) {
  try {
    let chapters: { title: string; content: string }[] = [];

    // Try HTML first, then plain text
    if (formats.html) {
      const result = await downloadBookContent(`https://www.gutenberg.org${formats.html}`);
      if (result) {
        chapters = result.chapters;
      }
    } else if (formats.txt) {
      const text = await downloadTextContent(`https://www.gutenberg.org${formats.txt}`);
      if (text) {
        chapters = parseTextToChapters(text);
      }
    }

    // Insert chapters
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      let contentEn: string | null = null;

      // Translate if needed and requested
      if (translate && needsTranslation(chapter.content)) {
        const result = await translateToEnglish(chapter.content);
        if (!result.error) {
          contentEn = result.translatedText;
        }
      }

      await supabaseAdmin.from('chapters').insert({
        book_id: bookId,
        chapter_number: i + 1,
        title: chapter.title,
        content: chapter.content,
        content_en: contentEn,
        source_url: '',
      });

      // Update progress
      const progress = Math.round(((i + 1) / chapters.length) * 100);
      await supabaseAdmin
        .from('crawl_jobs')
        .update({ progress })
        .eq('book_id', bookId);
    }

    // Update book with total chapters
    await supabaseAdmin.from('books').update({ total_chapters: chapters.length }).eq('id', bookId);

    // Mark job as completed
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ status: 'completed', progress: 100 })
      .eq('book_id', bookId);
  } catch (error) {
    console.error('Import error:', error);
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ status: 'failed', error: String(error) })
      .eq('book_id', bookId);
  }
}

// Check crawl job status
async function handleStatus(params: { bookId: string }) {
  const { bookId } = params;

  const { data, error } = await supabaseAdmin
    .from('crawl_jobs')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ crawlJob: data });
}
