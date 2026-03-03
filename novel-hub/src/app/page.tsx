import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Book {
  id: string;
  title: string;
  author: string;
  language: string;
  total_chapters: number;
  cover_url?: string;
  description?: string;
}

async function getBooks() {
  const { data } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  return (data as Book[]) || [];
}

export default async function Home() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              📚 NovelHub
            </h1>
            <nav className="flex gap-4">
              <Link
                href="/import"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Import Books
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Chinese Classics (Public Domain)
        </h2>

        {books.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">
              No books yet. Import some from Project Gutenberg!
            </p>
            <Link
              href="/import"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Start Importing
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100">
                  {book.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {book.author}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
                  <span>{book.total_chapters} chapters</span>
                  <span>•</span>
                  <span className="uppercase">{book.language}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        <p>Public domain books from Project Gutenberg • Made with Next.js</p>
      </footer>
    </div>
  );
}
