import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/n8n/webhook/[jobId] - n8n webhook endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const body = await request.json();
    const { status, progress = 0, error, data } = body;

    // Validate job exists
    const { data: job, error: jobError } = await supabaseAdmin
      .from('crawl_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update job status
    const updateData: any = {
      status: status || 'running',
      progress: Math.min(100, Math.max(0, progress)),
      updated_at: new Date().toISOString(),
    };

    if (error) {
      updateData.error = error;
      updateData.status = 'failed';
    }

    if (status === 'completed' && data) {
      updateData.status = 'completed';
      updateData.progress = 100;
      
      // Process completed data
      if (data.bookId) {
        // Update book with processed chapters
        const { error: bookError } = await supabaseAdmin
          .from('books')
          .update({ total_chapters: data.totalChapters })
          .eq('id', data.bookId);

        if (bookError) {
          console.error('Failed to update book:', bookError);
        }
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('crawl_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, jobId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/n8n/webhook/[jobId] - Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const { data: job, error } = await supabaseAdmin
      .from('crawl_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
