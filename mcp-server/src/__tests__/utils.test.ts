import { describe, it, expect } from 'vitest';
import { escapeIlike, errorMsg } from '../utils.js';

describe('escapeIlike', () => {
  it('escapes percent signs', () => {
    expect(escapeIlike('100%')).toBe('100\\%');
  });

  it('escapes underscores', () => {
    expect(escapeIlike('some_thing')).toBe('some\\_thing');
  });

  it('escapes backslashes', () => {
    expect(escapeIlike('path\\to')).toBe('path\\\\to');
  });

  it('escapes multiple special characters', () => {
    expect(escapeIlike('100%_done')).toBe('100\\%\\_done');
  });

  it('returns plain text unchanged', () => {
    expect(escapeIlike('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeIlike('')).toBe('');
  });
});

describe('errorMsg', () => {
  it('extracts message from Error instances', () => {
    expect(errorMsg(new Error('test error'))).toBe('test error');
  });

  it('converts non-Error values to string', () => {
    expect(errorMsg('string error')).toBe('string error');
    expect(errorMsg(42)).toBe('42');
    expect(errorMsg(null)).toBe('null');
    expect(errorMsg(undefined)).toBe('undefined');
  });

  it('handles Error subclasses', () => {
    expect(errorMsg(new TypeError('type error'))).toBe('type error');
  });
});
