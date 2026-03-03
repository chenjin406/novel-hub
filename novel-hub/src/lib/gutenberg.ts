import * as cheerio from 'cheerio';
import axios from 'axios';
import { GutenbergBook } from '@/types/index';

const GUTENBERG_BASE = 'https://www.gutenberg.org';
const USER_AGENT = process.env.CRAWLER_USER_AGENT || 'NovelHub/1.0';

const axiosConfig = {
  headers: {
    'User-Agent': USER_AGENT,
  },
  timeout: 30000,
};

// Search for Chinese books on Project Gutenberg
export async function searchChineseBooks(query?: string): Promise<GutenbergBook[]> {
  try {
    const url = query
      ? `${GUTENBERG_BASE}/ebooks/search/?query=${encodeURIComponent(query)}&start_index=1&languages=zh`
      : `${GUTENBERG_BASE}/browse/languages/zh`;

    const response = await axios.get(url, axiosConfig);
    const $ = cheerio.load(response.data);
    const books: GutenbergBook[] = [];

    $('.booklink').each((_, element) => {
      const $el = $(element);
      const link = $el.find('.link').attr('href');
      const idMatch = link?.match(/\/ebooks\/(\d+)/);

      if (idMatch) {
        books.push({
          id: parseInt(idMatch[1]),
          title: $el.find('.title').text().trim(),
          authors: [{ name: $el.find('.subtitle').text().trim() }],
          languages: ['zh'],
          formats: {},
          subjects: [],
        });
      }
    });

    return books;
  } catch (error) {
    console.error('Error searching Gutenberg:', error);
    return [];
  }
}

// Get book details including download formats
export async function getBookDetails(bookId: number): Promise<{
  title: string;
  author: string;
  description: string;
  formats: { [key: string]: string };
  subjects: string[];
} | null> {
  try {
    const url = `${GUTENBERG_BASE}/ebooks/${bookId}`;
    const response = await axios.get(url, axiosConfig);
    const $ = cheerio.load(response.data);

    const title = $('h1[itemprop="name"]').text().trim() || $('.header').find('h1').text().trim();
    const author = $('a[itemprop="creator"]').text().trim() || $('#contributors').find('a').first().text().trim();
    const description = $('[itemprop="description"]').text().trim();

    const formats: { [key: string]: string } = {};
    $('.files').find('a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = $el.text().trim().toLowerCase();
      if (href && text) {
        if (text.includes('html')) formats['html'] = href;
        else if (text.includes('txt')) formats['txt'] = href;
        else if (text.includes('epub')) formats['epub'] = href;
      }
    });

    const subjects: string[] = [];
    $('[itemprop="keywords"]').find('a').each((_, el) => {
      subjects.push($(el).text().trim());
    });

    return { title, author, description, formats, subjects };
  } catch (error) {
    console.error('Error getting book details:', error);
    return null;
  }
}

// Download and parse book content from HTML
export async function downloadBookContent(htmlUrl: string): Promise<{
  chapters: { title: string; content: string }[];
} | null> {
  try {
    const response = await axios.get(htmlUrl, axiosConfig);
    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, header, footer').remove();

    // Try to extract chapters
    const chapters: { title: string; content: string }[] = [];

    // Method 1: Look for chapter markers
    const chapterTitles = $('h1, h2, h3').filter((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      return text.includes('chapter') || text.includes('第') || text.includes('卷');
    });

    if (chapterTitles.length > 0) {
      chapterTitles.each((index, el) => {
        const $title = $(el);
        const title = $title.text().trim();
        let content = '';

        // Get content until next chapter
        let $next = $title.next();
        while ($next.length && !$next.is('h1, h2, h3')) {
          content += $next.text() + '\n';
          $next = $next.next();
        }

        if (content.trim()) {
          chapters.push({ title, content: content.trim() });
        }
      });
    } else {
      // Method 2: Treat entire book as one chapter
      const content = $('body').text().trim();
      if (content) {
        chapters.push({ title: 'Full Text', content });
      }
    }

    return { chapters };
  } catch (error) {
    console.error('Error downloading book:', error);
    return null;
  }
}

// Alternative: Download plain text
export async function downloadTextContent(txtUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(txtUrl, axiosConfig);
    return response.data;
  } catch (error) {
    console.error('Error downloading text:', error);
    return null;
  }
}

// Parse plain text into chapters
export function parseTextToChapters(text: string): { title: string; content: string }[] {
  const chapters: { title: string; content: string }[] = [];

  // Common chapter patterns
  const chapterPatterns = [
    /^第[一二三四五六七八九十百千万零\d]+[章节回]/m,  // Chinese
    /^Chapter\s+\d+/im,  // English
    /^CHAPTER\s+\d+/m,   // English uppercase
  ];

  // Try to split by chapter patterns
  for (const pattern of chapterPatterns) {
    const matches = [...text.matchAll(new RegExp(pattern.source, 'gm'))];
    if (matches.length > 1) {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index!;
        const end = i < matches.length - 1 ? matches[i + 1].index! : text.length;
        const content = text.slice(start, end).trim();
        const lines = content.split('\n');
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();

        chapters.push({ title, content: body });
      }
      break;
    }
  }

  // If no chapters found, treat as single chapter
  if (chapters.length === 0) {
    chapters.push({ title: 'Full Text', content: text });
  }

  return chapters;
}
