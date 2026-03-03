#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🧪 NovelHub Quick Test');
console.log('');

async function runTest(name, command) {
  console.log(`\n📋 ${name}:`);
  console.log(`$ ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) {
      console.log('✅ Output:');
      console.log(stdout);
    }
    
    if (stderr) {
      console.log('⚠️  Stderr:');
      console.log(stderr);
    }
    
  } catch (error) {
    console.error('❌ Failed:');
    console.error(error.message);
    if (error.stdout) console.error('Output:', error.stdout);
    if (error.stderr) console.error('Error:', error.stderr);
  }
}

async function main() {
  const tests = [
    ['Environment Check', 'node -p "process.version"'],
    ['Package Test', 'npm list --depth=0'],
    ['Typescript Check', 'npx tsc --noEmit'],
    ['Test Runner', 'npm test'],
    ['Build Test', 'npm run build'],
  ];

  for (const [name, command] of tests) {
    await runTest(name, command);
  }

  console.log('\n✅ Quick test completed!');
  console.log('\nNext steps:');
  console.log('1. Set environment variables in .env.local');
  console.log('2. Run: npm run dev');
  console.log('3. Open: http://localhost:3000');
}

main().catch(console.error);
