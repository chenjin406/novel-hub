import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { User, Coin, Crown, BookOpen } from '@mui/icons-material';

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

async function getUserData() {
  try {
    const user = await getCurrentUser();
    return user;
  } catch (error) {
    return null;
  }
}

export default async function Home() {
  const books = await getBooks();
  const user = await getUserData();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              📚 NovelHub
            </Link>
            <nav className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <Link href="/bookshelf" className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                    <BookOpen className="w-4 h-4" />
                    书架
                  </Link>
                  <Link href="/profile" className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-6 h-6 rounded-full" />
                      ) : (
                        <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      )}
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.username}</span>
                      {user.vip_level > 0 && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg px-2 py-1">
                    <Coin className="w-3 h-3 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{user.coins}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    注册
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {user ? `${user.username} 的推荐` : '热门推荐'}
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
