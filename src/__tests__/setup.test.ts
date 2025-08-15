describe('Basic Test Setup', () => {
  test('Jest is working correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('Can import TypeScript modules', () => {
    const testValue: string = 'Hello World';
    expect(testValue).toBe('Hello World');
    expect(typeof testValue).toBe('string');
  });

  test('Mock functions work', () => {
    const mockFn = jest.fn();
    mockFn('test');

    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  test('Async operations work', async () => {
    const asyncValue = await Promise.resolve('async result');
    expect(asyncValue).toBe('async result');
  });
});
