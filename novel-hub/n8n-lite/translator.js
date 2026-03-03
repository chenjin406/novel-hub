// Simplified translator for n8n-lite
import axios from 'axios';

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_BASE = process.env.AI_API_BASE || 'https://api.opencode.ai/v1';

export async function translateToEnglish(text, options = {}) {
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
    const translatedChunks = [];

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
  } catch (error) {
    console.error('Translation error:', error.response?.data || error.message);
    return {
      translatedText: '',
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

function splitTextIntoChunks(text, maxChars) {
  const chunks = [];
  const paragraphs = text.split('\n\n');

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
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

export function needsTranslation(text) {
  return /[\u4e00-\u9fff]/.test(text);
}