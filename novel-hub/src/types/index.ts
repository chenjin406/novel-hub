export interface Book {
  id: string;
  title: string;
  author: string;
  language: 'zh' | 'en';
  source: string;
  source_url: string;
  cover_url?: string;
  description?: string;
  total_chapters: number;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  content_en?: string; // Translated content
  source_url: string;
  created_at: string;
}

export interface CrawlJob {
  id: string;
  book_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string }[];
  languages: string[];
  formats: { [key: string]: string };
  subjects: string[];
}
