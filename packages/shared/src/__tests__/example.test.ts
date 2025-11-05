import { describe, test, expect } from '@jest/globals';

describe('Example Test Suite', () => {
  test('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle strings', () => {
    const greeting = 'Hello, Oqool!';
    expect(greeting).toContain('Oqool');
  });

  test('should handle arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });

  test('should handle objects', () => {
    const user = {
      name: 'Test User',
      role: 'developer',
    };
    expect(user).toHaveProperty('name');
    expect(user.role).toBe('developer');
  });
});

describe('Async Operations', () => {
  test('should handle promises', async () => {
    const promise = Promise.resolve('Success');
    await expect(promise).resolves.toBe('Success');
  });

  test('should handle async functions', async () => {
    const asyncFunction = async () => {
      return 'Async Result';
    };
    const result = await asyncFunction();
    expect(result).toBe('Async Result');
  });
});
