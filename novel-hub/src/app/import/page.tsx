'use client';

import { useState } from 'react';
import Link from 'next/link';

interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string }[];
}

export default function ImportPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GutenbergBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query }),
      });

      const data = await res.json();
      if (data.books) {
        setResults(data.books);
        if (data.books.length === 0) {
          setMessage('No books found. Try a different search.');
        }
      } else {
        setMessage(data.error || 'Search failed');
      }
    } catch (error) {
      setMessage('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(gutenbergId: number, translate: boolean) {
    setImporting(gutenbergId);
    setMessage('');

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', gutenbergId, translate }),
      });

      const data = await res.json();
      if (data.message) {
        setMessage(`Import started for: ${data.book.title}`);
        // Poll for completion
        pollImportStatus(data.book.id);
      } else {
        setMessage(data.error || 'Import failed');
        setImporting(null);
      }
    } catch (error) {
      setMessage('Import failed. Please try again.');
      setImporting(null);
    }
  }

  async function pollImportStatus(bookId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', bookId }),
        });

        const data = await res.json();
        if (data.crawlJob?.status === 'completed') {
          setMessage('Import completed! Check the book list.');
          setImporting(null);
          clearInterval(interval);
        } else if (data.crawlJob?.status === 'failed') {
          setMessage(`Import failed: ${data.crawlJob.error}`);
          setImporting(null);
          clearInterval(interval);
        }
      } catch (error) {
        clearInterval(interval);
        setImporting(null);
      }
    }, 3000);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              📚 NovelHub
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back to Library
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Import Books from Project Gutenberg
        </h1>

        <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Only public domain books from Project Gutenberg are imported.
            This ensures legal compliance with copyright laws.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Chinese books on Gutenberg..."
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {message && (
          <div className="mb-6 rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
            {message}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {book.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {book.authors[0]?.name || 'Unknown Author'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Gutenberg ID: {book.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImport(book.id, false)}
                    disabled={importing !== null}
                    className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => handleImport(book.id, true)}
                    disabled={importing !== null}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Import + Translate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
