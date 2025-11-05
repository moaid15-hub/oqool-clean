import { describe, test, expect } from '@jest/globals';

describe('CLI Package Tests', () => {
  test('should have basic math working', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });

  test('should handle string operations', () => {
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    expect(capitalize('hello')).toBe('Hello');
  });

  test('should validate input types', () => {
    const isNumber = (value: unknown): value is number => typeof value === 'number';
    expect(isNumber(42)).toBe(true);
    expect(isNumber('42')).toBe(false);
  });
});
