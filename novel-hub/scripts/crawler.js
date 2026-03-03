#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '@supabase/supabase-js';
import {
  searchChineseBooks,
  getBookDetails,
  downloadBookContent,
  downloadTextContent,
  parseTextToChapters,
} from '../src/lib/gutenberg.js';
import { translateToEnglish, needsTranslation } from '../src/lib/translator.js';

const program = new Command();

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_BASE = process.env.AI_API_BASE || 'https://api.opencode.ai/v1';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

program
  .name('novel-crawler')
  .description('CLI tool for crawling and translating Chinese novels from Project Gutenberg')
  .version('1.0.0');

program
  .command('search')
  .description('Search for Chinese books on Project Gutenberg')
  .argument('[query]', 'Search query', '')
  .option('-l, --limit <number>', 'Limit results', '10')
  .action(async (query, options) => {
    const spinner = ora('Searching Gutenberg...').start();
    
    try {
      const books = await searchChineseBooks(query);
      spinner.stop();
      
      if (books.length === 0) {
        console.log(chalk.yellow('No books found.'));
        return;
      }
      
      console.log(chalk.green(`Found ${books.length} books:`));
      books.slice(0, parseInt(options.limit)).forEach((book, index) => {
        console.log(`\n${chalk.cyan(`${index + 1}.`)} ${book.title}`);
        console.log(`   ${chalk.gray('Author:')} ${book.authors[0]?.name || 'Unknown'}`);
        console.log(`   ${chalk.gray('ID:')} ${book.id}`);
      });
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Search failed:'), error.message);
    }
  });

program
  .command('import')
  .description('Import a book from Gutenberg')
  .argument('<gutenbergId>', 'Gutenberg book ID')
  .option('-t, --translate', 'Translate to English')
  .option('-m, --model <model>', 'AI model for translation', 'gpt-3.5-turbo')
  .option('-c, --chapters <number>', 'Limit chapters (for testing)', '0')
  .action(async (gutenbergId, options) => {
    const spinner = ora('Fetching book details...').start();
    
    try {
      // Get book details
      const details = await getBookDetails(parseInt(gutenbergId));
      if (!details) {
        spinner.stop();
        console.error(chalk.red('Book not found'));
        return;
      }
      
      spinner.text = 'Creating book record...';
      
      // Create book in database
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          title: details.title,
          author: details.author || 'Unknown',
          language: 'zh',
          source: 'gutenberg',
          source_url: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
          description: details.description,
        })
        .select()
        .single();

      if (bookError) {
        throw new Error(`Database error: ${bookError.message}`);
      }
      
      spinner.text = 'Downloading content...';
      
      // Download content
      let chapters = [];
      if (details.formats.html) {
        const result = await downloadBookContent(`https://www.gutenberg.org${details.formats.html}`);
        if (result) chapters = result.chapters;
      } else if (details.formats.txt) {
        const text = await downloadTextContent(`https://www.gutenberg.org${details.formats.txt}`);
        if (text) chapters = parseTextToChapters(text);
      }
      
      if (chapters.length === 0) {
        throw new Error('No content found');
      }
      
      // Limit chapters if specified
      const chapterLimit = parseInt(options.chapters);
      if (chapterLimit > 0) {
        chapters = chapters.slice(0, chapterLimit);
      }
      
      spinner.text = `Processing ${chapters.length} chapters...`;
      
      // Process chapters
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        let contentEn = null;
        
        // Translate if requested
        if (options.translate && needsTranslation(chapter.content)) {
          if (!AI_API_KEY) {
            console.log(chalk.yellow('\nWarning: AI_API_KEY not set, skipping translation'));
          } else {
            const translateSpinner = ora(`Translating chapter ${i + 1}/${chapters.length}...`).start();
            const result = await translateToEnglish(chapter.content, { model: options.model });
            translateSpinner.stop();
            
            if (!result.error) {
              contentEn = result.translatedText;
            } else {
              console.log(chalk.yellow(`\nTranslation failed for chapter ${i + 1}: ${result.error}`));
            }
          }
        }
        
        // Save chapter to database
        const { error: chapterError } = await supabase
          .from('chapters')
          .insert({
            book_id: book.id,
            chapter_number: i + 1,
            title: chapter.title,
            content: chapter.content,
            content_en: contentEn,
            source_url: '',
          });

        if (chapterError) {
          console.error(chalk.red(`Failed to save chapter ${i + 1}:`), chapterError.message);
        }
        
        // Update progress
        spinner.text = `Processing chapter ${i + 1}/${chapters.length}...`;
      }
      
      // Update book with total chapters
      await supabase
        .from('books')
        .update({ total_chapters: chapters.length })
        .eq('id', book.id);
      
      spinner.stop();
      console.log(chalk.green('\n✅ Import completed!'));
      console.log(chalk.cyan(`Book: ${details.title}`));
      console.log(chalk.cyan(`Author: ${details.author || 'Unknown'}`));
      console.log(chalk.cyan(`Chapters: ${chapters.length}`));
      console.log(chalk.cyan(`Translation: ${options.translate ? 'Yes' : 'No'}`));
      
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Import failed:'), error.message);
    }
  });

program
  .command('list')
  .description('List imported books')
  .option('-l, --limit <number>', 'Limit results', '20')
  .action(async (options) => {
    try {
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(options.limit));

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (books.length === 0) {
        console.log(chalk.yellow('No books imported yet.'));
        return;
      }

      console.log(chalk.green(`Found ${books.length} books:`));
      books.forEach((book, index) => {
        console.log(`\n${chalk.cyan(`${index + 1}.`)} ${book.title}`);
        console.log(`   ${chalk.gray('Author:')} ${book.author}`);
        console.log(`   ${chalk.gray('Chapters:')} ${book.total_chapters}`);
        console.log(`   ${chalk.gray('Language:')} ${book.language.toUpperCase()}`);
        console.log(`   ${chalk.gray('Source:')} ${book.source}`);
        console.log(`   ${chalk.gray('ID:')} ${book.id}`);
      });
    } catch (error) {
      console.error(chalk.red('Failed to list books:'), error.message);
    }
  });

program
  .command('translate')
  .description('Translate specific chapters')
  .argument('<bookId>', 'Book ID from database')
  .option('-c, --chapter <number>', 'Specific chapter number', '0')
  .option('-m, --model <model>', 'AI model', 'gpt-3.5-turbo')
  .action(async (bookId, options) => {
    if (!AI_API_KEY) {
      console.error(chalk.red('AI_API_KEY not configured'));
      return;
    }

    const spinner = ora('Fetching chapters...').start();
    
    try {
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        spinner.stop();
        console.error(chalk.red('Book not found'));
        return;
      }

      let query = supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .is('content_en', null); // Only untranslated chapters

      if (options.chapter !== '0') {
        query = query.eq('chapter_number', parseInt(options.chapter));
      }

      const { data: chapters, error: chaptersError } = await query.order('chapter_number');

      if (chaptersError) {
        throw chaptersError;
      }

      if (chapters.length === 0) {
        spinner.stop();
        console.log(chalk.yellow('No untranslated chapters found.'));
        return;
      }

      spinner.stop();
      console.log(chalk.green(`Found ${chapters.length} chapters to translate.`));

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const translateSpinner = ora(`Translating chapter ${chapter.chapter_number}/${book.total_chapters}...`).start();
        
        const result = await translateToEnglish(chapter.content, { model: options.model });
        
        if (!result.error) {
          // Update chapter with translation
          const { error: updateError } = await supabase
            .from('chapters')
            .update({ content_en: result.translatedText })
            .eq('id', chapter.id);

          if (updateError) {
            translateSpinner.fail(`Failed to save translation for chapter ${chapter.chapter_number}`);
          } else {
            translateSpinner.succeed(`Chapter ${chapter.chapter_number} translated`);
          }
        } else {
          translateSpinner.fail(`Translation failed for chapter ${chapter.chapter_number}: ${result.error}`);
        }
      }

      console.log(chalk.green('\n✅ Translation completed!'));
      
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Translation failed:'), error.message);
    }
  });

// Error handling
program.configureHelp({
  sortSubcommands: true,
  showGlobalOptions: true,
});

program.parse();
