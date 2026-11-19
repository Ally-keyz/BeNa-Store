import { describe, expect, it } from 'vitest';
import { isThemeMode, resolveTheme } from './theme';

describe('theme preference', () => {
  it('follows the operating system when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('honours explicit light and dark choices', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('accepts only known stored values', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('system')).toBe(true);
    expect(isThemeMode('auto')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
});
