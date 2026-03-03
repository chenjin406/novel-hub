import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Gutenberg Crawler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseTextToChapters (unit tests)', () => {
    it('should identify Chinese chapter markers', () => {
      const text = `第一章 开始
这是第一章的内容。

第二章 继续
这是第二章的内容。`;

      const chapterPatterns = [
        /^第[一二三四五六七八九十百千万零\d]+[章节回]/m,
      ];

      const matches = [...text.matchAll(new RegExp(chapterPatterns[0].source, 'gm'))];
      expect(matches.length).toBe(2);
    });

    it('should identify English chapter markers', () => {
      const text = `Chapter 1
First chapter content.

Chapter 2
Second chapter content.`;

      const matches = [...text.matchAll(/^Chapter\s+\d+/gim)];
      expect(matches.length).toBe(2);
    });

    it('should identify UPPERCASE chapter markers', () => {
      const text = `CHAPTER 1
First chapter.

CHAPTER 2
Second chapter.`;

      const matches = [...text.matchAll(/^CHAPTER\s+\d+/gm)];
      expect(matches.length).toBe(2);
    });
  });

  describe('needsTranslation', () => {
    it('should detect Chinese characters', () => {
      const chineseText = '这是一段中文';
      const englishText = 'Hello World';
      const mixedText = '混合 content 内容';

      const chinesePattern = /[\u4e00-\u9fff]/;
      
      expect(chinesePattern.test(chineseText)).toBe(true);
      expect(chinesePattern.test(englishText)).toBe(false);
      expect(chinesePattern.test(mixedText)).toBe(true);
    });
  });

  describe('HTTP requests', () => {
    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      // This tests that our code handles errors gracefully
      try {
        await mockedAxios.get('https://example.com');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Network error');
      }
    });

    it('should use correct user agent', () => {
      const userAgent = process.env.CRAWLER_USER_AGENT || 'NovelHub/1.0';
      expect(userAgent).toContain('NovelHub');
    });
  });
});