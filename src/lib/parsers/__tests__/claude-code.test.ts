import { describe, it, expect } from 'vitest';
import { parseClaudeCodeExport } from '../claude-code';

describe('parseClaudeCodeExport', () => {
  describe('terminal format', () => {
    it('parses basic terminal format with ❯ and ⏺ markers', () => {
      const text = `▐▛███▜▌   Claude Code v2.1.145
❯ What is TypeScript?
⏺ TypeScript is a typed superset of JavaScript.`;

      const result = parseClaudeCodeExport(text);
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('CLAUDE');
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].role).toBe('user');
      expect(result[0].messages[0].content).toBe('What is TypeScript?');
      expect(result[0].messages[1].role).toBe('assistant');
      expect(result[0].messages[1].content).toBe('TypeScript is a typed superset of JavaScript.');
    });

    it('extracts title from Claude Code header', () => {
      const text = `▐▛███▜▌   Claude Code v2.1.145
❯ Hello`;

      const result = parseClaudeCodeExport(text);
      expect(result[0].title).toContain('Claude Code');
    });

    it('handles multi-line messages', () => {
      const text = `❯ Tell me about this topic
  with more details
⏺ Here is my
  multi-line response
  with details.`;

      const result = parseClaudeCodeExport(text);
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].content).toContain('Tell me about');
      expect(result[0].messages[1].content).toContain('Here is my');
    });

    it('handles tool call indicators', () => {
      const text = `❯ Run the test
⏺ Running tests...
⎿ Reading file.ts
⎿ Tests passed`;

      const result = parseClaudeCodeExport(text);
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[1].content).toContain('Running tests');
      expect(result[0].messages[1].content).toContain('⎿');
    });

    it('skips session markers', () => {
      const text = `✻ Session started
❯ Hello
⏺ Hi
✻ Session ended`;

      const result = parseClaudeCodeExport(text);
      expect(result[0].messages).toHaveLength(2);
    });
  });

  describe('markdown format', () => {
    it('parses ## Human / ## Assistant headers', () => {
      const text = `## Human
What is React?

## Assistant
React is a JavaScript library for building user interfaces.`;

      const result = parseClaudeCodeExport(text);
      expect(result).toHaveLength(1);
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].role).toBe('user');
      expect(result[0].messages[0].content).toBe('What is React?');
      expect(result[0].messages[1].role).toBe('assistant');
    });

    it('extracts title from # heading', () => {
      const text = `# My Conversation Title
## Human
Hello`;

      const result = parseClaudeCodeExport(text);
      expect(result[0].title).toBe('My Conversation Title');
    });

    it('handles Chinese role headers', () => {
      const text = `## 用户
你好

## 助手
你好！`;

      const result = parseClaudeCodeExport(text);
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].role).toBe('user');
      expect(result[0].messages[1].role).toBe('assistant');
    });
  });

  it('returns empty array for empty text', () => {
    expect(parseClaudeCodeExport('')).toEqual([]);
  });

  it('returns empty array when no messages found', () => {
    expect(parseClaudeCodeExport('Just some random text')).toEqual([]);
  });
});
