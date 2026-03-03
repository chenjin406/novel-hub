import { createClient } from '@supabase/supabase-js';
import mockDb from './mock-db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create mock Supabase client for fallback
const createMockClient = () => ({
  from: (table: string) => ({
    select: () => ({
      eq: () => ({ data: mockDb.getBooks(), error: null }),
      single: () => ({ data: mockDb.getBooks()[0], error: null }),
      order: () => ({ data: mockDb.getBooks(), error: null })
    }),
    insert: (data: any) => ({ data: [data], error: null }),
    update: (data: any) => ({ data: [data], error: null }),
    delete: () => ({ data: [], error: null }),
    eq: () => ({ data: [], error: null })
  })
});

// Use mock database if Supabase credentials are not available
let supabaseClient: any;
let supabaseAdminClient: any;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.warn('Supabase credentials not found, using mock database');
  supabaseClient = createMockClient();
  supabaseAdminClient = createMockClient();
} else {
  // Client-side Supabase client (public operations)
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  // Server-side Supabase client with service role (admin operations)
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
}

export const supabase = supabaseClient;
export const supabaseAdmin = supabaseAdminClient;

// Database types
export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          author: string;
          language: string;
          source: string;
          source_url: string;
          cover_url: string | null;
          description: string | null;
          total_chapters: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author: string;
          language?: string;
          source: string;
          source_url: string;
          cover_url?: string | null;
          description?: string | null;
          total_chapters?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string;
          language?: string;
          source?: string;
          source_url?: string;
          cover_url?: string | null;
          description?: string | null;
          total_chapters?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          chapter_number: number;
          title: string;
          content: string;
          content_en: string | null;
          source_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_number: number;
          title: string;
          content: string;
          content_en?: string | null;
          source_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_number?: number;
          title?: string;
          content?: string;
          content_en?: string | null;
          source_url?: string;
          created_at?: string;
        };
      };
      crawl_jobs: {
        Row: {
          id: string;
          book_id: string;
          status: string;
          progress: number;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          status?: string;
          progress?: number;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          status?: string;
          progress?: number;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
