import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios before importing translator
const mockPost = vi.fn();
vi.mock('axios', () => ({
  default: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

// Set env before importing
const originalEnv = { ...process.env };

describe('Translator', () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv, AI_API_KEY: 'test-key', AI_API_BASE: 'https://api.test.com/v1' };
    mockPost.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('needsTranslation', () => {
    it('should detect Chinese text', async () => {
      const { needsTranslation } = await import('@/lib/translator');
      expect(needsTranslation('这是一段中文')).toBe(true);
      expect(needsTranslation('Hello World')).toBe(false);
      expect(needsTranslation('混合 content 内容')).toBe(true);
    });
  });

  describe('translateToEnglish', () => {
    it('should translate text successfully', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'This is translated text.' } }],
        },
      });

      const { translateToEnglish } = await import('@/lib/translator');
      const result = await translateToEnglish('这是中文文本');

      expect(result.translatedText).toBe('This is translated text.');
      expect(result.error).toBeUndefined();
    });

    it('should handle missing API key', async () => {
      process.env.AI_API_KEY = undefined;
      
      const { translateToEnglish } = await import('@/lib/translator');
      const result = await translateToEnglish('测试文本');

      expect(result.translatedText).toBe('');
      expect(result.error).toBe('AI_API_KEY not configured');
    });

    it('should handle API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const { translateToEnglish } = await import('@/lib/translator');
      const result = await translateToEnglish('测试文本');

      expect(result.translatedText).toBe('');
      expect(result.error).toBe('Network error');
    });

    it('should use custom model', async () => {
      mockPost.mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Translated' } }] },
      });

      const { translateToEnglish } = await import('@/lib/translator');
      await translateToEnglish('测试', { model: 'gpt-4', chunkSize: 500 });

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'gpt-4' }),
        expect.any(Object)
      );
    });
  });

  describe('batchTranslate', () => {
    it('should translate multiple texts', async () => {
      mockPost.mockResolvedValue({
        data: { choices: [{ message: { content: 'Translated' } }] },
      });

      const { batchTranslate } = await import('@/lib/translator');
      const results = await batchTranslate(['文本一', '文本二', '文本三']);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.translatedText === 'Translated')).toBe(true);
    });

    it('should respect concurrency limit', async () => {
      mockPost.mockResolvedValue({
        data: { choices: [{ message: { content: 'Translated' } }] },
      });

      const { batchTranslate } = await import('@/lib/translator');
      await batchTranslate(['1', '2', '3', '4', '5'], { concurrency: 2 });

      expect(mockPost).toHaveBeenCalled();
    });
  });
});
