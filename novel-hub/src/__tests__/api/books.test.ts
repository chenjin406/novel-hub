import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/books/route';
import { supabase, supabaseAdmin } from '@/lib/supabase';

describe('/api/books', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return list of books with pagination', async () => {
      const mockBooks = [
        {
          id: '1',
          title: 'Test Book',
          author: 'Test Author',
          language: 'zh',
          source: 'gutenberg',
          source_url: 'https://example.com',
          total_chapters: 10,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockBooks,
          error: null,
          count: 1,
        }),
      } as any);

      const request = new Request('http://localhost/api/books');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toHaveLength(1);
      expect(data.books[0].title).toBe('Test Book');
      expect(data.total).toBe(1);
    });

    it('should handle pagination parameters', async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: mockRange,
      } as any);

      const request = new Request('http://localhost/api/books?page=2&limit=10');
      await GET(request);

      expect(mockRange).toHaveBeenCalledWith(10, 19);
    });

    it('should handle errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0,
        }),
      } as any);

      const request = new Request('http://localhost/api/books');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('should create a new book', async () => {
      const mockBook = {
        id: '1',
        title: 'New Book',
        author: 'New Author',
        language: 'zh',
        source: 'gutenberg',
        source_url: 'https://example.com',
        total_chapters: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockBook,
          error: null,
        }),
      } as any);

      const request = new Request('http://localhost/api/books', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Book',
          author: 'New Author',
          source: 'gutenberg',
          source_url: 'https://example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.book.title).toBe('New Book');
    });

    it('should reject missing required fields', async () => {
      const request = new Request('http://localhost/api/books', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Incomplete Book',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
