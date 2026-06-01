import { describe, it, expect } from 'vitest';
import { parseClaudeExport } from '../claude';

describe('parseClaudeExport', () => {
  it('returns empty array for non-object input', () => {
    expect(parseClaudeExport(null)).toEqual([]);
    expect(parseClaudeExport(undefined)).toEqual([]);
    expect(parseClaudeExport(42)).toEqual([]);
    expect(parseClaudeExport('string')).toEqual([]);
  });

  it('parses array format with chat_messages', () => {
    const input = [
      {
        name: 'Test Conversation',
        created_at: '2024-01-15T10:00:00Z',
        chat_messages: [
          { sender: 'human', text: 'Hello' },
          { sender: 'assistant', text: 'Hi there!' },
        ],
      },
    ];

    const result = parseClaudeExport(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Conversation');
    expect(result[0].platform).toBe('CLAUDE');
    expect(result[0].messages).toHaveLength(2);
    expect(result[0].messages[0].role).toBe('user');
    expect(result[0].messages[0].content).toBe('Hello');
    expect(result[0].messages[1].role).toBe('assistant');
    expect(result[0].messages[1].content).toBe('Hi there!');
  });

  it('parses object with conversations key', () => {
    const input = {
      conversations: [
        {
          name: 'From conversations key',
          chat_messages: [{ sender: 'user', text: 'Test' }],
        },
      ],
    };

    const result = parseClaudeExport(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('From conversations key');
  });

  it('maps sender roles correctly', () => {
    const input = [
      {
        chat_messages: [
          { sender: 'human', text: 'Human msg' },
          { sender: 'user', text: 'User msg' },
          { sender: 'assistant', text: 'Assistant msg' },
          { sender: 'claude', text: 'Claude msg' },
        ],
      },
    ];

    const result = parseClaudeExport(input);
    expect(result[0].messages[0].role).toBe('user');
    expect(result[0].messages[1].role).toBe('user');
    expect(result[0].messages[2].role).toBe('assistant');
    expect(result[0].messages[3].role).toBe('assistant');
  });

  it('supports content field as alternative to text', () => {
    const input = [
      {
        chat_messages: [
          { sender: 'human', content: 'Using content field' },
        ],
      },
    ];

    const result = parseClaudeExport(input);
    expect(result[0].messages[0].content).toBe('Using content field');
  });

  it('filters out empty messages', () => {
    const input = [
      {
        chat_messages: [
          { sender: 'human', text: '' },
          { sender: 'human', text: '   ' },
          { sender: 'assistant', text: 'Valid' },
        ],
      },
    ];

    const result = parseClaudeExport(input);
    expect(result[0].messages).toHaveLength(1);
    expect(result[0].messages[0].content).toBe('Valid');
  });

  it('filters out conversations with no messages', () => {
    const input = [
      { chat_messages: [] },
      { chat_messages: [{ sender: 'human', text: 'Valid' }] },
    ];

    const result = parseClaudeExport(input);
    expect(result).toHaveLength(1);
  });

  it('uses title as fallback for name', () => {
    const input = [
      {
        title: 'Title Fallback',
        chat_messages: [{ sender: 'human', text: 'Test' }],
      },
    ];

    const result = parseClaudeExport(input);
    expect(result[0].title).toBe('Title Fallback');
  });
});
