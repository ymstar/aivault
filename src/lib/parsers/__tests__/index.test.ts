import { describe, it, expect } from 'vitest';
import { parseExport } from '../index';

describe('parseExport', () => {
  it('throws on unsupported platform', () => {
    expect(() => parseExport('unsupported', [])).toThrow('Unsupported platform: unsupported');
  });

  it('dispatches to chatgpt parser', () => {
    const input = [
      {
        title: 'ChatGPT Test',
        mapping: {
          msg1: {
            message: {
              author: { role: 'user' },
              content: { parts: ['Hello'] },
            },
          },
        },
      },
    ];

    const result = parseExport('chatgpt', input);
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe('CHATGPT');
  });

  it('dispatches to claude parser for JSON data', () => {
    const input = [
      {
        name: 'Claude Test',
        chat_messages: [{ sender: 'human', text: 'Hello' }],
      },
    ];

    const result = parseExport('claude', input);
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe('CLAUDE');
  });

  it('dispatches to claude-code parser for string data', () => {
    const input = `❯ Hello
⏺ Hi there!`;

    const result = parseExport('claude', input);
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe('CLAUDE');
  });

  it('dispatches to claude-code parser for explicit platform', () => {
    const input = `❯ Hello
⏺ Hi there!`;

    const result = parseExport('claude-code', input);
    expect(result).toHaveLength(1);
  });

  it('throws for claude-code with non-string data', () => {
    expect(() => parseExport('claude-code', { not: 'string' })).toThrow(
      'Claude Code format requires text data'
    );
  });
});
