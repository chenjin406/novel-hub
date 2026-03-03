import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content_en?: string;
}

async function getBook(id: string) {
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (!book) return null;

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, chapter_number, title, content_en')
    .eq('book_id', id)
    .order('chapter_number', { ascending: true });

  return { book, chapters: (chapters as Chapter[]) || [] };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getBook(id);

  if (!data) notFound();

  const { book, chapters } = data;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              📚 NovelHub
            </Link>
            <Link
              href="/import"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Import Books
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to Library
          </Link>
        </div>

        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {book.title}
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            by {book.author}
          </p>
          {book.description && (
            <p className="mt-4 text-zinc-700 dark:text-zinc-300">{book.description}</p>
          )}
          <div className="mt-4 flex gap-4 text-sm text-zinc-500 dark:text-zinc-500">
            <span>{book.total_chapters} chapters</span>
            <span>•</span>
            <span>Language: {book.language.toUpperCase()}</span>
            <span>•</span>
            <span>Source: {book.source}</span>
          </div>
          <a
            href={book.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            View on Project Gutenberg →
          </a>
        </div>

        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Chapters
        </h2>

        {chapters.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">
              No chapters available. The import may still be in progress.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/books/${id}/chapter/${chapter.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {chapter.chapter_number}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {chapter.title}
                  </span>
                </div>
                {chapter.content_en && (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    Translated
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
