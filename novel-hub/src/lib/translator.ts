import axios from 'axios';

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_BASE = process.env.AI_API_BASE || 'https://api.opencode.ai/v1';

interface TranslationResult {
  translatedText: string;
  error?: string;
}

// Translate Chinese text to English using AI
export async function translateToEnglish(
  text: string,
  options: {
    model?: string;
    chunkSize?: number;
  } = {}
): Promise<TranslationResult> {
  const { model = 'gpt-3.5-turbo', chunkSize = 2000 } = options;

  if (!AI_API_KEY) {
    return {
      translatedText: '',
      error: 'AI_API_KEY not configured',
    };
  }

  try {
    // Split large text into chunks
    const chunks = splitTextIntoChunks(text, chunkSize);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      const response = await axios.post(
        `${AI_API_BASE}/chat/completions`,
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate the following Chinese text to English. Preserve the formatting, style, and tone of the original text. Only output the translated text, no explanations.',
            },
            {
              role: 'user',
              content: chunk,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        },
        {
          headers: {
            'Authorization': `Bearer ${AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const translated = response.data.choices[0]?.message?.content || '';
      translatedChunks.push(translated);
    }

    return { translatedText: translatedChunks.join('\n\n') };
  } catch (error: any) {
    console.error('Translation error:', error.response?.data || error.message);
    return {
      translatedText: '',
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

// Batch translate multiple texts
export async function batchTranslate(
  texts: string[],
  options?: {
    model?: string;
    chunkSize?: number;
    concurrency?: number;
  }
): Promise<TranslationResult[]> {
  const { concurrency = 3 } = options || {};
  const results: TranslationResult[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((text) => translateToEnglish(text, options))
    );
    results.push(...batchResults);
  }

  return results;
}

// Split text into chunks for translation
function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // If single paragraph is too long, split by sentences
      if (paragraph.length > maxChars) {
        const sentences = paragraph.match(/[^。！？.!?]+[。！？.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > maxChars) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

// Check if text needs translation (contains Chinese characters)
export function needsTranslation(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}
