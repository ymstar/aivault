import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseSessionFile } from '../parser';

function writeTempJsonl(lines: object[]): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-test-'));
  // Create nested structure: tmpDir/projects/project-name/session-id.jsonl
  const projectsDir = path.join(tmpDir, 'projects', 'test-project');
  fs.mkdirSync(projectsDir, { recursive: true });
  const filePath = path.join(projectsDir, 'test-session.jsonl');
  const content = lines.map((l) => JSON.stringify(l)).join('\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

const tempFiles: string[] = [];

afterEach(() => {
  for (const f of tempFiles) {
    try {
      fs.rmSync(path.dirname(path.dirname(path.dirname(f))), { recursive: true, force: true });
    } catch {}
  }
  tempFiles.length = 0;
});

describe('parseSessionFile', () => {
  it('returns null for empty file', async () => {
    const filePath = writeTempJsonl([]);
    tempFiles.push(filePath);
    const result = await parseSessionFile(filePath);
    expect(result).toBeNull();
  });

  it('parses queue-operation entries as user messages', async () => {
    const filePath = writeTempJsonl([
      { type: 'queue-operation', content: 'Hello Claude', timestamp: '2024-01-15T10:00:00Z' },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Hi!' }] }, timestamp: '2024-01-15T10:00:01Z' },
    ]);
    tempFiles.push(filePath);

    const result = await parseSessionFile(filePath);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(2);
    expect(result!.messages[0]).toEqual({ role: 'user', content: 'Hello Claude', timestamp: '2024-01-15T10:00:00Z' });
    expect(result!.messages[1].role).toBe('assistant');
    expect(result!.messages[1].content).toBe('Hi!');
  });

  it('parses user entries with content blocks', async () => {
    const filePath = writeTempJsonl([
      {
        type: 'user',
        message: { content: [{ type: 'text', text: 'User message' }] },
        timestamp: '2024-01-15T10:00:00Z',
      },
    ]);
    tempFiles.push(filePath);

    const result = await parseSessionFile(filePath);
    expect(result!.messages).toHaveLength(1);
    expect(result!.messages[0].role).toBe('user');
    expect(result!.messages[0].content).toBe('User message');
  });

  it('uses ai-title when available', async () => {
    const filePath = writeTempJsonl([
      { type: 'ai-title', title: 'My Custom Title' },
      { type: 'queue-operation', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
    ]);
    tempFiles.push(filePath);

    const result = await parseSessionFile(filePath);
    expect(result!.title).toBe('My Custom Title');
  });

  it('generates title from first user message when no ai-title', async () => {
    const filePath = writeTempJsonl([
      { type: 'queue-operation', content: 'This is a long user message that should be truncated for the title', timestamp: '2024-01-15T10:00:00Z' },
    ]);
    tempFiles.push(filePath);

    const result = await parseSessionFile(filePath);
    expect(result!.title).toBe('This is a long user message that should be truncated for the title');
  });

  it('deduplicates consecutive identical messages', async () => {
    const filePath = writeTempJsonl([
      { type: 'queue-operation', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
      { type: 'queue-operation', content: 'Hello', timestamp: '2024-01-15T10:00:01Z' },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Hi!' }] }, timestamp: '2024-01-15T10:00:02Z' },
    ]);
    tempFiles.push(filePath);

    const result = await parseSessionFile(filePath);
    expect(result!.messages).toHaveLength(2);
  });

  it('extracts model from assistant messages', async () => {
    const filePath = writeTempJsonl([
      { type: 'queue-operation', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Hi!' }], model: 'claude-3-opus' }, timestamp: '2024-01-15T10:00:01Z' },
    ]);
    tempFiles.push(filePath);

    const result = await parseSessionFile(filePath);
    expect(result!.model).toBe('claude-3-opus');
  });

  it('skips malformed JSON lines', async () => {
    const filePath = writeTempJsonl([]);
    tempFiles.push(filePath);
    // Write a malformed line
    fs.writeFileSync(filePath, 'not valid json\n{"type":"queue-operation","content":"Hello","timestamp":"2024-01-15T10:00:00Z"}\n', 'utf-8');

    const result = await parseSessionFile(filePath);
    expect(result!.messages).toHaveLength(1);
    expect(result!.messages[0].content).toBe('Hello');
  });

  it('handles string content in assistant messages', async () => {
    const filePath = writeTempJsonl([
      { type: 'queue-operation', content: 'Hello', timestamp: '2024-01-15T10:00:00Z' },
      { type: 'assistant', message: { content: 'Simple string response' }, timestamp: '2024-01-15T10:00:01Z' },
    ]);
    tempFiles.push(filePath);

    const result = await parseSessionFile(filePath);
    expect(result!.messages[1].content).toBe('Simple string response');
  });
});
