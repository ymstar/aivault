import { describe, it, expect } from 'vitest';
import { parseChatGPTExport } from '../chatgpt';

describe('parseChatGPTExport', () => {
  it('returns empty array for non-array input', () => {
    expect(parseChatGPTExport(null as any)).toEqual([]);
    expect(parseChatGPTExport(undefined as any)).toEqual([]);
    expect(parseChatGPTExport('string' as any)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(parseChatGPTExport([])).toEqual([]);
  });

  it('parses a valid conversation with messages', () => {
    const input = [
      {
        title: 'Test Chat',
        create_time: 1700000000,
        mapping: {
          msg1: {
            message: {
              author: { role: 'user' },
              content: { parts: ['Hello'] },
              create_time: 1700000000,
            },
          },
          msg2: {
            message: {
              author: { role: 'assistant' },
              content: { parts: ['Hi there!'] },
              create_time: 1700000001,
            },
          },
        },
      },
    ];

    const result = parseChatGPTExport(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Chat');
    expect(result[0].platform).toBe('CHATGPT');
    expect(result[0].messages).toHaveLength(2);
    expect(result[0].messages[0].role).toBe('user');
    expect(result[0].messages[0].content).toBe('Hello');
    expect(result[0].messages[1].role).toBe('assistant');
    expect(result[0].messages[1].content).toBe('Hi there!');
  });

  it('filters out messages with invalid roles', () => {
    const input = [
      {
        title: 'Test',
        mapping: {
          msg1: {
            message: {
              author: { role: 'user' },
              content: { parts: ['Hello'] },
            },
          },
          msg2: {
            message: {
              author: { role: 'tool' },
              content: { parts: ['Tool output'] },
            },
          },
        },
      },
    ];

    const result = parseChatGPTExport(input);
    expect(result[0].messages).toHaveLength(1);
    expect(result[0].messages[0].role).toBe('user');
  });

  it('filters out messages with empty content', () => {
    const input = [
      {
        title: 'Test',
        mapping: {
          msg1: {
            message: {
              author: { role: 'user' },
              content: { parts: [] },
            },
          },
          msg2: {
            message: {
              author: { role: 'user' },
              content: { parts: [''] },
            },
          },
          msg3: {
            message: {
              author: { role: 'assistant' },
              content: { parts: ['Valid'] },
            },
          },
        },
      },
    ];

    const result = parseChatGPTExport(input);
    expect(result[0].messages).toHaveLength(1);
    expect(result[0].messages[0].content).toBe('Valid');
  });

  it('uses default title when missing', () => {
    const input = [
      {
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

    const result = parseChatGPTExport(input);
    expect(result[0].title).toBe('Untitled Conversation');
  });

  it('converts unix timestamps to ISO strings', () => {
    const input = [
      {
        create_time: 1700000000,
        mapping: {
          msg1: {
            message: {
              author: { role: 'user' },
              content: { parts: ['Hello'] },
              create_time: 1700000000,
            },
          },
        },
      },
    ];

    const result = parseChatGPTExport(input);
    expect(result[0].createdAt).toBe(new Date(1700000000 * 1000).toISOString());
    expect(result[0].messages[0].createdAt).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('joins multiple content parts with newline', () => {
    const input = [
      {
        mapping: {
          msg1: {
            message: {
              author: { role: 'user' },
              content: { parts: ['Part 1', 'Part 2', 'Part 3'] },
            },
          },
        },
      },
    ];

    const result = parseChatGPTExport(input);
    expect(result[0].messages[0].content).toBe('Part 1\nPart 2\nPart 3');
  });
});
