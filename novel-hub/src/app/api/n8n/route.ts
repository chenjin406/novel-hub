import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/n8n - Health check and info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'health') {
      return NextResponse.json({
        status: 'ok',
        service: 'n8n-novelhub',
        version: '1.0.0',
        features: ['crawler', 'translator', 'workflow'],
      });
    }

    if (action === 'workflows') {
      // List available workflows
      const { data, error } = await supabaseAdmin
        .from('crawl_jobs')
        .select('id, book_id, status, progress, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ workflows: data || [] });
    }

    return NextResponse.json({
      message: 'n8n-novelhub API',
      endpoints: [
        '/api/n8n?action=health',
        '/api/n8n?action=workflows',
        'POST /api/n8n/crawl-translate',
        'POST /api/n8n/webhook/:jobId',
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/n8n - Execute workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'crawl-translate':
        return await handleCrawlTranslate(params);
      case 'webhook':
        return await handleWebhook(params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handle crawl and translate workflow
async function handleCrawlTranslate(params: { 
  gutenbergId: number; 
  translate?: boolean; 
  aiModel?: string;
}) {
  const { gutenbergId, translate = false, aiModel = 'gpt-3.5-turbo' } = params;

  // Create a new crawl job
  const { data: job, error } = await supabaseAdmin
    .from('crawl_jobs')
    .insert({
      book_id: null, // Will be set by worker
      status: 'pending',
      progress: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Start background processing
  processCrawlTranslateJob(job.id, gutenbergId, translate, aiModel).catch(console.error);

  return NextResponse.json({
    message: 'Crawl and translate workflow started',
    jobId: job.id,
    gutenbergId,
    translate,
    aiModel,
    statusUrl: `/api/n8n/webhook/${job.id}`,
  });
}

// Handle webhook callbacks
async function handleWebhook(params: { jobId: string; status: string; data?: any; error?: string }) {
  const { jobId, status, data, error } = params;

  const updateData: any = {
    status: status || 'running',
    progress: Math.min(100, Math.max(0, data?.progress || 0)),
    updated_at: new Date().toISOString(),
  };

  if (error) {
    updateData.error = error;
    updateData.status = 'failed';
  }

  if (status === 'completed' && data) {
    updateData.status = 'completed';
    updateData.progress = 100;
  }

  const { error: updateError } = await supabaseAdmin
    .from('crawl_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, jobId });
}

// Background worker for crawl and translate
async function processCrawlTranslateJob(
  jobId: string,
  gutenbergId: number,
  translate: boolean,
  aiModel: string
) {
  try {
    // Update job status
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ status: 'running', progress: 10 })
      .eq('id', jobId);

    // Import the crawler functions
    const { 
      getBookDetails, 
      downloadBookContent, 
      downloadTextContent, 
      parseTextToChapters 
    } = await import('@/lib/gutenberg');

    const { translateToEnglish, needsTranslation } = await import('@/lib/translator');

    // Get book details
    const details = await getBookDetails(gutenbergId);
    if (!details) {
      throw new Error('Book not found');
    }

    // Update progress
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ progress: 30 })
      .eq('id', jobId);

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
      throw new Error('Failed to create book');
    }

    // Update job with book ID
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ book_id: book.id, progress: 50 })
      .eq('id', jobId);

    // Download and parse content
    let chapters = [];
    if (details.formats.html) {
      const result = await downloadBookContent(`https://www.gutenberg.org${details.formats.html}`);
      if (result) chapters = result.chapters;
    } else if (details.formats.txt) {
      const text = await downloadTextContent(`https://www.gutenberg.org${details.formats.txt}`);
      if (text) chapters = parseTextToChapters(text);
    }

    if (chapters.length === 0) {
      throw new Error('No content found');
    }

    // Update progress
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ progress: 70 })
      .eq('id', jobId);

    // Process chapters
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      let contentEn = null;

      // Translate if requested
      if (translate && needsTranslation(chapter.content)) {
        const result = await translateToEnglish(chapter.content, { model: aiModel });
        if (!result.error) {
          contentEn = result.translatedText;
        }
      }

      // Save chapter to database
      await supabaseAdmin.from('chapters').insert({
        book_id: book.id,
        chapter_number: i + 1,
        title: chapter.title,
        content: chapter.content,
        content_en: contentEn,
        source_url: '',
      });

      // Update progress
      const progress = 70 + Math.round(((i + 1) / chapters.length) * 25);
      await supabaseAdmin
        .from('crawl_jobs')
        .update({ progress })
        .eq('id', jobId);
    }

    // Update book with total chapters
    await supabaseAdmin.from('books').update({ total_chapters: chapters.length }).eq('id', book.id);

    // Mark job as completed
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ status: 'completed', progress: 100 })
      .eq('id', jobId);

    console.log(`✅ Crawl and translate completed for book ${book.id}`);

  } catch (error) {
    console.error('Crawl and translate failed:', error);
    
    await supabaseAdmin
      .from('crawl_jobs')
      .update({ status: 'failed', error: error.message })
      .eq('id', jobId);
  }
}