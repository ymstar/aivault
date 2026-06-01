import * as dotenv from 'dotenv';
import * as path from 'path';
import { SupabaseSync } from './sync';
import { SessionWatcher } from './watcher';

// Load env from aivault project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = process.env.COLLECTOR_USER_EMAIL || 'yangming@pingbase.cn';

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║    AIVault — Claude Code Collector     ║');
  console.log('╚═══════════════════════════════════════╝\n');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('✗ Missing environment variables:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
    console.error('  SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nSet them in /home/ubuntu/aivault/.env.local');
    process.exit(1);
  }

  const sync = new SupabaseSync(SUPABASE_URL, SERVICE_KEY);
  await sync.init(USER_EMAIL);

  const watcher = new SessionWatcher(sync);
  await watcher.start();

  // Keep alive
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
