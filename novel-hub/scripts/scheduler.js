#!/usr/bin/env node

import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

// Configuration
const SCHEDULE = process.env.CRAWL_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
const BOOKS_TO_CRAWL = process.env.BOOKS_TO_CRAWL || '12345,67890'; // Comma-separated Gutenberg IDs
const TRANSLATE_ENABLED = process.env.TRANSLATE_ENABLED === 'true';
const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

console.log(chalk.blue('🕷️ NovelHub Auto-Crawler Scheduler'));
console.log(chalk.gray(`Schedule: ${SCHEDULE}`));
console.log(chalk.gray(`Books: ${BOOKS_TO_CRAWL}`));
console.log(chalk.gray(`Translation: ${TRANSLATE_ENABLED ? 'Enabled' : 'Disabled'}`));
console.log('');

// Parse book IDs
const bookIds = BOOKS_TO_CRAWL.split(',').map(id => id.trim()).filter(Boolean);

if (bookIds.length === 0) {
  console.log(chalk.yellow('⚠️  No books configured. Set BOOKS_TO_CRAWL environment variable.'));
  process.exit(1);
}

// Schedule the cron job
console.log(chalk.green('📅 Starting cron scheduler...'));

const job = cron.schedule(SCHEDULE, async () => {
  console.log(chalk.blue('\n🚀 Starting scheduled crawl...'));
  console.log(chalk.gray(`Time: ${new Date().toLocaleString()}`));
  
  for (const gutenbergId of bookIds) {
    console.log(chalk.cyan(`\n📖 Processing book ${gutenbergId}...`));
    
    try {
      const command = [
        'node scripts/crawler.js import',
        gutenbergId,
        TRANSLATE_ENABLED ? '--translate' : '',
        `--model ${AI_MODEL}`,
      ].filter(Boolean).join(' ');
      
      console.log(chalk.gray(`Running: ${command}`));
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        env: process.env,
      });
      
      if (stdout) {
        console.log(chalk.green('✅ Success:'));
        console.log(stdout);
      }
      
      if (stderr) {
        console.log(chalk.yellow('⚠️  Warnings:'));
        console.log(stderr);
      }
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to process book ${gutenbergId}:`));
      console.error(error.message);
      
      if (error.stdout) console.error('Output:', error.stdout);
      if (error.stderr) console.error('Error:', error.stderr);
    }
    
    // Small delay between books
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log(chalk.green('\n✅ Scheduled crawl completed!'));
}, {
  scheduled: true,
  timezone: 'Asia/Shanghai'
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Shutting down scheduler...'));
  job.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Shutting down scheduler...'));
  job.stop();
  process.exit(0);
});

// Manual trigger option
if (process.argv.includes('--run-now')) {
  console.log(chalk.blue('🚀 Running crawl immediately...'));
  job.fireOnTick();
  setTimeout(() => {
    console.log(chalk.green('✅ Manual crawl completed!'));
    process.exit(0);
  }, 30000); // Wait max 30 seconds
} else {
  console.log(chalk.green('✅ Scheduler started. Press Ctrl+C to stop.'));
  console.log(chalk.gray('Next run: ' + cron.schedule(SCHEDULE, () => {}).nextDates(1)[0].toLocaleString()));
}
