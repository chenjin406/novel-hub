// Mock database for demo purposes
export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url?: string;
  gutenberg_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  title: string;
  content: string;
  chapter_number: number;
  created_at: string;
}

// In-memory storage
let books: Book[] = [];
let chapters: Chapter[] = [];
let currentId = 1;

export const mockDb = {
  // Books
  getBooks: () => books,
  getBook: (id: string) => books.find(book => book.id === id),
  createBook: (book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => {
    const newBook: Book = {
      ...book,
      id: String(currentId++),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    books.push(newBook);
    return newBook;
  },
  updateBook: (id: string, updates: Partial<Book>) => {
    const index = books.findIndex(book => book.id === id);
    if (index !== -1) {
      books[index] = { ...books[index], ...updates, updated_at: new Date().toISOString() };
      return books[index];
    }
    return null;
  },
  deleteBook: (id: string) => {
    const index = books.findIndex(book => book.id === id);
    if (index !== -1) {
      const deleted = books[index];
      books.splice(index, 1);
      // Also delete associated chapters
      chapters = chapters.filter(chapter => chapter.book_id !== id);
      return deleted;
    }
    return null;
  },

  // Chapters
  getChapters: (bookId: string) => chapters.filter(chapter => chapter.book_id === bookId),
  getChapter: (id: string) => chapters.find(chapter => chapter.id === id),
  createChapter: (chapter: Omit<Chapter, 'id' | 'created_at'>) => {
    const newChapter: Chapter = {
      ...chapter,
      id: String(currentId++),
      created_at: new Date().toISOString()
    };
    chapters.push(newChapter);
    return newChapter;
  },
  createChapters: (newChapters: Omit<Chapter, 'id' | 'created_at'>[]) => {
    const createdChapters = newChapters.map(chapter => ({
      ...chapter,
      id: String(currentId++),
      created_at: new Date().toISOString()
    }));
    chapters.push(...createdChapters);
    return createdChapters;
  },

  // Crawl jobs
  getCrawlJobs: () => [], // Return empty array for now
  createCrawlJob: (job: any) => ({ id: String(currentId++), ...job, status: 'pending' }),
  updateCrawlJob: (id: string, updates: any) => ({ id, ...updates })
};

// Initialize with some sample data
if (books.length === 0) {
  const sampleBooks = [
    {
      title: '傲慢与偏见',
      author: '简·奥斯汀',
      description: '这是一部关于爱情、婚姻和社会偏见的经典小说。',
      cover_url: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
      gutenberg_id: 1342
    },
    {
      title: '简·爱',
      author: '夏洛蒂·勃朗特',
      description: '一个孤女成长为独立女性的励志故事。',
      cover_url: 'https://www.gutenberg.org/cache/epub/1260/pg1260.cover.medium.jpg',
      gutenberg_id: 1260
    },
    {
      title: '呼啸山庄',
      author: '艾米莉·勃朗特',
      description: '一个关于爱情、复仇和救赎的哥特式小说。',
      cover_url: 'https://www.gutenberg.org/cache/epub/768/pg768.cover.medium.jpg',
      gutenberg_id: 768
    }
  ];

  sampleBooks.forEach(book => mockDb.createBook(book));
}

export default mockDb;