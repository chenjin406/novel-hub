import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
// 简化的图标组件
const UserIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const CoinIcon = () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.382-.116-.84-.262-1.319-.478C6.67 14.173 6 13.102 6 12c0-1.102.67-2.173 1.68-2.858.48-.216 1.037-.362 1.68-.478V5zm-2 0v.092a4.535 4.535 0 01-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.382-.116-.84-.262-1.319-.478C6.67 14.173 6 13.102 6 12c0-1.102.67-2.173 1.68-2.858.48-.216 1.037-.362 1.68-.478V5z" clipRule="evenodd" /></svg>;
const CrownIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 16H6v-6h2v6zm4 0h-2v-6h2v6zm4 0h-2V8a1 1 0 00-1-1h-2V5a1 1 0 011-1h2a1 1 0 011 1v11z" clipRule="evenodd" /></svg>;
const BookOpenIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>;

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
                    <BookOpenIcon />
                    书架
                  </Link>
                  <Link href="/profile" className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-6 h-6 rounded-full" />
                      ) : (
                        <UserIcon />
                      )}
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.username}</span>
                      {user.vip_level > 0 && (
                        <CrownIcon />
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg px-2 py-1">
                    <CoinIcon />
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
