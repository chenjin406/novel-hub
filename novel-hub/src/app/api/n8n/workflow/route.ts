import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/n8n/workflow - List available workflows
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (workflowId) {
      // Get specific workflow status
      const { data, error } = await supabaseAdmin
        .from('crawl_jobs')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ workflow: data });
    }

    // List recent workflows
    const { data, error } = await supabaseAdmin
      .from('crawl_jobs')
      .select('id, book_id, status, progress, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workflows: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/n8n/workflow - Trigger n8n workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, 
      gutenbergId, 
      bookTitle, 
      bookAuthor, 
      translate = false,
      aiModel = 'gpt-3.5-turbo'
    } = body;

    if (action === 'crawl-and-translate') {
      // Create a new crawl job for n8n to process
      const { data: job, error } = await supabaseAdmin
        .from('crawl_jobs')
        .insert({
          book_id: null, // Will be set by n8n
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Return job info for n8n to process
      return NextResponse.json({
        jobId: job.id,
        gutenbergId,
        bookTitle,
        bookAuthor,
        translate,
        aiModel,
        n8nWebhook: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/n8n/webhook/${job.id}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
