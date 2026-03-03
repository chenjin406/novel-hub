-- NovelHub Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  language TEXT DEFAULT 'zh',
  source TEXT NOT NULL, -- e.g., 'gutenberg', 'ctext'
  source_url TEXT NOT NULL,
  cover_url TEXT,
  description TEXT,
  total_chapters INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_en TEXT, -- Translated content
  source_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, chapter_number)
);

-- Crawl jobs table (for tracking crawl progress)
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_book_chapter ON chapters(book_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_book_id ON crawl_jobs(book_id);
CREATE INDEX IF NOT EXISTS idx_books_source ON books(source);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_crawl_jobs_updated_at
  BEFORE UPDATE ON crawl_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for books and chapters
CREATE POLICY "Public read books" ON books FOR SELECT USING (true);
CREATE POLICY "Public read chapters" ON chapters FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role all books" ON books FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role all chapters" ON chapters FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role all crawl_jobs" ON crawl_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Optional: Reading progress table (for user features)
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  current_chapter INTEGER DEFAULT 1,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own progress" ON reading_progress FOR ALL
  USING (auth.uid() = user_id);
