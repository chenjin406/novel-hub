import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const port = process.env.N8N_PORT || 5678;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'your-service-key'
);

// Workflow storage (in-memory for now)
const workflows = new Map();
const executions = new Map();

// Translation functions
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'n8n-lite', version: '1.0.0' });
});

// Create workflow
app.post('/api/workflows', async (req, res) => {
  try {
    const { name, description, nodes, connections } = req.body;
    const id = Date.now().toString();
    
    const workflow = {
      id,
      name,
      description,
      nodes,
      connections,
      active: false,
      createdAt: new Date().toISOString(),
    };
    
    workflows.set(id, workflow);
    res.json({ workflow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List workflows
app.get('/api/workflows', (req, res) => {
  const workflowList = Array.from(workflows.values());
  res.json({ workflows: workflowList });
});

// Execute workflow
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const inputData = req.body;
    
    const workflow = workflows.get(id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const executionId = Date.now().toString();
    const execution = {
      id: executionId,
      workflowId: id,
      status: 'running',
      data: inputData,
      result: null,
      createdAt: new Date().toISOString(),
    };
    
    executions.set(executionId, execution);
    
    // Execute workflow asynchronously
    executeWorkflow(workflow, inputData, executionId);
    
    res.json({ executionId, status: 'started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get execution status
app.get('/api/executions/:id', (req, res) => {
  const { id } = req.params;
  const execution = executions.get(id);
  
  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }
  
  res.json({ execution });
});

// Pre-built workflow: Crawl and Translate
app.post('/api/workflows/crawl-translate', async (req, res) => {
  try {
    const { gutenbergId, translate = false, aiModel = 'gpt-3.5-turbo' } = req.body;
    
    // Create a pre-built workflow
    const workflow = {
      id: 'crawl-translate-' + Date.now(),
      name: 'Crawl and Translate Book',
      description: 'Crawls a book from Gutenberg and optionally translates it',
      nodes: [
        {
          id: 'start',
          name: 'Start',
          type: 'start',
          parameters: { gutenbergId, translate, aiModel }
        },
        {
          id: 'fetch-details',
          name: 'Fetch Book Details',
          type: 'http-request',
          parameters: {
            url: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
            method: 'GET',
            headers: { 'User-Agent': 'NovelHub-Crawler/1.0' }
          }
        },
        {
          id: 'fetch-text',
          name: 'Fetch Book Text',
          type: 'http-request',
          parameters: {
            url: `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`,
            method: 'GET'
          }
        },
        {
          id: 'parse-chapters',
          name: 'Parse Chapters',
          type: 'code',
          parameters: {
            code: `
              const text = $json.response;
              const chapters = [];
              const lines = text.split('\\n');
              let currentChapter = null;
              let currentContent = [];
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.match(/^第[一二三四五六七八九十百千万零\\d]+[章节回]/) || 
                    trimmed.match(/^Chapter\\s+\\d+/i) ||
                    trimmed.match(/^CHAPTER\\s+\\d+/)) {
                  
                  if (currentChapter) {
                    chapters.push({
                      title: currentChapter,
                      content: currentContent.join('\\n').trim()
                    });
                  }
                  
                  currentChapter = trimmed;
                  currentContent = [];
                } else if (currentChapter && trimmed.length > 0) {
                  currentContent.push(trimmed);
                }
              }
              
              if (currentChapter) {
                    chapters.push({
                  title: currentChapter,
                  content: currentContent.join('\\n').trim()
                });
              }
              
              return { chapters: chapters.slice(0, 10) };
            `
          }
        },
        {
          id: 'translate',
          name: 'Translate Chapters',
          type: 'conditional',
          parameters: {
            condition: '{{ $json.translate }}',
            trueAction: 'translate',
            falseAction: 'skip'
          }
        },
        {
          id: 'save-to-db',
          name: 'Save to Database',
          type: 'database',
          parameters: {
            table: 'chapters',
            operation: 'insert'
          }
        }
      ],
      connections: [
        { from: 'start', to: 'fetch-details' },
        { from: 'fetch-details', to: 'fetch-text' },
        { from: 'fetch-text', to: 'parse-chapters' },
        { from: 'parse-chapters', to: 'translate' },
        { from: 'translate', to: 'save-to-db' }
      ]
    };
    
    workflows.set(workflow.id, workflow);
    
    // Execute the workflow
    const executionId = Date.now().toString();
    executeWorkflow(workflow, { gutenbergId, translate, aiModel }, executionId);
    
    res.json({ 
      workflowId: workflow.id, 
      executionId,
      message: 'Crawl and translate workflow started' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for n8n compatibility
app.post('/webhook/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const data = req.body;
    
    // Execute workflow and return result
    const result = await executeWorkflowSync(workflows.get(workflowId), data);
    
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow execution engine
async function executeWorkflow(workflow, inputData, executionId) {
  try {
    const execution = executions.get(executionId);
    if (!execution) return;
    
    let currentData = inputData;
    
    for (const node of workflow.nodes) {
      execution.status = `executing-${node.id}`;
      
      switch (node.type) {
        case 'http-request':
          currentData = await executeHttpRequest(node.parameters, currentData);
          break;
          
        case 'code':
          currentData = await executeCode(node.parameters.code, currentData);
          break;
          
        case 'conditional':
          currentData = await executeConditional(node.parameters, currentData);
          break;
          
        case 'database':
          currentData = await executeDatabase(node.parameters, currentData);
          break;
          
        default:
          console.log(`Unknown node type: ${node.type}`);
      }
    }
    
    execution.status = 'completed';
    execution.result = currentData;
    
  } catch (error) {
    const execution = executions.get(executionId);
    if (execution) {
      execution.status = 'failed';
      execution.error = error.message;
    }
  }
}

// Synchronous workflow execution
async function executeWorkflowSync(workflow, inputData) {
  let currentData = inputData;
  
  for (const node of workflow.nodes) {
    switch (node.type) {
      case 'http-request':
        currentData = await executeHttpRequest(node.parameters, currentData);
        break;
        
      case 'code':
        currentData = await executeCode(node.parameters.code, currentData);
        break;
        
      case 'conditional':
        currentData = await executeConditional(node.parameters, currentData);
        break;
        
      case 'database':
        currentData = await executeDatabase(node.parameters, currentData);
        break;
    }
  }
  
  return currentData;
}

// Execute HTTP request
async function executeHttpRequest(params, data) {
  const response = await axios({
    url: params.url,
    method: params.method || 'GET',
    headers: params.headers || {},
    timeout: params.timeout || 30000,
  });
  
  return { ...data, response: response.data };
}

// Execute code
async function executeCode(code, data) {
  // Simple code execution (in production, use proper sandboxing)
  const func = new Function('$json', code);
  return func(data);
}

// Execute conditional
async function executeConditional(params, data) {
  // Simple condition evaluation
  const condition = eval(params.condition.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    return JSON.stringify(eval(expr.trim()));
  }));
  
  return { ...data, conditionResult: condition, action: condition ? params.trueAction : params.falseAction };
}

// Execute database operation
async function executeDatabase(params, data) {
  if (params.operation === 'insert' && params.table === 'chapters') {
    const chapters = data.chapters || [];
    
    for (const chapter of chapters) {
      await supabase.from('chapters').insert({
        book_id: data.bookId,
        chapter_number: data.chapters.indexOf(chapter) + 1,
        title: chapter.title,
        content: chapter.content,
        content_en: chapter.content_en || null,
        source_url: '',
      });
    }
  }
  
  return data;
}

// Start server
app.listen(port, () => {
  console.log(`🕷️  n8n-lite server running on http://localhost:${port}`);
  console.log(`📚 NovelHub integration ready`);
  console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhook/:workflowId`);
});