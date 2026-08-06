import { darkTheme, lightTheme } from '@atlas/design-tokens';

export type ThemeMode = 'dark' | 'light';
export function resolveTheme(mode: ThemeMode) {
  return mode === 'dark' ? darkTheme : lightTheme;
}
