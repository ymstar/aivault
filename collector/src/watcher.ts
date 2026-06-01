import * as chokidar from 'chokidar';
import * as path from 'path';
import * as os from 'os';
import { parseSessionFile, ParsedSession } from './parser';
import { SupabaseSync } from './sync';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export class SessionWatcher {
  private sync: SupabaseSync;
  private processing = new Set<string>();
  private watcher: chokidar.FSWatcher | null = null;

  constructor(sync: SupabaseSync) {
    this.sync = sync;
  }

  async start() {
    console.log(`\n👁 Watching: ${CLAUDE_PROJECTS_DIR}`);
    console.log('  Filtering: *.jsonl files (session conversations)\n');

    // First pass: process all existing sessions
    await this.scanExisting();

    // Then watch for new/modified files
    this.watcher = chokidar.watch(
      path.join(CLAUDE_PROJECTS_DIR, '**', '*.jsonl'),
      {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 3000, pollInterval: 500 },
      }
    );

    this.watcher.on('add', (filePath) => this.handleFile(filePath, 'new'));
    this.watcher.on('change', (filePath) => this.handleFile(filePath, 'updated'));

    console.log('✓ Watcher active — collecting new sessions in real-time\n');
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  private async scanExisting() {
    const fs = await import('fs');
    const files = this.findJsonlFiles(CLAUDE_PROJECTS_DIR);
    console.log(`Found ${files.length} existing session files`);
    
    let synced = 0;
    let skipped = 0;
    
    for (const file of files) {
      // Skip subagent files for now
      if (file.includes('/subagents/')) continue;
      
      const session = await parseSessionFile(file);
      if (!session) { skipped++; continue; }
      
      if (this.sync.isProcessed(session.sessionId, session.messages.length)) {
        skipped++;
        continue;
      }

      try {
        await this.sync.syncSession(session);
        synced++;
      } catch (err) {
        console.error(`✗ Failed to sync ${session.sessionId.slice(0, 8)}:`, err);
      }
    }
    
    console.log(`✓ Initial scan: ${synced} synced, ${skipped} skipped\n`);
  }

  private async handleFile(filePath: string, action: string) {
    // Skip subagent files
    if (filePath.includes('/subagents/')) return;
    
    if (this.processing.has(filePath)) return;
    this.processing.add(filePath);

    try {
      const session = await parseSessionFile(filePath);
      if (!session) return;

      await this.sync.syncSession(session);
    } catch (err) {
      console.error(`✗ Error processing ${action} file:`, err);
    } finally {
      this.processing.delete(filePath);
    }
  }

  private findJsonlFiles(dir: string): string[] {
    const fs = require('fs');
    const results: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.findJsonlFiles(fullPath));
        } else if (entry.name.endsWith('.jsonl')) {
          results.push(fullPath);
        }
      }
    } catch {}
    
    return results;
  }
}
