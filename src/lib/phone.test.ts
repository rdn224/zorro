import { describe, expect, it } from 'vitest';
import { formatPhone, isValidPhone, normalizePhone } from './phone';

describe('phone', () => {
  it('normalizes pasted numbers', () => {
    expect(normalizePhone('9911 2233')).toBe('99112233');
    expect(normalizePhone('+976 9911-2233')).toBe('99112233');
    expect(normalizePhone('0097699112233')).toBe('99112233');
    expect(normalizePhone('(976) 99112233')).toBe('99112233');
    // An 8-digit number that merely starts with 976 is left alone.
    expect(normalizePhone('97612345')).toBe('97612345');
    expect(normalizePhone('')).toBe('');
  });

  it('validates length', () => {
    expect(isValidPhone('99112233')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });

  it('formats for display', () => {
    expect(formatPhone('99112233')).toBe('9911 2233');
    expect(formatPhone('345678')).toBe('345678');
  });
});
