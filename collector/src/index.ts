import * as dotenv from 'dotenv';
import * as path from 'path';
import { AIVaultSync } from './sync';
import { SessionWatcher } from './watcher';

// Load env from local .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_URL = process.env.AIVAULT_API_URL || 'https://aivault-one.vercel.app';
const ENV_KEY_API = 'AIVAULT_API_KEY';
const API_KEY = process.env[ENV_KEY_API] || '';

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║    AIVault — Claude Code Collector     ║');
  console.log('╚═══════════════════════════════════════╝\n');

  if (!API_KEY) {
    console.error('✗ Missing AIVAULT_API_KEY');
    console.error('');
    console.error('Setup:');
    console.error('  1. Go to AIVault Dashboard → Settings → API Keys');
    console.error('  2. Generate a new key');
    console.error('  3. Create collector/.env with:');
    console.error('     AIVAULT_API_KEY=av_xxx...');
    console.error('');
    process.exit(1);
  }

  console.log('API: ' + API_URL);
  console.log('Key: ' + API_KEY.slice(0, 10) + '...');

  const sync = new AIVaultSync(API_URL, API_KEY);

  // Test connection
  console.log('\n⏳ Connecting to AIVault...');
  const ok = await sync.ping();
  if (!ok) {
    console.error('✗ Cannot reach AIVault API. Check AIVAULT_API_URL and network.');
    process.exit(1);
  }
  console.log('✓ Connected to AIVault\n');

  const watcher = new SessionWatcher(sync);
  await watcher.start();

  console.log('Press Ctrl+C to stop.\n');

  process.on('SIGINT', async () => {
    console.log('\n⚡ Shutting down...');
    await watcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await watcher.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
